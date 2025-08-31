use axum::{
    extract::{Path, State},
    response::Json,
    http::StatusCode,
};
use serde_json::json;
use crate::AppState;

pub async fn get_section_state(
    State(_state): State<AppState>,
    Path(section_id): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // TODO: Implement section state retrieval
    Ok(Json(json!({
        "section_id": section_id,
        "status": "active",
        "occupancy": 5,
        "capacity": 20,
        "trains": []
    })))
}
