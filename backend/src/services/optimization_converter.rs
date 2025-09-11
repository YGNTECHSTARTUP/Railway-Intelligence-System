use chrono::{DateTime, Utc};
use std::collections::HashMap;

use crate::generated::railway_optimization as proto;
// Use explicit imports to avoid conflicts
use crate::services::optimization_service::{
    OptimizationRequest as ServiceOptimizationRequest,
    OptimizationResponse as ServiceOptimizationResponse,
    SimulationRequest as ServiceSimulationRequest,
    SimulationResponse as ServiceSimulationResponse,
    OptimizationConstraint, ConstraintType, OptimizationObjective as ServiceOptimizationObjective,
    TrainScheduleUpdate, SpeedProfilePoint, WhatIfChange, WhatIfChangeType,
    SimulationResults, PerformanceComparison, SimulationEvent
};
use crate::models::{
    train::Train, TrainPriority,
    optimization::{OptimizationObjective as ModelOptimizationObjective}
};

/// Conversion utilities between service models and protobuf messages
pub struct OptimizationConverter;

impl OptimizationConverter {
    /// Convert HTTP optimization request to protobuf
    pub fn to_proto_optimization_request(
        request: ServiceOptimizationRequest,
    ) -> Result<proto::OptimizationRequest, String> {
        let request_id = uuid::Uuid::new_v4().to_string();
        let requested_at = Some(prost_types::Timestamp::from(
            std::time::SystemTime::now()
        ));

        // Convert trains
        let proto_trains: Vec<proto::Train> = request.trains
            .into_iter()
            .map(Self::to_proto_train)
            .collect::<Result<Vec<_>, _>>()?;

        // Convert constraints
        let proto_constraints: Vec<proto::Constraint> = request.constraints
            .into_iter()
            .map(Self::to_proto_constraint)
            .collect::<Result<Vec<_>, _>>()?;

        // Convert objective
        let proto_objective = Some(Self::to_proto_objective(request.objective)?);

        // Build protobuf request
        Ok(proto::OptimizationRequest {
            request_id,
            section_id: request.section_id,
            time_horizon_minutes: request.time_horizon_minutes,
            trains: proto_trains,
            constraints: proto_constraints,
            objective: proto_objective,
            disruptions: vec![], // TODO: Convert disruptions if needed
            requested_at,
            config: Some(Self::default_optimization_config()),
        })
    }

    /// Convert protobuf optimization response to HTTP response
    pub fn from_proto_optimization_response(
        response: proto::OptimizationResponse,
    ) -> Result<ServiceOptimizationResponse, String> {
        // Convert performance metrics
        let kpis = response.kpis.ok_or("Missing performance metrics")?;

        // Convert optimized schedule
        let optimized_schedule: Vec<TrainScheduleUpdate> = response.optimized_schedule
            .into_iter()
            .map(Self::from_proto_schedule_entry)
            .collect::<Result<Vec<_>, _>>()?;

        Ok(ServiceOptimizationResponse {
            success: response.status == proto::OptimizationStatus::Optimal as i32 ||
                     response.status == proto::OptimizationStatus::Feasible as i32,
            optimized_schedule,
            objective_value: kpis.total_delay_minutes as f64, // Use appropriate metric
            computation_time_ms: response.execution_time_ms,
            conflicts_resolved: kpis.conflicts_resolved,
            total_delay_reduction_minutes: kpis.total_delay_minutes,
            message: if response.error_message.is_empty() {
                response.reasoning
            } else {
                response.error_message
            },
        })
    }

    /// Convert HTTP simulation request to protobuf
    pub fn to_proto_simulation_request(
        request: ServiceSimulationRequest,
    ) -> Result<proto::SimulationRequest, String> {
        let request_id = uuid::Uuid::new_v4().to_string();

        // Convert base schedule (trains to schedule entries)
        let base_schedule: Vec<proto::TrainScheduleEntry> = request.base_trains
            .into_iter()
            .map(Self::train_to_schedule_entry)
            .collect::<Result<Vec<_>, _>>()?;

        // Convert what-if changes to modifications
        let modifications: Vec<proto::ScheduleModification> = request.what_if_changes
            .into_iter()
            .map(Self::to_proto_modification)
            .collect::<Result<Vec<_>, _>>()?;

        Ok(proto::SimulationRequest {
            request_id,
            scenario_name: request.scenario_name,
            section_id: request.section_id,
            base_schedule,
            modifications,
            what_if_conditions: vec![], // TODO: Convert what-if conditions
            simulation_duration_hours: request.simulation_duration_hours,
        })
    }

