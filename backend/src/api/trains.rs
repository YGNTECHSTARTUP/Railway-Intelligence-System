use axum::{
    extract::{Path, Query, State},
    response::Json,
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use crate::{models::*, services::*, AppState};

/// Query parameters for train status filtering
#[derive(Debug, Deserialize)]
pub struct TrainStatusQuery {
    /// Filter by train status
    pub status: Option<TrainStatus>,
    /// Filter by section ID
    pub section_id: Option<String>,
    /// Filter by priority
    pub priority: Option<TrainPriority>,
    /// Include delayed trains only
    pub delayed_only: Option<bool>,
    /// Limit number of results
    pub limit: Option<usize>,
}

/// Response for train status endpoint
#[derive(Debug, Serialize)]
pub struct TrainStatusResponse {
    pub trains: Vec<TrainStatusInfo>,
    pub total_count: usize,
    pub delayed_count: usize,
    pub on_time_count: usize,
    pub average_delay_minutes: f32,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct TrainStatusInfo {
    pub id: String,
    pub train_number: u32,
    pub name: String,
    pub priority: TrainPriority,
    pub current_section: String,
    pub position: GeoPoint,
    pub delay_minutes: i32,
    pub eta_next_station: chrono::DateTime<chrono::Utc>,
    pub speed_kmh: f32,
    pub direction: Direction,
    pub status: TrainStatus,
    pub route: Vec<String>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

impl From<Train> for TrainStatusInfo {
    fn from(train: Train) -> Self {
        Self {
            id: train.id,
            train_number: train.train_number,
            name: train.name,
            priority: train.priority,
            current_section: train.current_section,
            position: train.position,
            delay_minutes: train.delay_minutes,
            eta_next_station: train.eta_next_station,
            speed_kmh: train.speed_kmh,
            direction: train.direction,
            status: train.status,
            route: train.route,
            updated_at: train.updated_at,
        }
    }
}

/// GET /api/v1/trains/status
/// Returns current status of all trains with optional filtering
pub async fn get_train_status(
    State(state): State<AppState>,
    Query(query): Query<TrainStatusQuery>,
) -> Result<Json<TrainStatusResponse>, StatusCode> {
    tracing::info!("Fetching train status with query: {:?}", query);

    // Get trains from train service
    match state.train_service.get_all_trains().await {
        Ok(trains) => {
            let mut filtered_trains = trains;

            // Apply filters
            if let Some(status) = query.status {
                filtered_trains.retain(|t| t.status == status);
            }

            if let Some(section_id) = &query.section_id {
                filtered_trains.retain(|t| t.current_section == *section_id);
            }

            if let Some(priority) = query.priority {
                filtered_trains.retain(|t| t.priority == priority);
            }

            if query.delayed_only.unwrap_or(false) {
                filtered_trains.retain(|t| t.is_delayed());
            }

            // Apply limit
            if let Some(limit) = query.limit {
                filtered_trains.truncate(limit);
            }

            // Calculate metrics
            let total_count = filtered_trains.len();
            let delayed_count = filtered_trains.iter().filter(|t| t.is_delayed()).count();
            let on_time_count = total_count - delayed_count;
            
            let average_delay_minutes = if total_count > 0 {
                filtered_trains.iter()
                    .map(|t| t.delay_minutes as f32)
                    .sum::<f32>() / total_count as f32
            } else {
                0.0
            };

            let train_statuses: Vec<TrainStatusInfo> = filtered_trains
                .into_iter()
                .map(TrainStatusInfo::from)
                .collect();

            let response = TrainStatusResponse {
                trains: train_statuses,
                total_count,
                delayed_count,
                on_time_count,
                average_delay_minutes,
                timestamp: chrono::Utc::now(),
            };

            Ok(Json(response))
        },
        Err(err) => {
            tracing::error!("Failed to get train status: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// GET /api/v1/trains/{train_id}/status
/// Returns detailed status of a specific train
pub async fn get_train_by_id(
    State(state): State<AppState>,
    Path(train_id): Path<String>,
) -> Result<Json<TrainStatusInfo>, StatusCode> {
    tracing::info!("Fetching status for train: {}", train_id);

    match state.train_service.get_train_by_id(&train_id).await {
        Ok(Some(train)) => {
            Ok(Json(TrainStatusInfo::from(train)))
        },
        Ok(None) => {
            tracing::warn!("Train not found: {}", train_id);
            Err(StatusCode::NOT_FOUND)
        },
        Err(err) => {
            tracing::error!("Failed to get train {}: {:?}", train_id, err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// POST /api/v1/trains/{train_id}/update
/// Update train position and status
#[derive(Debug, Deserialize)]
pub struct TrainUpdateRequest {
    pub position: Option<GeoPoint>,
    pub speed_kmh: Option<f32>,
    pub delay_minutes: Option<i32>,
    pub status: Option<TrainStatus>,
    pub current_section: Option<String>,
}

pub async fn update_train_status(
    State(state): State<AppState>,
    Path(train_id): Path<String>,
    Json(update_request): Json<TrainUpdateRequest>,
) -> Result<Json<TrainStatusInfo>, StatusCode> {
    tracing::info!("Updating train {} with data: {:?}", train_id, update_request);

    match state.train_service.update_train_status(&train_id, update_request).await {
        Ok(updated_train) => {
            Ok(Json(TrainStatusInfo::from(updated_train)))
        },
        Err(err) => {
            tracing::error!("Failed to update train {}: {:?}", train_id, err);
            match err {
                crate::services::ServiceError::NotFound(_) => Err(StatusCode::NOT_FOUND),
                crate::services::ServiceError::Validation(_) => Err(StatusCode::BAD_REQUEST),
                _ => Err(StatusCode::INTERNAL_SERVER_ERROR),
            }
        }
    }
}

/// GET /api/v1/trains/delayed
/// Get all delayed trains
pub async fn get_delayed_trains(
    State(state): State<AppState>,
    Query(_query): Query<TrainStatusQuery>,
) -> Result<Json<TrainStatusResponse>, StatusCode> {
    tracing::info!("Fetching delayed trains");

    let min_delay = 1; // Minimum delay in minutes to be considered "delayed"
    match state.train_service.get_delayed_trains(min_delay).await {
        Ok(trains) => {
            let train_statuses: Vec<TrainStatusInfo> = trains
                .into_iter()
                .map(TrainStatusInfo::from)
                .collect();

            let total_count = train_statuses.len();
            let average_delay_minutes = if total_count > 0 {
                train_statuses.iter()
                    .map(|t| t.delay_minutes as f32)
                    .sum::<f32>() / total_count as f32
            } else {
                0.0
            };

            let response = TrainStatusResponse {
                trains: train_statuses,
                total_count,
                delayed_count: total_count,
                on_time_count: 0,
                average_delay_minutes,
                timestamp: chrono::Utc::now(),
            };

            Ok(Json(response))
        },
        Err(err) => {
            tracing::error!("Failed to get delayed trains: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// GET /api/v1/trains/section/{section_id}
/// Get all trains in a specific section
pub async fn get_trains_in_section(
    State(state): State<AppState>,
    Path(section_id): Path<String>,
) -> Result<Json<TrainStatusResponse>, StatusCode> {
    tracing::info!("Fetching trains in section: {}", section_id);

    match state.train_service.get_trains_in_section(&section_id).await {
        Ok(trains) => {
            let train_statuses: Vec<TrainStatusInfo> = trains
                .into_iter()
                .map(TrainStatusInfo::from)
                .collect();

            let total_count = train_statuses.len();
            let delayed_count = train_statuses.iter().filter(|t| t.delay_minutes > 0).count();
            let on_time_count = total_count - delayed_count;
            
            let average_delay_minutes = if total_count > 0 {
                train_statuses.iter()
                    .map(|t| t.delay_minutes as f32)
                    .sum::<f32>() / total_count as f32
            } else {
                0.0
            };

            let response = TrainStatusResponse {
                trains: train_statuses,
                total_count,
                delayed_count,
                on_time_count,
                average_delay_minutes,
                timestamp: chrono::Utc::now(),
            };

            Ok(Json(response))
        },
        Err(err) => {
            tracing::error!("Failed to get trains in section {}: {:?}", section_id, err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// POST /api/v1/trains
/// Create a new train
#[derive(Debug, Deserialize)]
pub struct CreateTrainRequest {
    pub train_number: u32,
    pub name: String,
    pub priority: TrainPriority,
    pub route: Vec<String>,
    pub current_section: Option<String>,
    pub position: Option<GeoPoint>,
}

pub async fn create_train(
    State(state): State<AppState>,
    Json(request): Json<CreateTrainRequest>,
) -> Result<Json<TrainStatusInfo>, StatusCode> {
    tracing::info!("Creating train: {} ({})", request.name, request.train_number);

    let mut train = Train::new(
        request.train_number,
        request.name,
        request.priority,
        request.route,
    );

    if let Some(section) = request.current_section {
        train.current_section = section;
    }

    if let Some(position) = request.position {
        train.position = position;
    }

    match state.train_service.create_train(train.clone()).await {
        Ok(train_id) => {
            train.id = train_id;
            Ok(Json(TrainStatusInfo::from(train)))
        },
        Err(err) => {
            tracing::error!("Failed to create train: {:?}", err);
            match err {
                ServiceError::Conflict(_) => Err(StatusCode::CONFLICT),
                ServiceError::Validation(_) => Err(StatusCode::BAD_REQUEST),
                _ => Err(StatusCode::INTERNAL_SERVER_ERROR),
            }
        }
    }
}
