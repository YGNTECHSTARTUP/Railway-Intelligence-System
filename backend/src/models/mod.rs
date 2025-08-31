use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use geo::Point;

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct GeoPoint {
    pub latitude: f64,
    pub longitude: f64,
}

impl From<Point> for GeoPoint {
    fn from(point: Point) -> Self {
        Self {
            latitude: point.y(),
            longitude: point.x(),
        }
    }
}

impl From<GeoPoint> for Point {
    fn from(geo_point: GeoPoint) -> Self {
        Point::new(geo_point.longitude, geo_point.latitude)
    }
}

pub mod train;
pub mod section;
pub mod optimization;
pub mod events;

pub use train::*;
pub use section::*;
pub use optimization::*;
pub use events::*;

// Additional types for railway sections
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RailwaySection {
    pub id: String,
    pub name: String,
    pub start_coordinates: GeoPoint,
    pub end_coordinates: GeoPoint,
    pub length_km: f64,
    pub track_type: TrackType,
    pub max_speed_kmh: f32,
    pub capacity_trains_per_hour: u32,
    pub current_occupancy: u32,
    pub status: SectionStatus,
    pub signals: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum SectionStatus {
    Active,
    Maintenance,
    Blocked,
    Closed,
}

// Event types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: String,
    pub event_type: EventType,
    pub timestamp: DateTime<Utc>,
    pub train_id: Option<String>,
    pub section_id: Option<String>,
    pub description: String,
    pub severity: EventSeverity,
    pub acknowledged: bool,
    pub metadata: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum EventType {
    TrainDeparture,
    TrainArrival,
    DelayReported,
    StatusUpdate,
    ConflictDetected,
    ConflictResolved,
    MaintenanceStarted,
    MaintenanceCompleted,
    EmergencyAlert,
    WeatherAlert,
}

// Disruption types
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum DisruptionImpact {
    Minor,
    Moderate,
    Major,
    Critical,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum DisruptionStatus {
    Active,
    Resolved,
    Monitoring,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum TrainPriority {
    Emergency = 1,
    Mail = 2,
    Express = 3,
    Passenger = 4,
    Freight = 5,
    Maintenance = 6,
}

impl TrainPriority {
    pub fn value(&self) -> u8 {
        *self as u8
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum Direction {
    Up,
    Down,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum TrackType {
    Single,
    Double,
    Multiple,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum SignalStatus {
    Red,
    Yellow,
    Green,
    DoubleYellow,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum WeatherType {
    Clear,
    Fog,
    Rain,
    Storm,
    Snow,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub punctuality_percent: f32,
    pub average_delay_minutes: f32,
    pub throughput_trains_per_hour: f32,
    pub utilization_percent: f32,
    pub conflicts_resolved: u32,
    pub total_trains_processed: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrainStatistics {
    pub total_active_trains: u32,
    pub delayed_trains: u32,
    pub on_time_trains: u32,
    pub average_delay_minutes: f32,
    pub priority_breakdown: std::collections::HashMap<TrainPriority, u32>,
}
