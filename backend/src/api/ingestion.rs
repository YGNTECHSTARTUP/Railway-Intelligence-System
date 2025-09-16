use axum::{
    extract::State,
    response::Json,
    http::StatusCode,
};
use serde_json::{json, Value};
use tracing::{info, error};

use crate::AppState;

/// Trigger manual data ingestion
pub async fn trigger_ingestion(
    State(state): State<AppState>,
) -> Result<Json<Value>, StatusCode> {
    info!("Manual ingestion triggered");

    match state.ingestion_service.trigger_manual_ingestion().await {
        Ok(report) => {
            info!("Manual ingestion completed successfully");
            Ok(Json(json!({
                "status": "success",
                "message": "Data ingestion completed",
                "report": {
                    "trains_processed": report.trains_processed,
                    "stations_processed": report.stations_processed,
                    "events_generated": report.events_generated,
                    "errors_encountered": report.errors_encountered,
                    "processing_time_ms": report.processing_time_ms,
                    "timestamp": report.timestamp
                }
            })))
        },
        Err(e) => {
            error!("Manual ingestion failed: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Get ingestion statistics
pub async fn get_ingestion_stats(
    State(state): State<AppState>,
) -> Result<Json<Value>, StatusCode> {
    info!("Ingestion stats requested");

    match state.ingestion_service.get_ingestion_stats().await {
        Ok(stats) => {
            Ok(Json(json!({
                "status": "success",
                "stats": {
                    "total_records_processed": stats.total_records_processed,
                    "successful_ingestions": stats.successful_ingestions,
                    "failed_ingestions": stats.failed_ingestions,
                    "average_processing_time_ms": stats.average_processing_time_ms,
                    "last_ingestion": stats.last_ingestion,
                    "uptime_hours": stats.uptime_hours
                }
            })))
        },
        Err(e) => {
            error!("Failed to get ingestion stats: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Check health of external APIs
pub async fn check_api_health(
    State(state): State<AppState>,
) -> Result<Json<Value>, StatusCode> {
    info!("API health check requested");

    match state.ingestion_service.check_api_health().await {
        Ok(health_status) => {
            let all_healthy = health_status.values().all(|&status| status);
            
            Ok(Json(json!({
                "status": "success",
                "overall_health": if all_healthy { "healthy" } else { "degraded" },
                "api_status": health_status,
                "timestamp": chrono::Utc::now()
            })))
        },
        Err(e) => {
            error!("Failed to check API health: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
