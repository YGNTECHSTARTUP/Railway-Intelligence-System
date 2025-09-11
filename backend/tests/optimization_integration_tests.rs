use tokio;
use chrono::{DateTime, Utc};
use uuid::Uuid;

use railway_backend::services::{
    OptimizationService, GrpcClientConfig,
    optimization_service::{
        OptimizationRequest, OptimizationObjective, ConstraintType, 
        OptimizationConstraint, SimulationRequest, WhatIfChange, WhatIfChangeType
    }
};
use railway_backend::models::{Train, TrainType, TrainPriority};

#[tokio::test]
async fn test_optimization_service_initialization() {
    let service = OptimizationService::new();
    
    // Should initialize without panicking
    assert_eq!(service.name(), "OptimizationService");
}

#[tokio::test]
async fn test_optimization_service_with_custom_config() {
    let grpc_config = GrpcClientConfig {
        endpoint: "http://localhost:50051".to_string(),
        timeout_seconds: 30,
        max_retries: 3,
        retry_delay_ms: 1000,
    };
    
    let service = OptimizationService::with_config(grpc_config);
    assert_eq!(service.name(), "OptimizationService");
}

#[tokio::test]
async fn test_optimization_request_validation() {
    let service = OptimizationService::new();
    
    // Test valid request
    let valid_request = create_sample_optimization_request();
    assert!(service.validate_request(&valid_request).is_ok());
    
    // Test invalid requests
    let mut invalid_request = valid_request.clone();
    invalid_request.section_id = "".to_string();
    assert!(service.validate_request(&invalid_request).is_err());
    
    invalid_request = valid_request.clone();
    invalid_request.trains = vec![];
    assert!(service.validate_request(&invalid_request).is_err());
    
    invalid_request = valid_request.clone();
    invalid_request.time_horizon_minutes = 0;
    assert!(service.validate_request(&invalid_request).is_err());
    
    invalid_request = valid_request.clone();
    invalid_request.time_horizon_minutes = 2000; // > 24 hours
    assert!(service.validate_request(&invalid_request).is_err());
}

#[tokio::test]
async fn test_optimization_schedule_basic() {
    let service = OptimizationService::new();
    let request = create_sample_optimization_request();
    
    let response = service.optimize_schedule(request).await;
    
    assert!(response.is_ok());
    let response = response.unwrap();
    
    assert!(response.success);
    assert!(!response.optimized_schedule.is_empty());
    assert!(response.computation_time_ms > 0);
    assert!(!response.message.is_empty());
}

#[tokio::test]
async fn test_simulation_scenario_basic() {
    let service = OptimizationService::new();
    let request = create_sample_simulation_request();
    
    let response = service.simulate_scenario(request).await;
    
    assert!(response.is_ok());
    let response = response.unwrap();
    
    assert!(response.success);
    assert!(!response.scenario_name.is_empty());
    assert!(response.simulation_results.total_trains_processed > 0);
    assert!(!response.recommendations.is_empty());
}

#[tokio::test]
async fn test_optimization_objectives() {
    let service = OptimizationService::new();
    let objectives = service.get_available_objectives();
    
    assert!(!objectives.is_empty());
    assert!(objectives.contains(&OptimizationObjective::MinimizeDelay));
    assert!(objectives.contains(&OptimizationObjective::MaximizeThroughput));
    assert!(objectives.contains(&OptimizationObjective::BalancedOptimal));
}

#[tokio::test]
async fn test_optimization_with_different_objectives() {
    let service = OptimizationService::new();
    
    let objectives_to_test = vec![
        OptimizationObjective::MinimizeDelay,
        OptimizationObjective::MaximizeThroughput,
        OptimizationObjective::MinimizeEnergyConsumption,
        OptimizationObjective::BalancedOptimal,
    ];
    
    for objective in objectives_to_test {
        let mut request = create_sample_optimization_request();
        request.objective = objective.clone();
        
        let response = service.optimize_schedule(request).await;
        assert!(response.is_ok(), "Failed for objective: {:?}", objective);
        
        let response = response.unwrap();
        assert!(response.success);
        
        // Different objectives might produce different results
        match objective {
            OptimizationObjective::MinimizeDelay => {
                // Should focus on reducing delays
                assert!(response.total_delay_reduction_minutes >= 0.0);
            }
            OptimizationObjective::MaximizeThroughput => {
                // Should focus on train throughput
                assert!(response.computation_time_ms > 0);
            }
            _ => {
                // Basic checks for other objectives
                assert!(response.computation_time_ms > 0);
            }
        }
    }
}

