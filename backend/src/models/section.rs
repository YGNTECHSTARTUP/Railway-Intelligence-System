use super::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Section {
    pub id: String,
    pub name: String,
    pub from_station: String,
    pub to_station: String,
    pub track_type: TrackType,
    pub capacity: u32,
    pub current_trains: Vec<String>,
    pub signal_blocks: Vec<Block>,
    pub distance_km: f32,
    pub speed_limit_kmh: f32,
    pub maintenance_blocks: Vec<MaintenanceBlock>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Block {
    pub id: String,
    pub section_id: String,
    pub name: String,
    pub start_position: GeoPoint,
    pub end_position: GeoPoint,
    pub length_meters: f32,
    pub occupied_by: Option<String>, // Train ID
    pub signal_status: SignalStatus,
    pub last_updated: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaintenanceBlock {
    pub id: String,
    pub section_id: String,
    pub block_type: String,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub description: String,
    pub affects_capacity: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SectionState {
    pub section_id: String,
    pub capacity: u32,
    pub current_occupancy: u32,
    pub signal_status: SignalStatus,
    pub weather_condition: WeatherType,
    pub maintenance_blocks: Vec<MaintenanceBlock>,
    pub active_trains: Vec<String>,
    pub conflicts: Vec<ConflictEvent>,
    pub utilization_percent: f32,
    pub last_updated: DateTime<Utc>,
}

impl Section {
    pub fn new(
        name: String,
        from_station: String,
        to_station: String,
        track_type: TrackType,
        distance_km: f32,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            from_station,
            to_station,
            track_type,
            capacity: match track_type {
                TrackType::Single => 1,
                TrackType::Double => 2,
                TrackType::Multiple => 4,
            },
            current_trains: Vec::new(),
            signal_blocks: Vec::new(),
            distance_km,
            speed_limit_kmh: 100.0,
            maintenance_blocks: Vec::new(),
            created_at: now,
            updated_at: now,
        }
    }

    pub fn is_at_capacity(&self) -> bool {
        self.current_trains.len() as u32 >= self.capacity
    }

    pub fn add_train(&mut self, train_id: String) -> bool {
        if !self.is_at_capacity() && !self.current_trains.contains(&train_id) {
            self.current_trains.push(train_id);
            self.updated_at = Utc::now();
            true
        } else {
            false
        }
    }

    pub fn remove_train(&mut self, train_id: &str) -> bool {
        if let Some(pos) = self.current_trains.iter().position(|x| x == train_id) {
            self.current_trains.remove(pos);
            self.updated_at = Utc::now();
            true
        } else {
            false
        }
    }

    pub fn utilization(&self) -> f32 {
        (self.current_trains.len() as f32 / self.capacity as f32) * 100.0
    }
}
