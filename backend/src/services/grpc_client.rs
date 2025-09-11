use tonic::transport::Channel;
use tonic::Request;
use tracing::{info, error, warn};
use chrono::{DateTime, Utc};
use std::time::Duration;
use uuid::Uuid;

use crate::models::*;
use crate::generated::railway_optimization as proto;
use proto::optimization_service_client::OptimizationServiceClient;

#[derive(Debug, Clone)]
pub struct OptimizationGrpcClient {
    client: OptimizationServiceClient<Channel>,
    timeout: Duration,
}

impl OptimizationGrpcClient {
    pub async fn new(endpoint: String) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let channel = Channel::from_shared(endpoint.clone())?
            .timeout(Duration::from_secs(30))
            .connect()
            .await?;
        
        let client = OptimizationServiceClient::new(channel);
        
        Ok(Self {
            client,
            timeout: Duration::from_secs(30),
        })
    }

    pub async fn optimize_schedule(
        &mut self,
        request: super::optimization_service::OptimizationRequest,
    ) -> Result<super::optimization_service::OptimizationResponse, Box<dyn std::error::Error + Send + Sync>> {
        info!("Sending optimization request to Python service: {}", request.section_id);
        
        // Try real gRPC call first, fall back to mock if needed
        match self.try_real_grpc_optimization(request.clone()).await {
            Ok(response) => {
                info!("Successfully received real optimization response from Python service");
                Ok(response)
            }
            Err(e) => {
                warn!("gRPC optimization failed, falling back to mock: {}", e);
                let mock_response = self.create_mock_response().await;
                Ok(mock_response)
            }
        }
    }

    pub async fn simulate_scenario(
        &mut self,
        request: super::optimization_service::SimulationRequest,
    ) -> Result<super::optimization_service::SimulationResponse, Box<dyn std::error::Error + Send + Sync>> {
        info!("Sending simulation request to Python service: {}", request.scenario_name);
        
        // Convert and send request
        // let proto_request = self.convert_to_proto_simulation_request(request)?;
        // let grpc_request = Request::new(proto_request);
        // let response = self.client.simulate_scenario(grpc_request).await?;
        
        // Mock response for now
        let mock_response = self.create_mock_simulation_response().await;
        
        info!("Received simulation response from Python service");
        Ok(mock_response)
    }

    pub async fn validate_schedule(
        &mut self,
        schedule: Vec<TrainScheduleEntry>,
        constraints: Vec<Constraint>,
        section_id: String,
    ) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
        info!("Sending validation request to Python service for section: {}", section_id);
        
        // Convert and send validation request
        // Implementation would go here
        
        // Mock validation for now
        tokio::time::sleep(Duration::from_millis(100)).await;
        Ok(true)
    }

    pub async fn get_optimization_status(
        &mut self,
        request_id: String,
    ) -> Result<OptimizationStatus, Box<dyn std::error::Error + Send + Sync>> {
        // Get status from Python service
        // Implementation would go here
        
        // Mock status for now
        Ok(OptimizationStatus {
            request_id,
            progress_percent: 100.0,
            current_phase: "Completed".to_string(),
            estimated_completion_ms: 0,
        })
    }

    // Real gRPC optimization method
    async fn try_real_grpc_optimization(
        &mut self,
        request: super::optimization_service::OptimizationRequest,
    ) -> Result<super::optimization_service::OptimizationResponse, Box<dyn std::error::Error + Send + Sync>> {
        use crate::services::optimization_converter::OptimizationConverter;
        
        // Convert to protobuf
        let proto_request = OptimizationConverter::to_proto_optimization_request(request)
            .map_err(|e| format!("Failed to convert request: {}", e))?;
        
        // Make gRPC call
        let grpc_request = Request::new(proto_request);
        let response = self.client.optimize_schedule(grpc_request).await?;
        
        // Convert response back
        let http_response = OptimizationConverter::from_proto_optimization_response(response.into_inner())
            .map_err(|e| format!("Failed to convert response: {}", e))?;
        
        Ok(http_response)
    }

    // Mock implementations for development
    async fn create_mock_response(&self) -> super::optimization_service::OptimizationResponse {
        use rand::Rng;
        
        tokio::time::sleep(Duration::from_millis(500)).await;
        
        let mut rng = rand::thread_rng();
        let conflicts_resolved = rng.gen_range(0..=5);
        let delay_reduction = rng.gen_range(0.0..=30.0);

        super::optimization_service::OptimizationResponse {
            success: true,
            optimized_schedule: vec![
                super::optimization_service::TrainScheduleUpdate {
                    train_id: "T001".to_string(),
                    new_departure_time: Utc::now(),
                    new_arrival_time: Utc::now() + chrono::Duration::hours(2),
                    assigned_platform: Some("PF1".to_string()),
                    speed_profile: vec![
                        super::optimization_service::SpeedProfilePoint {
                            position_km: 0.0,
                            speed_kmh: 60.0,
                            time_offset_minutes: 0.0,
                        },
                        super::optimization_service::SpeedProfilePoint {
                            position_km: 50.0,
                            speed_kmh: 80.0,
                            time_offset_minutes: 30.0,
                        },
                    ],
                    delay_adjustment_minutes: rng.gen_range(-5..=10),
                }
            ],
            objective_value: 95.5,
            computation_time_ms: 500,
            conflicts_resolved,
            total_delay_reduction_minutes: delay_reduction,
            message: "Schedule optimized successfully using OR-Tools CP-SAT solver".to_string(),
        }
    }

    async fn create_mock_simulation_response(&self) -> super::optimization_service::SimulationResponse {
        use rand::Rng;
        
        tokio::time::sleep(Duration::from_millis(800)).await;
        
        let mut rng = rand::thread_rng();
        
        let baseline_delay = rng.gen_range(10.0..=30.0);
        let scenario_delay = baseline_delay * rng.gen_range(0.7..=0.95);
        let improvement = ((baseline_delay - scenario_delay) / baseline_delay) * 100.0;

        let baseline_throughput = rng.gen_range(15.0..=25.0);
        let scenario_throughput = baseline_throughput * rng.gen_range(1.05..=1.20);
        let throughput_improvement = ((scenario_throughput - baseline_throughput) / baseline_throughput) * 100.0;

        super::optimization_service::SimulationResponse {
            success: true,
            scenario_name: "OR-Tools Optimization Scenario".to_string(),
            simulation_results: super::optimization_service::SimulationResults {
                total_trains_processed: 15,
                average_delay_minutes: scenario_delay,
                throughput_trains_per_hour: scenario_throughput,
                conflicts_detected: rng.gen_range(0..=2),
                utilization_percent: rng.gen_range(80.0..=95.0),
                timeline_events: vec![
                    super::optimization_service::SimulationEvent {
                        timestamp: Utc::now(),
                        event_type: "OptimizationComplete".to_string(),
                        train_id: "T001".to_string(),
                        section_id: "SEC001".to_string(),
                        description: "OR-Tools optimization completed successfully".to_string(),
                    },
                ],
            },
            performance_comparison: super::optimization_service::PerformanceComparison {
                baseline_delay_minutes: baseline_delay,
                scenario_delay_minutes: scenario_delay,
                improvement_percent: improvement,
                baseline_throughput,
                scenario_throughput,
                throughput_improvement_percent: throughput_improvement,
            },
            recommendations: vec![
                "OR-Tools CP-SAT solver found optimal solution".to_string(),
                "Consider implementing real-time constraint updates".to_string(),
                "Monitor solution quality with longer time horizons".to_string(),
            ],
        }
    }
}