#[tokio::test]
async fn test_optimization_with_constraints() {
    let service = OptimizationService::new();
    
    let constraints = vec![
        OptimizationConstraint {
            constraint_type: ConstraintType::SafetyDistance,
            priority: 1,
            parameters: serde_json::json!({"min_distance_seconds": 300}),
        },
        OptimizationConstraint {
            constraint_type: ConstraintType::PlatformCapacity,
            priority: 2,
            parameters: serde_json::json!({"max_capacity": 2}),
        },
        OptimizationConstraint {
            constraint_type: ConstraintType::TrainPriority,
            priority: 1,
            parameters: serde_json::json!({"enforce_priority": true}),
        },
    ];
    
    let mut request = create_sample_optimization_request();
    request.constraints = constraints;
    
    let response = service.optimize_schedule(request).await;
    
    assert!(response.is_ok());
    let response = response.unwrap();
    assert!(response.success);
    
    // Should handle constraints properly
    assert!(response.conflicts_resolved >= 0);
}

#[tokio::test]
async fn test_optimization_with_multiple_trains() {
    let service = OptimizationService::new();
    
    let mut request = create_sample_optimization_request();
    request.trains = create_multiple_sample_trains();
    
    let response = service.optimize_schedule(request).await;
    
    assert!(response.is_ok());
    let response = response.unwrap();
    
    assert!(response.success);
    assert_eq!(response.optimized_schedule.len(), request.trains.len());
    
    // Each train should have a schedule update
    for train in &request.trains {
        let schedule_update = response.optimized_schedule
            .iter()
            .find(|update| update.train_id == train.id);
        
        assert!(schedule_update.is_some(), "Missing schedule for train {}", train.id);
        
        let update = schedule_update.unwrap();
        assert!(!update.speed_profile.is_empty());
        assert!(update.new_departure_time <= update.new_arrival_time);
    }
}

#[tokio::test]
async fn test_simulation_with_what_if_changes() {
    let service = OptimizationService::new();
    
    let what_if_changes = vec![
        WhatIfChange {
            change_type: WhatIfChangeType::DelayTrain,
            train_id: Some("T001".to_string()),
            section_id: None,
            parameters: serde_json::json!({"delay_minutes": 15}),
        },
        WhatIfChange {
            change_type: WhatIfChangeType::AddTrain,
            train_id: None,
            section_id: Some("SEC001".to_string()),
            parameters: serde_json::json!({"train_type": "EXPRESS", "capacity": 400}),
        },
    ];
    
    let mut request = create_sample_simulation_request();
    request.what_if_changes = what_if_changes;
    
    let response = service.simulate_scenario(request).await;
    
    assert!(response.is_ok());
    let response = response.unwrap();
    
    assert!(response.success);
    assert!(response.performance_comparison.improvement_percent != 0.0);
}

#[tokio::test]
async fn test_concurrent_optimization_requests() {
    use std::sync::Arc;
    use tokio::task::JoinSet;
    
    let service = Arc::new(OptimizationService::new());
    let mut join_set = JoinSet::new();
    
    // Create multiple concurrent requests
    for i in 0..5 {
        let service_clone = Arc::clone(&service);
        let mut request = create_sample_optimization_request();
        request.section_id = format!("SECTION_{}", i);
        
        join_set.spawn(async move {
            service_clone.optimize_schedule(request).await
        });
    }
    
    // Wait for all requests to complete
    let mut results = Vec::new();
    while let Some(result) = join_set.join_next().await {
        results.push(result.unwrap());
    }
    
    // All requests should succeed
    assert_eq!(results.len(), 5);
    for result in results {
        assert!(result.is_ok());
        let response = result.unwrap();
        assert!(response.success);
    }
}