    /// Convert protobuf simulation response to HTTP response
    pub fn from_proto_simulation_response(
        response: proto::SimulationResponse,
    ) -> Result<ServiceSimulationResponse, String> {
        let simulation_results = response.simulation_results
            .ok_or("Missing simulation results")?;
        
        let performance_comparison = response.performance_comparison
            .ok_or("Missing performance comparison")?;

        Ok(ServiceSimulationResponse {
            success: response.success,
            scenario_name: response.scenario_name,
            simulation_results: SimulationResults {
                total_trains_processed: simulation_results.total_trains_processed,
                average_delay_minutes: simulation_results.average_delay_minutes,
                throughput_trains_per_hour: simulation_results.throughput_trains_per_hour,
                conflicts_detected: simulation_results.conflicts_detected,
                utilization_percent: simulation_results.utilization_percent,
                timeline_events: simulation_results.timeline_events
                    .into_iter()
                    .map(Self::from_proto_simulation_event)
                    .collect::<Result<Vec<_>, _>>()?,
            },
            performance_comparison: PerformanceComparison {
                baseline_delay_minutes: performance_comparison.baseline_delay_minutes,
                scenario_delay_minutes: performance_comparison.scenario_delay_minutes,
                improvement_percent: performance_comparison.improvement_percent,
                baseline_throughput: performance_comparison.baseline_throughput,
                scenario_throughput: performance_comparison.scenario_throughput,
                throughput_improvement_percent: performance_comparison.throughput_improvement_percent,
            },
            recommendations: response.recommendations,
        })
    }

    // Helper conversion methods
    
    fn to_proto_train(train: Train) -> Result<proto::Train, String> {
        // Map train type to string for conversion
        let train_type_str = match train.priority {
            TrainPriority::Express => "express",
            TrainPriority::Mail => "mail",
            TrainPriority::Freight => "freight",
            _ => "passenger",
        };
        
        Ok(proto::Train {
            id: train.id,
            train_number: train.train_number,
            train_type: Self::to_proto_train_type(train_type_str)? as i32,
            priority: Self::to_proto_train_priority_enum(train.priority)? as i32,
            capacity_passengers: train.consist.passenger_coaches * 72, // Estimate 72 passengers per coach
            length_meters: train.consist.total_length_meters,
            max_speed_kmh: train.consist.max_speed_kmh,
            scheduled_departure: Some(prost_types::Timestamp {
                seconds: train.eta_next_station.timestamp(),
                nanos: train.eta_next_station.timestamp_subsec_nanos() as i32,
            }),
            scheduled_arrival: Some(prost_types::Timestamp {
                seconds: (train.eta_next_station + chrono::Duration::hours(2)).timestamp(),
                nanos: (train.eta_next_station + chrono::Duration::hours(2)).timestamp_subsec_nanos() as i32,
            }),
            origin_station: train.route.first().cloned().unwrap_or_default(),
            destination_station: train.route.last().cloned().unwrap_or_default(),
            route_sections: train.route.clone(),
            characteristics: Some(proto::TrainCharacteristics {
                acceleration_ms2: 1.0,
                deceleration_ms2: 1.0,
                power_kw: 1000.0,
                weight_tons: 400.0,
                passenger_load_percent: 80,
                is_electric: true,
                required_platforms: vec![],
            }),
        })
    }

    fn to_proto_constraint(constraint: OptimizationConstraint) -> Result<proto::Constraint, String> {
        let mut parameters = HashMap::new();
        
        // Convert serde_json::Value to string parameters
        if let serde_json::Value::Object(map) = constraint.parameters {
            for (key, value) in map {
                parameters.insert(key, value.to_string());
            }
        }

        Ok(proto::Constraint {
            id: uuid::Uuid::new_v4().to_string(),
            r#type: Self::to_proto_constraint_type(constraint.constraint_type)? as i32,
            priority: constraint.priority as u32,
            parameters,
            is_hard_constraint: constraint.priority <= 3, // Consider high priority as hard constraint
        })
    }

