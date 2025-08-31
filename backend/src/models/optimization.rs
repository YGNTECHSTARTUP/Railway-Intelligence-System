use super::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationRequest {
    pub request_id: String,
    pub section_id: String,
    pub time_horizon_minutes: u32,
    pub trains: Vec<Train>,
    pub constraints: Vec<Constraint>,
    pub objective: OptimizationObjective,
    pub disruptions: Vec<DisruptionEvent>,
    pub requested_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationResponse {
    pub request_id: String,
    pub status: OptimizationStatus,
    pub optimized_schedule: Vec<TrainScheduleEntry>,
    pub kpis: PerformanceMetrics,
    pub reasoning: String,
    pub confidence_score: f32,
    pub alternatives: Vec<AlternativeSchedule>,
    pub execution_time_ms: u64,
    pub completed_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OptimizationStatus {
    Optimal,
    Feasible,
    Infeasible,
    Unknown,
    TimeLimitExceeded,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrainScheduleEntry {
    pub train_id: String,
    pub train_number: u32,
    pub scheduled_departure: DateTime<Utc>,
    pub scheduled_arrival: DateTime<Utc>,
    pub platform: Option<u8>,
    pub priority_applied: TrainPriority,
    pub delay_adjustment: i32,
    pub conflicts_resolved: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlternativeSchedule {
    pub name: String,
    pub description: String,
    pub schedule: Vec<TrainScheduleEntry>,
    pub kpis: PerformanceMetrics,
    pub trade_offs: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Constraint {
    PrecedenceRule {
        higher_priority: TrainPriority,
        lower_priority: TrainPriority,
    },
    BlockOccupancy {
        block_id: String,
        max_trains: u32,
    },
    PlatformCapacity {
        station: String,
        capacity: u32,
    },
    SignalSpacing {
        minimum_headway_seconds: u32,
    },
    CrossingWindow {
        location: String,
        time_window_minutes: u32,
    },
    SafetyConstraint {
        rule: String,
        description: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OptimizationObjective {
    MinimizeDelay,
    MaximizeThroughput,
    BalanceDelayThroughput { delay_weight: f32, throughput_weight: f32 },
    MinimizeFuelConsumption,
    MaximizeUtilization,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationRequest {
    pub scenario_name: String,
    pub section_id: String,
    pub base_schedule: Vec<TrainScheduleEntry>,
    pub modifications: Vec<ScheduleModification>,
    pub what_if_conditions: Vec<WhatIfCondition>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ScheduleModification {
    DelayTrain {
        train_id: String,
        delay_minutes: i32,
    },
    CancelTrain {
        train_id: String,
    },
    AddTrain {
        train: Train,
    },
    ChangeRoute {
        train_id: String,
        new_route: Vec<String>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WhatIfCondition {
    WeatherDisruption {
        weather_type: WeatherType,
        impact_level: u8, // 1-10 scale
    },
    SignalFailure {
        block_id: String,
        duration_minutes: u32,
    },
    TrackMaintenance {
        section_id: String,
        maintenance_block: MaintenanceBlock,
    },
}

impl OptimizationRequest {
    pub fn new(section_id: String, trains: Vec<Train>) -> Self {
        Self {
            request_id: Uuid::new_v4().to_string(),
            section_id,
            time_horizon_minutes: 120, // 2 hours default
            trains,
            constraints: Self::default_constraints(),
            objective: OptimizationObjective::BalanceDelayThroughput {
                delay_weight: 0.7,
                throughput_weight: 0.3,
            },
            disruptions: Vec::new(),
            requested_at: Utc::now(),
        }
    }

    fn default_constraints() -> Vec<Constraint> {
        vec![
            Constraint::PrecedenceRule {
                higher_priority: TrainPriority::Express,
                lower_priority: TrainPriority::Freight,
            },
            Constraint::PrecedenceRule {
                higher_priority: TrainPriority::Mail,
                lower_priority: TrainPriority::Passenger,
            },
            Constraint::SignalSpacing {
                minimum_headway_seconds: 300, // 5 minutes
            },
            Constraint::SafetyConstraint {
                rule: "single_block_occupancy".to_string(),
                description: "Only one train per block section".to_string(),
            },
        ]
    }
}
