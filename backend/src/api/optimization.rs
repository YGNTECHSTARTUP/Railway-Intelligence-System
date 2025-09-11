use axum::{
    extract::{State, Path},
    response::Json,
    http::StatusCode,
    routing::{get, post},
    Router,
};
use serde_json::json;
use tracing::{info, error};

use crate::AppState;
use crate::services::optimization_service::*;
use crate::services::ServiceError;

/// Create optimization routes
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/schedule", post(optimize_schedule))
        .route("/simulate", post(simulate_scenario))
        .route("/validate", post(validate_schedule))
        .route("/status/:request_id", get(get_optimization_status))
        .route("/objectives", get(get_available_objectives))
        .route("/health", get(health_check))
}

/// Optimize train schedule using OR-Tools
pub async fn optimize_schedule(
    State(state): State<AppState>,
    Json(request): Json<OptimizationRequest>,
) -> Result<Json<OptimizationResponse>, (StatusCode, Json<serde_json::Value>)> {
    info!("Received optimization request for section: {}", request.section_id);
    
    match state.optimization_service.optimize_schedule(request).await {
        Ok(response) => {
            info!("Optimization completed successfully");
            Ok(Json(response))
        }
        Err(ServiceError::Validation(msg)) => {
            error!("Optimization validation failed: {}", msg);
            Err((
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "Validation failed", "details": msg }))
            ))
        }
        Err(ServiceError::Optimization(msg)) => {
            error!("Optimization failed: {}", msg);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Optimization failed", "details": msg }))
            ))
        }
        Err(err) => {
            error!("Unexpected optimization error: {:?}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Internal server error", "details": err.to_string() }))
            ))
        }
    }
}

/// Simulate what-if scenarios
pub async fn simulate_scenario(
    State(state): State<AppState>,
    Json(request): Json<SimulationRequest>,
) -> Result<Json<SimulationResponse>, (StatusCode, Json<serde_json::Value>)> {
    info!("Received simulation request for scenario: {}", request.scenario_name);
    
    match state.optimization_service.simulate_scenario(request).await {
        Ok(response) => {
            info!("Simulation completed successfully");
            Ok(Json(response))
        }
        Err(ServiceError::Validation(msg)) => {
            error!("Simulation validation failed: {}", msg);
            Err((
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "Validation failed", "details": msg }))
            ))
        }
        Err(err) => {
            error!("Simulation failed: {:?}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Simulation failed", "details": err.to_string() }))
            ))
        }
    }
}

/// Validate a train schedule
pub async fn validate_schedule(
    State(_state): State<AppState>,
    Json(_request): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    // TODO: Implement schedule validation
    Ok(Json(json!({
        "valid": true,
        "message": "Schedule validation not yet implemented"
    })))
}

/// Get optimization status for a specific request
pub async fn get_optimization_status(
    State(_state): State<AppState>,
    Path(request_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    info!("Getting status for optimization request: {}", request_id);
    
    // TODO: Implement real status tracking
    Ok(Json(json!({
        "request_id": request_id,
        "status": "completed",
        "progress_percent": 100.0,
        "current_phase": "Optimization complete"
    })))
}

/// Get available optimization objectives
pub async fn get_available_objectives(
    State(state): State<AppState>,
) -> Json<Vec<OptimizationObjective>> {
    let objectives = state.optimization_service.get_available_objectives();
    Json(objectives)
}

/// Health check for optimization service
pub async fn health_check(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let is_available = state.optimization_service.is_optimizer_available().await;
    
    if is_available {
        Ok(Json(json!({
            "status": "healthy",
            "optimizer_available": true,
            "message": "Optimization service is running"
        })))
    } else {
        Err((
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({
                "status": "unhealthy",
                "optimizer_available": false,
                "message": "Optimization service is not available"
            }))
        ))
    }
}