    fn to_proto_objective(objective: ServiceOptimizationObjective) -> Result<proto::OptimizationObjective, String> {
        Ok(proto::OptimizationObjective {
            primary_objective: Self::to_proto_objective_type(objective)? as i32,
            secondary_objectives: vec![], // TODO: Support weighted objectives
            time_limit_seconds: 60.0, // Default time limit
            enable_preprocessing: true,
        })
    }

    fn from_proto_schedule_entry(entry: proto::TrainScheduleEntry) -> Result<TrainScheduleUpdate, String> {
        Ok(TrainScheduleUpdate {
            train_id: entry.train_id,
            new_departure_time: entry.scheduled_departure
                .map(|ts| DateTime::<Utc>::from_timestamp(ts.seconds, ts.nanos as u32))
                .flatten()
                .unwrap_or_else(Utc::now),
            new_arrival_time: entry.scheduled_arrival
                .map(|ts| DateTime::<Utc>::from_timestamp(ts.seconds, ts.nanos as u32))
                .flatten()
                .unwrap_or_else(|| Utc::now() + chrono::Duration::hours(2)),
            assigned_platform: if entry.platform > 0 {
                Some(format!("PF{}", entry.platform))
            } else {
                None
            },
            speed_profile: entry.speed_profile
                .into_iter()
                .map(|sp| SpeedProfilePoint {
                    position_km: sp.position_km as f64,
                    speed_kmh: sp.speed_kmh,
                    time_offset_minutes: sp.time_offset_minutes,
                })
                .collect(),
            delay_adjustment_minutes: entry.delay_adjustment_minutes,
        })
    }

    fn train_to_schedule_entry(train: Train) -> Result<proto::TrainScheduleEntry, String> {
        Ok(proto::TrainScheduleEntry {
            train_id: train.id,
            train_number: train.train_number,
            scheduled_departure: Some(prost_types::Timestamp {
                seconds: train.eta_next_station.timestamp(),
                nanos: train.eta_next_station.timestamp_subsec_nanos() as i32,
            }),
            scheduled_arrival: Some(prost_types::Timestamp {
                seconds: (train.eta_next_station + chrono::Duration::hours(2)).timestamp(),
                nanos: (train.eta_next_station + chrono::Duration::hours(2)).timestamp_subsec_nanos() as i32,
            }),
            platform: 1, // Default platform
            priority_applied: Self::to_proto_train_priority_enum(train.priority)? as i32,
            delay_adjustment_minutes: train.delay_minutes,
            conflicts_resolved: vec![],
            speed_profile: vec![],
        })
    }

    fn to_proto_modification(change: WhatIfChange) -> Result<proto::ScheduleModification, String> {
        let mut parameters = HashMap::new();
        
        // Convert serde_json::Value to string parameters
        if let serde_json::Value::Object(map) = change.parameters {
            for (key, value) in map {
                parameters.insert(key, value.to_string());
            }
        }

        Ok(proto::ScheduleModification {
            r#type: Self::to_proto_modification_type(change.change_type)? as i32,
            train_id: change.train_id.unwrap_or_default(),
            parameters,
        })
    }

    fn from_proto_simulation_event(event: proto::SimulationEvent) -> Result<SimulationEvent, String> {
        Ok(SimulationEvent {
            timestamp: event.timestamp
                .map(|ts| DateTime::<Utc>::from_timestamp(ts.seconds, ts.nanos as u32))
                .flatten()
                .unwrap_or_else(Utc::now),
            event_type: event.event_type,
            train_id: event.train_id,
            section_id: event.section_id,
            description: event.description,
        })
    }

    // Type conversion helpers
    
