use super::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Train {
    pub id: String,
    pub train_number: u32,
    pub name: String,
    pub priority: TrainPriority,
    pub current_section: String,
    pub position: GeoPoint,
    pub delay_minutes: i32,
    pub eta_next_station: DateTime<Utc>,
    pub speed_kmh: f32,
    pub direction: Direction,
    pub consist: TrainConsist,
    pub status: TrainStatus,
    pub route: Vec<String>, // Station codes
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrainConsist {
    pub locomotive_type: String,
    pub total_coaches: u32,
    pub passenger_coaches: u32,
    pub freight_wagons: u32,
    pub total_length_meters: f32,
    pub max_speed_kmh: f32,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[derive(PartialEq)]
pub enum TrainStatus {
    Scheduled,
    Running,
    Delayed,
    AtStation,
    Terminated,
    Cancelled,
}

impl Train {
    pub fn new(
        train_number: u32,
        name: String,
        priority: TrainPriority,
        route: Vec<String>,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            train_number,
            name,
            priority,
            current_section: String::new(),
            position: GeoPoint { latitude: 0.0, longitude: 0.0 },
            delay_minutes: 0,
            eta_next_station: now,
            speed_kmh: 0.0,
            direction: Direction::Up,
            consist: TrainConsist::default(),
            status: TrainStatus::Scheduled,
            route,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn is_delayed(&self) -> bool {
        self.delay_minutes > 0
    }

    pub fn priority_value(&self) -> u8 {
        self.priority.value()
    }

    pub fn update_position(&mut self, position: GeoPoint, speed: f32) {
        self.position = position;
        self.speed_kmh = speed;
        self.updated_at = Utc::now();
    }

    pub fn add_delay(&mut self, delay: i32) {
        self.delay_minutes += delay;
        if self.delay_minutes > 0 {
            self.status = TrainStatus::Delayed;
        }
        self.updated_at = Utc::now();
    }
}

impl Default for TrainConsist {
    fn default() -> Self {
        Self {
            locomotive_type: "WDM-3A".to_string(),
            total_coaches: 12,
            passenger_coaches: 12,
            freight_wagons: 0,
            total_length_meters: 300.0,
            max_speed_kmh: 110.0,
        }
    }
}
