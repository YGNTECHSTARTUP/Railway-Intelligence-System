use super::*;
use std::collections::HashMap;

pub struct TrainService {
    db: Arc<Database>,
}

impl TrainService {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    pub async fn create_train(&self, train: Train) -> ServiceResult<String> {
        // Validate train data
        self.validate_train(&train)?;
        
        // Check if train number already exists
        if let Ok(existing) = self.get_train_by_number(train.train_number).await {
            if existing.is_some() {
                return Err(ServiceError::Conflict(
                    format!("Train number {} already exists", train.train_number)
                ));
            }
        }

        let train_id = self.db.create_train(&train).await?;
        info!("Created train: {} ({})", train.name, train_id);
        
        Ok(train_id)
    }

    pub async fn get_train(&self, train_id: &str) -> ServiceResult<Train> {
        self.db.get_train(train_id).await?
            .ok_or_else(|| ServiceError::NotFound(format!("Train not found: {}", train_id)))
    }

    pub async fn get_train_by_number(&self, train_number: u32) -> ServiceResult<Option<Train>> {
        // This would require a custom query in the database layer
        // For now, we'll implement a basic version
        let trains = self.db.get_active_trains().await?;
        Ok(trains.into_iter().find(|t| t.train_number == train_number))
    }

    pub async fn update_train_position(&self, train_id: &str, position: GeoPoint, speed: f32) -> ServiceResult<()> {
        let mut train = self.get_train(train_id).await?;
        train.update_position(position, speed);
        
        self.db.update_train(train_id, &train).await?;
        
        // Create train event
        let event = TrainEvent::new(
            train_id.to_string(),
            TrainEventType::SpeedChange,
            position,
        ).with_speed(speed);
        
        self.db.create_train_event(&event).await?;
        
        info!("Updated train {} position: lat={}, lng={}, speed={}", 
              train_id, position.latitude, position.longitude, speed);
        
        Ok(())
    }

    pub async fn add_train_delay(&self, train_id: &str, delay: i32, reason: Option<String>) -> ServiceResult<()> {
        let mut train = self.get_train(train_id).await?;
        train.add_delay(delay);
        
        self.db.update_train(train_id, &train).await?;
        
        // Create delay event
        let mut event = TrainEvent::new(
            train_id.to_string(),
            TrainEventType::Delay,
            train.position,
        ).with_delay(delay);
        
        if let Some(reason) = reason {
            event.metadata.reason = Some(reason);
        }
        
        self.db.create_train_event(&event).await?;
        
        warn!("Added delay to train {}: {} minutes", train_id, delay);
        
        Ok(())
    }

    pub async fn get_trains_in_section(&self, section_id: &str) -> ServiceResult<Vec<Train>> {
        Ok(self.db.get_trains_in_section(section_id).await?)
    }

    pub async fn get_active_trains(&self) -> ServiceResult<Vec<Train>> {
        Ok(self.db.get_active_trains().await?)
    }

    pub async fn move_train_to_section(&self, train_id: &str, new_section_id: &str) -> ServiceResult<()> {
        let mut train = self.get_train(train_id).await?;
        let old_section = train.current_section.clone();
        train.current_section = new_section_id.to_string();
        train.updated_at = chrono::Utc::now();
        
        self.db.update_train(train_id, &train).await?;
        
        info!("Moved train {} from section {} to section {}", 
              train_id, old_section, new_section_id);
        
        Ok(())
    }

    pub async fn get_trains_by_priority(&self, priority: TrainPriority) -> ServiceResult<Vec<Train>> {
        let trains = self.get_active_trains().await?;
        Ok(trains.into_iter().filter(|t| t.priority == priority).collect())
    }

    pub async fn get_delayed_trains(&self, min_delay: i32) -> ServiceResult<Vec<Train>> {
        let trains = self.get_active_trains().await?;
        Ok(trains.into_iter().filter(|t| t.delay_minutes >= min_delay).collect())
    }

    // Methods used by API
    pub async fn get_all_trains(&self) -> ServiceResult<Vec<Train>> {
        self.get_active_trains().await
    }

    pub async fn get_train_by_id(&self, train_id: &str) -> ServiceResult<Option<Train>> {
        match self.get_train(train_id).await {
            Ok(train) => Ok(Some(train)),
            Err(ServiceError::NotFound(_)) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub async fn update_train_status(&self, train_id: &str, update_request: crate::api::trains::TrainUpdateRequest) -> ServiceResult<Train> {
        let mut train = self.get_train(train_id).await?;

        if let Some(position) = update_request.position {
            train.position = position;
        }

        if let Some(speed) = update_request.speed_kmh {
            train.speed_kmh = speed;
        }

        if let Some(delay) = update_request.delay_minutes {
            train.delay_minutes = delay;
            if delay > 0 {
                train.status = TrainStatus::Delayed;
            }
        }

        if let Some(status) = update_request.status {
            train.status = status;
        }

        if let Some(section) = update_request.current_section {
            train.current_section = section;
        }

        train.updated_at = chrono::Utc::now();
        
        self.db.update_train(train_id, &train).await?;
        
        Ok(train)
    }

    pub async fn calculate_train_statistics(&self) -> ServiceResult<TrainStatistics> {
        let trains = self.get_active_trains().await?;
        
        let total_trains = trains.len() as u32;
        let delayed_trains = trains.iter().filter(|t| t.is_delayed()).count() as u32;
        let average_delay = if delayed_trains > 0 {
            trains.iter()
                .filter(|t| t.is_delayed())
                .map(|t| t.delay_minutes as f32)
                .sum::<f32>() / delayed_trains as f32
        } else {
            0.0
        };

        let mut priority_counts = HashMap::new();
        for train in &trains {
            *priority_counts.entry(train.priority).or_insert(0) += 1;
        }

        Ok(TrainStatistics {
            total_active_trains: total_trains,
            delayed_trains,
            on_time_trains: total_trains - delayed_trains,
            average_delay_minutes: average_delay,
            priority_breakdown: priority_counts,
        })
    }

    fn validate_train(&self, train: &Train) -> ServiceResult<()> {
        if train.train_number == 0 {
            return Err(ServiceError::Validation("Train number cannot be zero".to_string()));
        }

        if train.name.is_empty() {
            return Err(ServiceError::Validation("Train name cannot be empty".to_string()));
        }

        if train.route.is_empty() {
            return Err(ServiceError::Validation("Train route cannot be empty".to_string()));
        }

        Ok(())
    }
}

impl Service for TrainService {
    fn name(&self) -> &'static str {
        "TrainService"
    }
}

#[derive(Debug, serde::Serialize)]
pub struct TrainStatistics {
    pub total_active_trains: u32,
    pub delayed_trains: u32,
    pub on_time_trains: u32,
    pub average_delay_minutes: f32,
    pub priority_breakdown: HashMap<TrainPriority, u32>,
}