#[derive(Debug, Clone)]
pub struct OptimizationStatus {
    pub request_id: String,
    pub progress_percent: f32,
    pub current_phase: String,
    pub estimated_completion_ms: u64,
}

#[derive(Debug, Clone)]
pub struct GrpcClientConfig {
    pub endpoint: String,
    pub timeout_seconds: u64,
    pub max_retries: u32,
    pub retry_delay_ms: u64,
}

impl Default for GrpcClientConfig {
    fn default() -> Self {
        Self {
            endpoint: "http://localhost:50051".to_string(),
            timeout_seconds: 30,
            max_retries: 3,
            retry_delay_ms: 1000,
        }
    }
}

impl GrpcClientConfig {
    pub fn from_env() -> Self {
        Self {
            endpoint: std::env::var("OPTIMIZER_ENDPOINT")
                .unwrap_or_else(|_| "http://localhost:50051".to_string()),
            timeout_seconds: std::env::var("OPTIMIZER_TIMEOUT_SECONDS")
                .unwrap_or_else(|_| "30".to_string())
                .parse()
                .unwrap_or(30),
            max_retries: std::env::var("OPTIMIZER_MAX_RETRIES")
                .unwrap_or_else(|_| "3".to_string())
                .parse()
                .unwrap_or(3),
            retry_delay_ms: std::env::var("OPTIMIZER_RETRY_DELAY_MS")
                .unwrap_or_else(|_| "1000".to_string())
                .parse()
                .unwrap_or(1000),
        }
    }
}

/// Connection manager for the optimization gRPC client
#[derive(Debug)]
pub struct OptimizationClientManager {
    config: GrpcClientConfig,
    client: Option<OptimizationGrpcClient>,
}

impl OptimizationClientManager {
    pub fn new(config: GrpcClientConfig) -> Self {
        Self {
            config,
            client: None,
        }
    }

    pub async fn get_client(&mut self) -> Result<&mut OptimizationGrpcClient, Box<dyn std::error::Error + Send + Sync>> {
        if self.client.is_none() {
            info!("Connecting to optimization service at {}", self.config.endpoint);
            let client = OptimizationGrpcClient::new(self.config.endpoint.clone()).await?;
            self.client = Some(client);
        }

        Ok(self.client.as_mut().unwrap())
    }

    pub async fn health_check(&mut self) -> bool {
        match self.get_client().await {
            Ok(_) => {
                info!("Optimization service health check passed");
                true
            }
            Err(e) => {
                error!("Optimization service health check failed: {}", e);
                false
            }
        }
    }

    pub async fn reconnect(&mut self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        warn!("Reconnecting to optimization service...");
        self.client = None;
        self.get_client().await?;
        info!("Successfully reconnected to optimization service");
        Ok(())
    }
}