// Helper functions

fn create_sample_optimization_request() -> OptimizationRequest {
    OptimizationRequest {
        section_id: "TEST_SECTION_001".to_string(),
        trains: vec![create_sample_train()],
        constraints: vec![
            OptimizationConstraint {
                constraint_type: ConstraintType::SafetyDistance,
                priority: 1,
                parameters: serde_json::json!({"min_distance_seconds": 300}),
            }
        ],
        objective: OptimizationObjective::BalancedOptimal,
        time_horizon_minutes: 120,
    }
}

fn create_sample_simulation_request() -> SimulationRequest {
    SimulationRequest {
        scenario_name: "Test Simulation Scenario".to_string(),
        section_id: "TEST_SECTION_001".to_string(),
        base_trains: vec![create_sample_train()],
        what_if_changes: vec![],
        simulation_duration_hours: 2.0,
    }
}

fn create_sample_train() -> Train {
    Train {
        id: Uuid::new_v4().to_string(),
        train_number: 12345,
        train_type: TrainType::Express,
        priority: TrainPriority::Express,
        origin_station: "Origin".to_string(),
        destination_station: "Destination".to_string(),
        scheduled_departure: Utc::now(),
        scheduled_arrival: Utc::now() + chrono::Duration::hours(2),
        current_section: Some("S001".to_string()),
        speed_kmh: 80.0,
        status: TrainStatus::OnTime,
        next_station: Some("Intermediate".to_string()),
        delay_minutes: 0,
        capacity_passengers: 500,
        current_passengers: 350,
        route: vec!["Origin".to_string(), "Intermediate".to_string(), "Destination".to_string()],
        updated_at: Utc::now(),
    }
}

fn create_multiple_sample_trains() -> Vec<Train> {
    let base_time = Utc::now();
    
    vec![
        Train {
            id: "T001".to_string(),
            train_number: 12001,
            train_type: TrainType::Express,
            priority: TrainPriority::Express,
            origin_station: "StationA".to_string(),
            destination_station: "StationB".to_string(),
            scheduled_departure: base_time,
            scheduled_arrival: base_time + chrono::Duration::hours(1),
            current_section: Some("S001".to_string()),
            speed_kmh: 100.0,
            status: TrainStatus::OnTime,
            next_station: Some("StationB".to_string()),
            delay_minutes: 0,
            capacity_passengers: 500,
            current_passengers: 400,
            route: vec!["StationA".to_string(), "StationB".to_string()],
            updated_at: base_time,
        },
        Train {
            id: "T002".to_string(),
            train_number: 12002,
            train_type: TrainType::Passenger,
            priority: TrainPriority::Passenger,
            origin_station: "StationA".to_string(),
            destination_station: "StationC".to_string(),
            scheduled_departure: base_time + chrono::Duration::minutes(15),
            scheduled_arrival: base_time + chrono::Duration::hours(1) + chrono::Duration::minutes(30),
            current_section: Some("S002".to_string()),
            speed_kmh: 80.0,
            status: TrainStatus::OnTime,
            next_station: Some("StationC".to_string()),
            delay_minutes: 0,
            capacity_passengers: 800,
            current_passengers: 600,
            route: vec!["StationA".to_string(), "StationC".to_string()],
            updated_at: base_time,
        },
        Train {
            id: "T003".to_string(),
            train_number: 12003,
            train_type: TrainType::Freight,
            priority: TrainPriority::Freight,
            origin_station: "StationD".to_string(),
            destination_station: "StationB".to_string(),
            scheduled_departure: base_time + chrono::Duration::minutes(30),
            scheduled_arrival: base_time + chrono::Duration::hours(3),
            current_section: Some("S003".to_string()),
            speed_kmh: 60.0,
            status: TrainStatus::OnTime,
            next_station: Some("StationB".to_string()),
            delay_minutes: 0,
            capacity_passengers: 0,
            current_passengers: 0,
            route: vec!["StationD".to_string(), "StationB".to_string()],
            updated_at: base_time,
        },
    ]
}
