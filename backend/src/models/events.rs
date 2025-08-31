use super::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrainEvent {
    pub id: String,
    pub train_id: String,
    pub event_type: TrainEventType,
    pub location: GeoPoint,
    pub station_code: Option<String>,
    pub section_id: Option<String>,
    pub timestamp: DateTime<Utc>,
    pub metadata: EventMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TrainEventType {
    Departure,
    Arrival,
    Delay,
    SpeedChange,
    RouteChange,
    Breakdown,
    Emergency,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventMetadata {
    pub speed_kmh: Option<f32>,
    pub delay_minutes: Option<i32>,
    pub platform: Option<u8>,
    pub reason: Option<String>,
    pub severity: EventSeverity,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EventSeverity {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisruptionEvent {
    pub id: String,
    pub disruption_type: DisruptionType,
    pub affected_sections: Vec<String>,
    pub affected_trains: Vec<String>,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub impact_level: u8, // 1-10 scale
    pub description: String,
    pub response_actions: Vec<ResponseAction>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum DisruptionType {
    Weather,
    SignalFailure,
    TrackMaintenance,
    Accident,
    StrikeFactor,
    PowerFailure,
    RollingStockFailure,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponseAction {
    pub action_type: ResponseActionType,
    pub description: String,
    pub taken_at: DateTime<Utc>,
    pub taken_by: String, // Controller ID
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ResponseActionType {
    TrainHold,
    RouteChange,
    SpeedRestriction,
    ServiceCancellation,
    EmergencyStop,
    AlternateRouting,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictEvent {
    pub id: String,
    pub conflict_type: ConflictType,
    pub trains_involved: Vec<String>,
    pub section_id: String,
    pub location: GeoPoint,
    pub detected_at: DateTime<Utc>,
    pub resolved_at: Option<DateTime<Utc>>,
    pub resolution: Option<ConflictResolution>,
    pub severity: ConflictSeverity,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConflictType {
    SamePlatform,
    BlockOccupancy,
    HeadOnCollision,
    OvertakingConflict,
    CrossingConflict,
    SignalViolation,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConflictSeverity {
    Minor,
    Major,
    Critical,
    Safety,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictResolution {
    pub resolution_type: ResolutionType,
    pub actions_taken: Vec<String>,
    pub trains_affected: Vec<String>,
    pub delay_caused: i32,
    pub resolved_by: String, // Controller or System
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ResolutionType {
    PriorityBased,
    TimeSlotting,
    RouteAlternative,
    TemporaryHold,
    SpeedAdjustment,
}

impl TrainEvent {
    pub fn new(
        train_id: String,
        event_type: TrainEventType,
        location: GeoPoint,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            train_id,
            event_type,
            location,
            station_code: None,
            section_id: None,
            timestamp: Utc::now(),
            metadata: EventMetadata {
                speed_kmh: None,
                delay_minutes: None,
                platform: None,
                reason: None,
                severity: EventSeverity::Low,
            },
        }
    }

    pub fn with_delay(mut self, delay: i32) -> Self {
        self.metadata.delay_minutes = Some(delay);
        self.metadata.severity = if delay > 30 {
            EventSeverity::High
        } else if delay > 10 {
            EventSeverity::Medium
        } else {
            EventSeverity::Low
        };
        self
    }

    pub fn with_speed(mut self, speed: f32) -> Self {
        self.metadata.speed_kmh = Some(speed);
        self
    }
}

impl DisruptionEvent {
    pub fn new(
        disruption_type: DisruptionType,
        affected_sections: Vec<String>,
        description: String,
        impact_level: u8,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            disruption_type,
            affected_sections,
            affected_trains: Vec::new(),
            start_time: Utc::now(),
            end_time: None,
            impact_level,
            description,
            response_actions: Vec::new(),
        }
    }

    pub fn is_active(&self) -> bool {
        self.end_time.is_none()
    }

    pub fn duration_minutes(&self) -> Option<i64> {
        self.end_time.map(|end| {
            (end - self.start_time).num_minutes()
        })
    }
}