    fn to_proto_train_type(train_type: &str) -> Result<proto::TrainType, String> {
        match train_type.to_lowercase().as_str() {
            "passenger" => Ok(proto::TrainType::Passenger),
            "express" => Ok(proto::TrainType::Express),
            "freight" => Ok(proto::TrainType::Freight),
            "mail" => Ok(proto::TrainType::Mail),
            "maintenance" => Ok(proto::TrainType::Maintenance),
            "empty" => Ok(proto::TrainType::Empty),
            _ => Ok(proto::TrainType::Passenger), // Default
        }
    }

    fn to_proto_train_priority(priority: &str) -> Result<proto::TrainPriority, String> {
        match priority.to_lowercase().as_str() {
            "emergency" => Ok(proto::TrainPriority::PriorityEmergency),
            "express" => Ok(proto::TrainPriority::PriorityExpress),
            "mail" => Ok(proto::TrainPriority::PriorityMail),
            "passenger" => Ok(proto::TrainPriority::PriorityPassenger),
            "freight" => Ok(proto::TrainPriority::PriorityFreight),
            "maintenance" => Ok(proto::TrainPriority::PriorityMaintenance),
            _ => Ok(proto::TrainPriority::PriorityPassenger), // Default
        }
    }
    
    fn to_proto_train_priority_enum(priority: TrainPriority) -> Result<proto::TrainPriority, String> {
        match priority {
            TrainPriority::Emergency => Ok(proto::TrainPriority::PriorityEmergency),
            TrainPriority::Express => Ok(proto::TrainPriority::PriorityExpress),
            TrainPriority::Mail => Ok(proto::TrainPriority::PriorityMail),
            TrainPriority::Passenger => Ok(proto::TrainPriority::PriorityPassenger),
            TrainPriority::Freight => Ok(proto::TrainPriority::PriorityFreight),
            TrainPriority::Maintenance => Ok(proto::TrainPriority::PriorityMaintenance),
        }
    }

    fn to_proto_constraint_type(constraint_type: ConstraintType) -> Result<proto::ConstraintType, String> {
        Ok(match constraint_type {
            ConstraintType::SafetyDistance => proto::ConstraintType::SafetyDistance,
            ConstraintType::PlatformCapacity => proto::ConstraintType::PlatformCapacity,
            ConstraintType::TrainPriority => proto::ConstraintType::TrainPriority,
            ConstraintType::MaintenanceWindow => proto::ConstraintType::MaintenanceWindow,
            ConstraintType::SpeedLimit => proto::ConstraintType::SpeedLimit,
            ConstraintType::CrossingTime => proto::ConstraintType::CrossingTime,
        })
    }

    fn to_proto_objective_type(objective: ServiceOptimizationObjective) -> Result<proto::ObjectiveType, String> {
        Ok(match objective {
            ServiceOptimizationObjective::MinimizeDelay => proto::ObjectiveType::MinimizeDelay,
            ServiceOptimizationObjective::MaximizeThroughput => proto::ObjectiveType::MaximizeThroughput,
            ServiceOptimizationObjective::MinimizeEnergyConsumption => proto::ObjectiveType::MinimizeEnergyConsumption,
            ServiceOptimizationObjective::BalancedOptimal => proto::ObjectiveType::BalancedOptimal,
        })
    }

    fn to_proto_modification_type(change_type: WhatIfChangeType) -> Result<proto::ModificationType, String> {
        Ok(match change_type {
            WhatIfChangeType::AddTrain => proto::ModificationType::AddTrain,
            WhatIfChangeType::RemoveTrain => proto::ModificationType::CancelTrain,
            WhatIfChangeType::DelayTrain => proto::ModificationType::DelayTrain,
            WhatIfChangeType::ChangeRoute => proto::ModificationType::ChangeRoute,
            WhatIfChangeType::BlockSection => proto::ModificationType::DelayTrain, // Map to delay
            WhatIfChangeType::ChangeCapacity => proto::ModificationType::ChangePriority, // Map to priority change
        })
    }

    fn default_optimization_config() -> proto::OptimizationConfig {
        proto::OptimizationConfig {
            max_solver_time_seconds: 30,
            enable_preprocessing: true,
            num_search_workers: 4,
            strategy: proto::SolverStrategy::Automatic as i32,
            enable_detailed_logging: false,
        }
    }
}
