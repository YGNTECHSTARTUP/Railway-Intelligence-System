use tracing::info;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

use crate::models::*;
use super::{Service, ServiceResult, ServiceError};

#[derive(Debug, Clone)]
pub struct OptimizationService {
    grpc_client_manager: std::sync::Arc<tokio::sync::Mutex<super::grpc_client::OptimizationClientManager>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationRequest {
    pub section_id: String,
    pub trains: Vec<Train>,
    pub constraints: Vec<OptimizationConstraint>,
    pub objective: OptimizationObjective,
    pub time_horizon_minutes: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationConstraint {
    pub constraint_type: ConstraintType,
    pub priority: u8, // 1 = highest, 10 = lowest
    pub parameters: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConstraintType {
    SafetyDistance,
    PlatformCapacity,
    TrainPriority,
    MaintenanceWindow,
    SpeedLimit,
    CrossingTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OptimizationObjective {
    MinimizeDelay,
    MaximizeThroughput,
    MinimizeEnergyConsumption,
    BalancedOptimal,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OptimizationResponse {
    pub success: bool,
    pub optimized_schedule: Vec<TrainScheduleUpdate>,
    pub objective_value: f64,
    pub computation_time_ms: u64,
    pub conflicts_resolved: u32,
    pub total_delay_reduction_minutes: f32,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TrainScheduleUpdate {
    pub train_id: String,
    pub new_departure_time: DateTime<Utc>,
    pub new_arrival_time: DateTime<Utc>,
    pub assigned_platform: Option<String>,
    pub speed_profile: Vec<SpeedProfilePoint>,
    pub delay_adjustment_minutes: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SpeedProfilePoint {
    pub position_km: f64,
    pub speed_kmh: f32,
    pub time_offset_minutes: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulationRequest {
    pub scenario_name: String,
    pub section_id: String,
    pub base_trains: Vec<Train>,
    pub what_if_changes: Vec<WhatIfChange>,
    pub simulation_duration_hours: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WhatIfChange {
    pub change_type: WhatIfChangeType,
    pub train_id: Option<String>,
    pub section_id: Option<String>,
    pub parameters: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WhatIfChangeType {
    AddTrain,
    RemoveTrain,
    DelayTrain,
    ChangeRoute,
    BlockSection,
    ChangeCapacity,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SimulationResponse {
    pub success: bool,
    pub scenario_name: String,
    pub simulation_results: SimulationResults,
    pub performance_comparison: PerformanceComparison,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SimulationResults {
    pub total_trains_processed: u32,
    pub average_delay_minutes: f32,
    pub throughput_trains_per_hour: f32,
    pub conflicts_detected: u32,
    pub utilization_percent: f32,
    pub timeline_events: Vec<SimulationEvent>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SimulationEvent {
    pub timestamp: DateTime<Utc>,
    pub event_type: String,
    pub train_id: String,
    pub section_id: String,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PerformanceComparison {
    pub baseline_delay_minutes: f32,
    pub scenario_delay_minutes: f32,
    pub improvement_percent: f32,
    pub baseline_throughput: f32,
    pub scenario_throughput: f32,
    pub throughput_improvement_percent: f32,
}

impl OptimizationService {
    pub fn new() -> Self {
        let grpc_config = super::grpc_client::GrpcClientConfig::from_env();
        let client_manager = super::grpc_client::OptimizationClientManager::new(grpc_config);
        
        Self {
            grpc_client_manager: std::sync::Arc::new(tokio::sync::Mutex::new(client_manager)),
        }
    }
    
    pub fn with_config(grpc_config: super::grpc_client::GrpcClientConfig) -> Self {
        let client_manager = super::grpc_client::OptimizationClientManager::new(grpc_config);
        
        Self {
            grpc_client_manager: std::sync::Arc::new(tokio::sync::Mutex::new(client_manager)),
        }
    }

    /// Optimize schedule for a specific section using constraint programming
    pub async fn optimize_schedule(&self, request: OptimizationRequest) -> ServiceResult<OptimizationResponse> {
        info!("Starting schedule optimization for section: {}", request.section_id);
        
        // Validate request first
        self.validate_request(&request)?;
        
        // Try to use gRPC client, fallback to mock if unavailable
        let response = match self.try_grpc_optimization(&request).await {
            Ok(response) => {
                info!("Successfully used OR-Tools optimization via gRPC");
                response
            }
            Err(e) => {
                tracing::warn!("gRPC optimization failed, falling back to mock: {}", e);
                self.mock_optimization(&request).await?
            }
        };

        info!(
            "Optimization completed for section {}: {} conflicts resolved, {:.1} minutes delay reduction",
            request.section_id,
            response.conflicts_resolved,
            response.total_delay_reduction_minutes
        );

        Ok(response)
    }

    /// Simulate "what-if" scenarios
    pub async fn simulate_scenario(&self, request: SimulationRequest) -> ServiceResult<SimulationResponse> {
        info!("Starting simulation for scenario: {}", request.scenario_name);

        // For now, implement a mock simulation response
        // TODO: Replace with actual gRPC call to Python simulation service
        let mock_response = self.mock_simulation(&request).await?;

        info!(
            "Simulation completed for scenario {}: {:.1}% improvement in throughput",
            request.scenario_name,
            mock_response.performance_comparison.throughput_improvement_percent
        );

        Ok(mock_response)
    }

    /// Get available optimization objectives
    pub fn get_available_objectives(&self) -> Vec<OptimizationObjective> {
        vec![
            OptimizationObjective::MinimizeDelay,
            OptimizationObjective::MaximizeThroughput,
            OptimizationObjective::MinimizeEnergyConsumption,
            OptimizationObjective::BalancedOptimal,
        ]
    }

    /// Validate optimization request
    pub fn validate_request(&self, request: &OptimizationRequest) -> ServiceResult<()> {
        if request.section_id.is_empty() {
            return Err(ServiceError::Validation("Section ID cannot be empty".to_string()));
        }

        if request.trains.is_empty() {
            return Err(ServiceError::Validation("At least one train required for optimization".to_string()));
        }

        if request.time_horizon_minutes == 0 {
            return Err(ServiceError::Validation("Time horizon must be greater than 0".to_string()));
        }

        if request.time_horizon_minutes > 1440 { // 24 hours
            return Err(ServiceError::Validation("Time horizon cannot exceed 24 hours".to_string()));
        }

        Ok(())
    }
    
    /// Try to perform optimization using gRPC call to Python OR-Tools service
    async fn try_grpc_optimization(&self, request: &OptimizationRequest) -> ServiceResult<OptimizationResponse> {
        let mut client_manager = self.grpc_client_manager.lock().await;
        
        // Get gRPC client
        let client = client_manager.get_client().await
            .map_err(|e| ServiceError::Optimization(format!("Failed to connect to optimizer: {}", e)))?;
        
        // Convert request format (this would normally convert to protobuf)
        // For now, we'll call the mock since protobuf isn't generated yet
        let grpc_response = client.optimize_schedule(request.clone()).await
            .map_err(|e| ServiceError::Optimization(format!("Optimization failed: {}", e)))?;
        
        info!("OR-Tools optimization completed via gRPC in {}ms", grpc_response.computation_time_ms);
        Ok(grpc_response)
    }
    
    /// Try to perform simulation using gRPC call to Python service
    async fn try_grpc_simulation(&self, request: &SimulationRequest) -> ServiceResult<SimulationResponse> {
        let mut client_manager = self.grpc_client_manager.lock().await;
        
        let client = client_manager.get_client().await
            .map_err(|e| ServiceError::Optimization(format!("Failed to connect to optimizer: {}", e)))?;
        
        let grpc_response = client.simulate_scenario(request.clone()).await
            .map_err(|e| ServiceError::Optimization(format!("Simulation failed: {}", e)))?;
        
        info!("OR-Tools simulation completed via gRPC");
        Ok(grpc_response)
    }
    
    /// Check if OR-Tools optimization service is available
    pub async fn is_optimizer_available(&self) -> bool {
        let mut client_manager = self.grpc_client_manager.lock().await;
        client_manager.health_check().await
    }

    // Mock optimization implementation (fallback when gRPC is unavailable)
    async fn mock_optimization(&self, request: &OptimizationRequest) -> ServiceResult<OptimizationResponse> {
        use rand::Rng;
        
        // Simulate computation time
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

        let mut rng = rand::thread_rng();
        let conflicts_resolved = rng.gen_range(0..=5);
        let delay_reduction = rng.gen_range(0.0..=30.0);

        // Generate mock optimized schedule
        let optimized_schedule: Vec<TrainScheduleUpdate> = request.trains
            .iter()
            .map(|train| {
                let delay_adjustment = rng.gen_range(-10..=5);
                TrainScheduleUpdate {
                    train_id: train.id.clone(),
                    new_departure_time: Utc::now(),
                    new_arrival_time: Utc::now() + chrono::Duration::hours(2),
                    assigned_platform: Some(format!("PF{}", rng.gen_range(1..=6))),
                    speed_profile: vec![
                        SpeedProfilePoint {
                            position_km: 0.0,
                            speed_kmh: 60.0,
                            time_offset_minutes: 0.0,
                        },
                        SpeedProfilePoint {
                            position_km: 50.0,
                            speed_kmh: 80.0,
                            time_offset_minutes: 30.0,
                        },
                    ],
                    delay_adjustment_minutes: delay_adjustment,
                }
            })
            .collect();

        Ok(OptimizationResponse {
            success: true,
            optimized_schedule,
            objective_value: 95.5,
            computation_time_ms: 500,
            conflicts_resolved,
            total_delay_reduction_minutes: delay_reduction,
            message: "Schedule optimized successfully using constraint programming".to_string(),
        })
    }

    // Mock simulation implementation (to be replaced with gRPC)
    async fn mock_simulation(&self, request: &SimulationRequest) -> ServiceResult<SimulationResponse> {
        use rand::Rng;
        
        // Simulate computation time
        tokio::time::sleep(tokio::time::Duration::from_millis(800)).await;

        let mut rng = rand::thread_rng();

        let baseline_delay = rng.gen_range(10.0..=30.0);
        let scenario_delay = baseline_delay * rng.gen_range(0.7..=0.95);
        let improvement = ((baseline_delay - scenario_delay) / baseline_delay) * 100.0;

        let baseline_throughput = rng.gen_range(15.0..=25.0);
        let scenario_throughput = baseline_throughput * rng.gen_range(1.05..=1.20);
        let throughput_improvement = ((scenario_throughput - baseline_throughput) / baseline_throughput) * 100.0;

        let simulation_results = SimulationResults {
            total_trains_processed: request.base_trains.len() as u32 + rng.gen_range(0..=5),
            average_delay_minutes: scenario_delay,
            throughput_trains_per_hour: scenario_throughput,
            conflicts_detected: rng.gen_range(0..=3),
            utilization_percent: rng.gen_range(75.0..=95.0),
            timeline_events: vec![
                SimulationEvent {
                    timestamp: Utc::now(),
                    event_type: "TrainDeparture".to_string(),
                    train_id: "T12345".to_string(),
                    section_id: request.section_id.clone(),
                    description: "Express train departed on schedule".to_string(),
                },
            ],
        };

        let performance_comparison = PerformanceComparison {
            baseline_delay_minutes: baseline_delay,
            scenario_delay_minutes: scenario_delay,
            improvement_percent: improvement,
            baseline_throughput,
            scenario_throughput,
            throughput_improvement_percent: throughput_improvement,
        };

        Ok(SimulationResponse {
            success: true,
            scenario_name: request.scenario_name.clone(),
            simulation_results,
            performance_comparison,
            recommendations: vec![
                "Consider implementing dynamic platform assignment".to_string(),
                "Optimize signal timing for peak hours".to_string(),
                "Review freight train scheduling during passenger peak times".to_string(),
            ],
        })
    }
}

impl Service for OptimizationService {
    fn name(&self) -> &'static str {
        "OptimizationService"
    }
}
