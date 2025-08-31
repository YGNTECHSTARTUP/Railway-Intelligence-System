use axum::{
    extract::{State, Query},
    response::Json,
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct AnalyticsQuery {
    /// Time period in hours (default: 24)
    pub hours: Option<i64>,
    /// Section ID filter
    pub section_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct KPIResponse {
    pub punctuality_percent: f32,
    pub average_delay_minutes: f32,
    pub throughput_trains_per_hour: f32,
    pub utilization_percent: f32,
    pub conflicts_resolved: u32,
    pub total_trains_processed: u32,
    pub period_hours: i64,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct SectionAnalytics {
    pub section_id: String,
    pub section_name: String,
    pub trains_processed: u32,
    pub average_delay: f32,
    pub utilization_percent: f32,
    pub conflicts: u32,
    pub capacity_utilization: f32,
}

#[derive(Debug, Serialize)]
pub struct SystemOverview {
    pub total_active_trains: u32,
    pub delayed_trains: u32,
    pub on_time_trains: u32,
    pub total_sections: u32,
    pub active_disruptions: u32,
    pub system_utilization: f32,
    pub average_speed_kmh: f32,
    pub last_updated: DateTime<Utc>,
}

/// GET /api/v1/analytics/kpis
/// Get key performance indicators
pub async fn get_kpis(
    State(state): State<AppState>,
    Query(query): Query<AnalyticsQuery>,
) -> Result<Json<KPIResponse>, StatusCode> {
    let hours = query.hours.unwrap_or(24);
    tracing::info!("Fetching KPIs for {} hours", hours);

    match calculate_kpis(&state, hours, query.section_id).await {
        Ok(kpis) => Ok(Json(kpis)),
        Err(err) => {
            tracing::error!("Failed to calculate KPIs: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// GET /api/v1/analytics/overview
/// Get system overview
pub async fn get_system_overview(
    State(state): State<AppState>,
) -> Result<Json<SystemOverview>, StatusCode> {
    tracing::info!("Fetching system overview");

    match calculate_system_overview(&state).await {
        Ok(overview) => Ok(Json(overview)),
        Err(err) => {
            tracing::error!("Failed to get system overview: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// GET /api/v1/analytics/sections
/// Get analytics for all sections
pub async fn get_section_analytics(
    State(state): State<AppState>,
    Query(query): Query<AnalyticsQuery>,
) -> Result<Json<Vec<SectionAnalytics>>, StatusCode> {
    let hours = query.hours.unwrap_or(24);
    tracing::info!("Fetching section analytics for {} hours", hours);

    match calculate_section_analytics(&state, hours).await {
        Ok(analytics) => Ok(Json(analytics)),
        Err(err) => {
            tracing::error!("Failed to get section analytics: {:?}", err);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn calculate_kpis(
    state: &AppState,
    hours: i64,
    _section_id: Option<String>,
) -> Result<KPIResponse, Box<dyn std::error::Error>> {
    // Get current train statistics
    let train_stats = state.train_service.calculate_train_statistics().await?;
    
    // Calculate punctuality (trains with less than 5 minutes delay)
    let trains = state.train_service.get_all_trains().await?;
    let on_time_trains = trains.iter().filter(|t| t.delay_minutes <= 5).count();
    let punctuality_percent = if trains.len() > 0 {
        (on_time_trains as f32 / trains.len() as f32) * 100.0
    } else {
        100.0
    };

    // Calculate throughput
    let throughput = train_stats.total_active_trains as f32 / hours as f32;

    // Get disruptions count (conflicts resolved)
    let disruptions = state.db.get_active_disruptions().await?;
    let conflicts_resolved = disruptions.iter().filter(|d| !d.is_active()).count() as u32;

    Ok(KPIResponse {
        punctuality_percent,
        average_delay_minutes: train_stats.average_delay_minutes,
        throughput_trains_per_hour: throughput,
        utilization_percent: 75.0, // TODO: Calculate from actual capacity
        conflicts_resolved,
        total_trains_processed: train_stats.total_active_trains,
        period_hours: hours,
        timestamp: Utc::now(),
    })
}

async fn calculate_system_overview(
    state: &AppState,
) -> Result<SystemOverview, Box<dyn std::error::Error>> {
    let trains = state.train_service.get_all_trains().await?;
    let disruptions = state.db.get_active_disruptions().await?;
    
    let total_active_trains = trains.len() as u32;
    let delayed_trains = trains.iter().filter(|t| t.is_delayed()).count() as u32;
    let on_time_trains = total_active_trains - delayed_trains;
    
    let average_speed = if trains.len() > 0 {
        trains.iter().map(|t| t.speed_kmh).sum::<f32>() / trains.len() as f32
    } else {
        0.0
    };
    
    let active_disruptions = disruptions.iter().filter(|d| d.is_active()).count() as u32;

    Ok(SystemOverview {
        total_active_trains,
        delayed_trains,
        on_time_trains,
        total_sections: 50, // TODO: Get from database
        active_disruptions,
        system_utilization: 68.5, // TODO: Calculate from section data
        average_speed_kmh: average_speed,
        last_updated: Utc::now(),
    })
}

async fn calculate_section_analytics(
    _state: &AppState,
    _hours: i64,
) -> Result<Vec<SectionAnalytics>, Box<dyn std::error::Error>> {
    // This would require implementing section queries in the database
    // For now, return mock data for demonstration
    let mock_analytics = vec![
        SectionAnalytics {
            section_id: "SEC001".to_string(),
            section_name: "Delhi-Gurgaon".to_string(),
            trains_processed: 25,
            average_delay: 8.5,
            utilization_percent: 85.0,
            conflicts: 2,
            capacity_utilization: 75.0,
        },
        SectionAnalytics {
            section_id: "SEC002".to_string(),
            section_name: "Mumbai-Pune".to_string(),
            trains_processed: 32,
            average_delay: 15.2,
            utilization_percent: 92.0,
            conflicts: 5,
            capacity_utilization: 88.0,
        },
    ];
    
    Ok(mock_analytics)
}
