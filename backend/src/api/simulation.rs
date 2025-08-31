use axum::{
    extract::{State},
    response::Json,
    http::StatusCode,
};
use crate::AppState;
use crate::services::optimization_service::*;

pub async fn simulate_scenario(
    State(state): State<AppState>,
    Json(request): Json<SimulationRequest>,
) -> Result<Json<SimulationResponse>, StatusCode> {
    match state.optimization_service.simulate_scenario(request).await {
        Ok(response) => Ok(Json(response)),
        Err(err) => {
            tracing::error!("Simulation failed: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
