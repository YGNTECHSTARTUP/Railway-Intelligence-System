use axum::{
    extract::{State},
    response::Json,
    http::StatusCode,
};
use crate::AppState;
use crate::services::optimization_service::*;

pub async fn optimize_schedule(
    State(state): State<AppState>,
    Json(request): Json<OptimizationRequest>,
) -> Result<Json<OptimizationResponse>, StatusCode> {
    match state.optimization_service.optimize_schedule(request).await {
        Ok(response) => Ok(Json(response)),
        Err(err) => {
            tracing::error!("Optimization failed: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
