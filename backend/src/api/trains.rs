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

// ============================================================================
// Enhanced Monitoring API Endpoints
// ============================================================================

/// GET /api/v1/trains/analytics
/// Get trains with advanced analytics and filtering
#[derive(Debug, Deserialize)]
pub struct TrainAnalyticsQuery {
    pub status: Option<TrainStatus>,
    pub priority: Option<TrainPriority>,
    pub section_id: Option<String>,
    pub delayed_only: Option<bool>,
    pub min_speed: Option<f32>,
    pub max_speed: Option<f32>,
    pub sort_by: Option<String>,
    pub limit: Option<usize>,
}

pub async fn get_trains_with_analytics(
    State(state): State<AppState>,
    Query(query): Query<TrainAnalyticsQuery>,
) -> Result<Json<crate::services::train_service::TrainAnalyticsResponse>, StatusCode> {
    tracing::info!("Fetching train analytics with filters: {:?}", query);

    let filters = crate::services::train_service::TrainFilters {
        status: query.status,
        priority: query.priority,
        section_id: query.section_id,
        delayed_only: query.delayed_only.unwrap_or(false),
        min_speed: query.min_speed,
        max_speed: query.max_speed,
        sort_by: query.sort_by,
        limit: query.limit,
    };

    match state.train_service.get_trains_with_analytics(&filters).await {
        Ok(response) => Ok(Json(response)),
        Err(err) => {
            tracing::error!("Failed to get train analytics: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// GET /api/v1/trains/positions
/// Get real-time train position updates
pub async fn get_real_time_positions(
    State(state): State<AppState>,
) -> Result<Json<Vec<crate::services::train_service::TrainPositionUpdate>>, StatusCode> {
    tracing::info!("Fetching real-time train positions");

    match state.train_service.get_real_time_positions().await {
        Ok(positions) => Ok(Json(positions)),
        Err(err) => {
            tracing::error!("Failed to get real-time positions: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// GET /api/v1/trains/conflicts
/// Get detected train conflicts
pub async fn get_train_conflicts(
    State(state): State<AppState>,
) -> Result<Json<Vec<crate::services::train_service::TrainConflict>>, StatusCode> {
    tracing::info!("Detecting train conflicts");

    match state.train_service.detect_train_conflicts().await {
        Ok(conflicts) => {
            if !conflicts.is_empty() {
                tracing::warn!("Detected {} train conflicts", conflicts.len());
            }
            Ok(Json(conflicts))
        },
        Err(err) => {
            tracing::error!("Failed to detect conflicts: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// GET /api/v1/trains/alerts
/// Get monitoring alerts for all trains
pub async fn get_monitoring_alerts(
    State(state): State<AppState>,
) -> Result<Json<Vec<crate::services::train_service::TrainAlert>>, StatusCode> {
    tracing::info!("Generating monitoring alerts");

    match state.train_service.generate_monitoring_alerts().await {
        Ok(alerts) => {
            if !alerts.is_empty() {
                tracing::info!("Generated {} monitoring alerts", alerts.len());
            }
            Ok(Json(alerts))
        },
        Err(err) => {
            tracing::error!("Failed to generate alerts: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// GET /api/v1/trains/{train_id}/history
/// Get performance history for a specific train
#[derive(Debug, Deserialize)]
pub struct PerformanceHistoryQuery {
    pub hours: Option<u32>,
}

pub async fn get_train_performance_history(
    State(state): State<AppState>,
    Path(train_id): Path<String>,
    Query(query): Query<PerformanceHistoryQuery>,
) -> Result<Json<crate::services::train_service::TrainPerformanceHistory>, StatusCode> {
    let hours = query.hours.unwrap_or(24); // Default to 24 hours
    tracing::info!("Fetching performance history for train {} ({} hours)", train_id, hours);

    match state.train_service.get_train_performance_history(&train_id, hours).await {
        Ok(history) => Ok(Json(history)),
        Err(err) => {
            tracing::error!("Failed to get performance history for train {}: {:?}", train_id, err);
            match err {
                ServiceError::NotFound(_) => Err(StatusCode::NOT_FOUND),
                _ => Err(StatusCode::INTERNAL_SERVER_ERROR),
            }
        }
    }
}

/// GET /api/v1/trains/density
/// Get section density and utilization metrics
pub async fn get_section_density(
    State(state): State<AppState>,
) -> Result<Json<Vec<crate::services::train_service::SectionDensity>>, StatusCode> {
    tracing::info!("Fetching section density metrics");

    match state.train_service.get_section_density().await {
        Ok(densities) => Ok(Json(densities)),
        Err(err) => {
            tracing::error!("Failed to get section density: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

// ============================================================================
// Train Management CRUD API Endpoints
// ============================================================================

/// GET /api/v1/trains
/// Get all trains with pagination
#[derive(Debug, Deserialize)]
pub struct TrainListQuery {
    pub page: Option<usize>,
    pub per_page: Option<usize>,
    pub status: Option<TrainStatus>,
    pub search: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TrainListResponse {
    pub trains: Vec<TrainStatusInfo>,
    pub total_count: usize,
    pub page: usize,
    pub per_page: usize,
    pub total_pages: usize,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

pub async fn get_all_trains(
    State(state): State<AppState>,
    Query(query): Query<TrainListQuery>,
) -> Result<Json<TrainListResponse>, StatusCode> {
    tracing::info!("Fetching all trains with query: {:?}", query);

    let page = query.page.unwrap_or(1);
    let per_page = query.per_page.unwrap_or(50).min(100).max(1);

    match state.train_service.get_all_trains_paginated(Some(page), Some(per_page)).await {
        Ok((trains, total_count)) => {
            let mut filtered_trains = trains;

            // Apply additional filters
            if let Some(status) = query.status {
                filtered_trains.retain(|t| t.status == status);
            }

            if let Some(search) = &query.search {
                let search_lower = search.to_lowercase();
                filtered_trains.retain(|t| {
                    t.name.to_lowercase().contains(&search_lower) ||
                    t.train_number.to_string().contains(&search_lower)
                });
            }

            let train_statuses: Vec<TrainStatusInfo> = filtered_trains
                .into_iter()
                .map(TrainStatusInfo::from)
                .collect();

            let total_pages = (total_count + per_page - 1) / per_page;

            let response = TrainListResponse {
                trains: train_statuses,
                total_count,
                page,
                per_page,
                total_pages,
                timestamp: chrono::Utc::now(),
            };

            Ok(Json(response))
        },
        Err(err) => {
            tracing::error!("Failed to get trains list: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// PUT /api/v1/trains/{train_id}
/// Update a train completely
#[derive(Debug, Deserialize)]
pub struct UpdateTrainRequest {
    pub train_number: u32,
    pub name: String,
    pub priority: TrainPriority,
    pub route: Vec<String>,
    pub current_section: Option<String>,
    pub position: Option<GeoPoint>,
    pub status: Option<TrainStatus>,
    pub direction: Option<Direction>,
}

pub async fn update_train(
    State(state): State<AppState>,
    Path(train_id): Path<String>,
    Json(request): Json<UpdateTrainRequest>,
) -> Result<Json<TrainStatusInfo>, StatusCode> {
    tracing::info!("Updating train {}: {:?}", train_id, request);

    // Get the existing train to preserve fields not being updated
    let existing_train = match state.train_service.get_train(&train_id).await {
        Ok(train) => train,
        Err(ServiceError::NotFound(_)) => {
            tracing::warn!("Train not found for update: {}", train_id);
            return Err(StatusCode::NOT_FOUND);
        },
        Err(err) => {
            tracing::error!("Failed to get existing train {}: {:?}", train_id, err);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // Create updated train with new values
    let updated_train = Train {
        id: train_id.clone(),
        train_number: request.train_number,
        name: request.name,
        priority: request.priority,
        route: request.route,
        current_section: request.current_section.unwrap_or(existing_train.current_section),
        position: request.position.unwrap_or(existing_train.position),
        status: request.status.unwrap_or(existing_train.status),
        direction: request.direction.unwrap_or(existing_train.direction),
        // Preserve existing runtime fields
        delay_minutes: existing_train.delay_minutes,
        eta_next_station: existing_train.eta_next_station,
        speed_kmh: existing_train.speed_kmh,
        consist: existing_train.consist,
        created_at: existing_train.created_at,
        updated_at: chrono::Utc::now(),
    };

    match state.train_service.update_train(&train_id, updated_train).await {
        Ok(updated_train) => {
            Ok(Json(TrainStatusInfo::from(updated_train)))
        },
        Err(err) => {
            tracing::error!("Failed to update train {}: {:?}", train_id, err);
            match err {
                ServiceError::NotFound(_) => Err(StatusCode::NOT_FOUND),
                ServiceError::Validation(_) => Err(StatusCode::BAD_REQUEST),
                ServiceError::Conflict(_) => Err(StatusCode::CONFLICT),
                _ => Err(StatusCode::INTERNAL_SERVER_ERROR),
            }
        }
    }
}

/// DELETE /api/v1/trains/{train_id}
/// Delete a train
#[derive(Debug, Serialize)]
pub struct DeleteTrainResponse {
    pub success: bool,
    pub message: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

pub async fn delete_train(
    State(state): State<AppState>,
    Path(train_id): Path<String>,
) -> Result<Json<DeleteTrainResponse>, StatusCode> {
    tracing::info!("Deleting train: {}", train_id);

    match state.train_service.delete_train(&train_id).await {
        Ok(()) => {
            let response = DeleteTrainResponse {
                success: true,
                message: format!("Train {} deleted successfully", train_id),
                timestamp: chrono::Utc::now(),
            };
            Ok(Json(response))
        },
        Err(err) => {
            tracing::error!("Failed to delete train {}: {:?}", train_id, err);
            match err {
                ServiceError::NotFound(_) => Err(StatusCode::NOT_FOUND),
                ServiceError::Validation(msg) => {
                    // Return validation error as bad request with message
                    tracing::warn!("Train deletion validation failed: {}", msg);
                    Err(StatusCode::BAD_REQUEST)
                },
                _ => Err(StatusCode::INTERNAL_SERVER_ERROR),
            }
        }
    }
}
