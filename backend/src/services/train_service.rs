use super::*;
use std::collections::{HashMap, BTreeMap};
use chrono::{DateTime, Utc, Duration};

#[derive(Debug)]
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

    pub async fn update_train(&self, train_id: &str, updated_train: Train) -> ServiceResult<Train> {
        // Validate the updated train data
        self.validate_train(&updated_train)?;
        
        // Check if the train exists
        let _existing_train = self.get_train(train_id).await?;
        
        // If train number is being changed, check for conflicts
        let existing_with_number = self.get_train_by_number(updated_train.train_number).await?;
        if let Some(existing) = existing_with_number {
            if existing.id != train_id {
                return Err(ServiceError::Conflict(
                    format!("Train number {} is already in use by another train", updated_train.train_number)
                ));
            }
        }
        
        let mut train = updated_train;
        train.id = train_id.to_string();
        train.updated_at = Utc::now();
        
        self.db.update_train(train_id, &train).await?;
        
        info!("Updated train: {} ({})", train.name, train_id);
        
        Ok(train)
    }

    pub async fn delete_train(&self, train_id: &str) -> ServiceResult<()> {
        // Check if train exists first
        let train = self.get_train(train_id).await?;
        
        // Check if train can be safely deleted (e.g., not currently running)
        if train.status == TrainStatus::Running {
            return Err(ServiceError::Validation(
                "Cannot delete a train that is currently running".to_string()
            ));
        }
        
        // Delete the train from database
        let deleted = self.db.delete_train(train_id).await
            .map_err(|e| ServiceError::Database(e))?;
        
        if !deleted {
            return Err(ServiceError::NotFound(format!("Train not found: {}", train_id)));
        }
        
        info!("Deleted train: {} ({})", train.name, train_id);
        
        Ok(())
    }

    pub async fn get_all_trains_paginated(&self, page: Option<usize>, per_page: Option<usize>) -> ServiceResult<(Vec<Train>, usize)> {
        // Get all trains from database
        let all_trains = self.db.get_all_trains().await
            .map_err(|e| ServiceError::Database(e))?;
        
        let total_count = all_trains.len();
        
        // Apply pagination
        let page = page.unwrap_or(1).max(1);
        let per_page = per_page.unwrap_or(50).min(100).max(1); // Limit to 100 max
        
        let start = (page - 1) * per_page;
        let end = (start + per_page).min(total_count);
        
        let paginated_trains = if start < total_count {
            all_trains[start..end].to_vec()
        } else {
            Vec::new()
        };
        
        Ok((paginated_trains, total_count))
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

    // ============================================================================
    // Enhanced Monitoring Features
    // ============================================================================

    /// Get trains with advanced filtering and performance analytics
    pub async fn get_trains_with_analytics(&self, filters: &TrainFilters) -> ServiceResult<TrainAnalyticsResponse> {
        let mut trains = self.get_active_trains().await?;
        
        // Apply filters
        if let Some(status) = &filters.status {
            trains.retain(|t| &t.status == status);
        }
        
        if let Some(priority) = &filters.priority {
            trains.retain(|t| &t.priority == priority);
        }
        
        if let Some(section_id) = &filters.section_id {
            trains.retain(|t| t.current_section == *section_id);
        }
        
        if filters.delayed_only {
            trains.retain(|t| t.is_delayed());
        }
        
        if let Some(min_speed) = filters.min_speed {
            trains.retain(|t| t.speed_kmh >= min_speed);
        }
        
        if let Some(max_speed) = filters.max_speed {
            trains.retain(|t| t.speed_kmh <= max_speed);
        }
        
        // Calculate analytics
        let analytics = self.calculate_performance_analytics(&trains).await?;
        
        // Apply sorting
        if let Some(sort_by) = &filters.sort_by {
            match sort_by.as_str() {
                "delay" => trains.sort_by(|a, b| b.delay_minutes.cmp(&a.delay_minutes)),
                "speed" => trains.sort_by(|a, b| b.speed_kmh.partial_cmp(&a.speed_kmh).unwrap_or(std::cmp::Ordering::Equal)),
                "priority" => trains.sort_by(|a, b| a.priority.cmp(&b.priority)),
                "updated_at" => trains.sort_by(|a, b| b.updated_at.cmp(&a.updated_at)),
                _ => trains.sort_by(|a, b| a.train_number.cmp(&b.train_number)),
            }
        }
        
        // Apply limit
        if let Some(limit) = filters.limit {
            trains.truncate(limit);
        }
        
        let total_count = trains.len();
        
        Ok(TrainAnalyticsResponse {
            trains,
            analytics,
            total_count,
            filters_applied: filters.clone(),
            timestamp: Utc::now(),
        })
    }

    /// Calculate advanced performance analytics for a set of trains
    pub async fn calculate_performance_analytics(&self, trains: &[Train]) -> ServiceResult<PerformanceAnalytics> {
        if trains.is_empty() {
            return Ok(PerformanceAnalytics::default());
        }
        
        let total_trains = trains.len();
        let delayed_trains = trains.iter().filter(|t| t.is_delayed()).count();
        let on_time_percentage = ((total_trains - delayed_trains) as f32 / total_trains as f32) * 100.0;
        
        let average_speed = trains.iter().map(|t| t.speed_kmh).sum::<f32>() / total_trains as f32;
        let max_speed = trains.iter().map(|t| t.speed_kmh).fold(0.0, f32::max);
        
        let total_delay = trains.iter().map(|t| t.delay_minutes).sum::<i32>();
        let average_delay = if delayed_trains > 0 {
            trains.iter().filter(|t| t.is_delayed()).map(|t| t.delay_minutes as f32).sum::<f32>() / delayed_trains as f32
        } else {
            0.0
        };
        
        // Status distribution
        let mut status_distribution = HashMap::new();
        for train in trains {
            *status_distribution.entry(train.status).or_insert(0) += 1;
        }
        
        // Priority distribution
        let mut priority_distribution = HashMap::new();
        for train in trains {
            *priority_distribution.entry(train.priority).or_insert(0) += 1;
        }
        
        // Section utilization
        let mut section_utilization = HashMap::new();
        for train in trains {
            *section_utilization.entry(train.current_section.clone()).or_insert(0) += 1;
        }
        
        Ok(PerformanceAnalytics {
            total_trains,
            delayed_trains,
            on_time_percentage,
            average_speed,
            max_speed,
            total_delay_minutes: total_delay,
            average_delay_minutes: average_delay,
            status_distribution,
            priority_distribution,
            section_utilization,
            timestamp: Utc::now(),
        })
    }

    /// Get real-time train position updates for monitoring dashboard
    pub async fn get_real_time_positions(&self) -> ServiceResult<Vec<TrainPositionUpdate>> {
        let trains = self.get_active_trains().await?;
        
        let updates = trains.into_iter().map(|train| {
            TrainPositionUpdate {
                train_id: train.id,
                train_number: train.train_number,
                name: train.name,
                position: train.position,
                speed_kmh: train.speed_kmh,
                direction: train.direction,
                status: train.status,
                delay_minutes: train.delay_minutes,
                current_section: train.current_section,
                updated_at: train.updated_at,
            }
        }).collect();
        
        Ok(updates)
    }

    /// Detect potential conflicts between trains
    pub async fn detect_train_conflicts(&self) -> ServiceResult<Vec<TrainConflict>> {
        let trains = self.get_active_trains().await?;
        let mut conflicts = Vec::new();
        
        // Check for trains in the same section moving towards each other
        for (i, train_a) in trains.iter().enumerate() {
            for train_b in trains.iter().skip(i + 1) {
                if train_a.current_section == train_b.current_section &&
                   train_a.direction != train_b.direction &&
                   train_a.speed_kmh > 0.0 && train_b.speed_kmh > 0.0 {
                    
                    let distance = self.calculate_distance(&train_a.position, &train_b.position);
                    let relative_speed = train_a.speed_kmh + train_b.speed_kmh;
                    let time_to_collision = if relative_speed > 0.0 {
                        distance / (relative_speed / 3.6) // Convert km/h to m/s
                    } else {
                        f32::INFINITY
                    };
                    
                    if time_to_collision < 300.0 { // Less than 5 minutes
                        conflicts.push(TrainConflict {
                            id: format!("{}-{}", train_a.id, train_b.id),
                            train_a_id: train_a.id.clone(),
                            train_b_id: train_b.id.clone(),
                            section_id: train_a.current_section.clone(),
                            conflict_type: ConflictType::HeadOn,
                            severity: if time_to_collision < 60.0 { ConflictSeverity::Critical } 
                                     else if time_to_collision < 180.0 { ConflictSeverity::High }
                                     else { ConflictSeverity::Medium },
                            estimated_time_to_conflict: time_to_collision,
                            distance_meters: distance,
                            relative_speed_kmh: relative_speed,
                            detected_at: Utc::now(),
                        });
                    }
                }
            }
        }
        
        Ok(conflicts)
    }

    /// Get historical performance data for a specific train
    pub async fn get_train_performance_history(&self, train_id: &str, hours: u32) -> ServiceResult<TrainPerformanceHistory> {
        let events = self.db.get_train_events(train_id, hours).await?;
        
        let mut speed_history = Vec::new();
        let mut delay_history = Vec::new();
        let mut position_history = Vec::new();
        
        for event in events {
            let timestamp = event.timestamp;
            
            if let Some(speed) = event.metadata.speed_kmh {
                speed_history.push(SpeedDataPoint {
                    timestamp,
                    speed_kmh: speed,
                });
            }
            
            if let Some(delay) = event.metadata.delay_minutes {
                delay_history.push(DelayDataPoint {
                    timestamp,
                    delay_minutes: delay,
                    reason: event.metadata.reason.clone(),
                });
            }
            
            position_history.push(PositionDataPoint {
                timestamp,
                position: event.location,
                section_id: event.section_id.clone(),
            });
        }
        
        Ok(TrainPerformanceHistory {
            train_id: train_id.to_string(),
            period_hours: hours,
            speed_history,
            delay_history,
            position_history,
            generated_at: Utc::now(),
        })
    }

    /// Get section-wise train density for capacity monitoring
    pub async fn get_section_density(&self) -> ServiceResult<Vec<SectionDensity>> {
        let trains = self.get_active_trains().await?;
        let mut section_counts = HashMap::new();
        
        for train in &trains {
            *section_counts.entry(train.current_section.clone()).or_insert(0) += 1;
        }
        
        let mut densities: Vec<SectionDensity> = Vec::new();
        for (section_id, train_count) in section_counts {
            // You would fetch actual section capacity from the database
            let capacity = 10; // Placeholder capacity
            let utilization = (train_count as f32 / capacity as f32) * 100.0;
            
            densities.push(SectionDensity {
                section_id,
                train_count,
                capacity,
                utilization_percentage: utilization,
                is_congested: utilization > 80.0,
                average_speed: trains.iter()
                    .filter(|t| t.current_section == densities.last().unwrap().section_id)
                    .map(|t| t.speed_kmh)
                    .sum::<f32>() / train_count.max(1) as f32,
            });
        }
        
        densities.sort_by(|a, b| b.utilization_percentage.partial_cmp(&a.utilization_percentage).unwrap_or(std::cmp::Ordering::Equal));
        Ok(densities)
    }

    /// Calculate distance between two geographic points (in meters)
    fn calculate_distance(&self, point1: &GeoPoint, point2: &GeoPoint) -> f32 {
        // Haversine formula for distance calculation
        let r = 6371000.0; // Earth's radius in meters
        let lat1_rad = point1.latitude.to_radians();
        let lat2_rad = point2.latitude.to_radians();
        let delta_lat = (point2.latitude - point1.latitude).to_radians();
        let delta_lng = (point2.longitude - point1.longitude).to_radians();
        
        let a = (delta_lat / 2.0).sin().powi(2) + 
                lat1_rad.cos() * lat2_rad.cos() * (delta_lng / 2.0).sin().powi(2);
        let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());
        
        (r * c) as f32
    }

    /// Generate alerts for train monitoring
    pub async fn generate_monitoring_alerts(&self) -> ServiceResult<Vec<TrainAlert>> {
        let trains = self.get_active_trains().await?;
        let mut alerts = Vec::new();
        
        for train in &trains {
            // Delay alerts
            if train.delay_minutes > 30 {
                alerts.push(TrainAlert {
                    id: format!("{}-delay", train.id),
                    train_id: train.id.clone(),
                    alert_type: AlertType::HighDelay,
                    severity: if train.delay_minutes > 60 { AlertSeverity::Critical } 
                             else if train.delay_minutes > 45 { AlertSeverity::High }
                             else { AlertSeverity::Medium },
                    message: format!("Train {} ({}) is delayed by {} minutes", 
                            train.name, train.train_number, train.delay_minutes),
                    current_section: train.current_section.clone(),
                    created_at: Utc::now(),
                });
            }
            
            // Speed alerts
            if train.speed_kmh > 120.0 {
                alerts.push(TrainAlert {
                    id: format!("{}-speed", train.id),
                    train_id: train.id.clone(),
                    alert_type: AlertType::ExcessiveSpeed,
                    severity: AlertSeverity::High,
                    message: format!("Train {} ({}) exceeding speed limit: {:.1} km/h", 
                            train.name, train.train_number, train.speed_kmh),
                    current_section: train.current_section.clone(),
                    created_at: Utc::now(),
                });
            }
            
            // Position update alerts (if train hasn't updated position in 10 minutes)
            let stale_threshold = Utc::now() - Duration::minutes(10);
            if train.updated_at < stale_threshold {
                alerts.push(TrainAlert {
                    id: format!("{}-stale", train.id),
                    train_id: train.id.clone(),
                    alert_type: AlertType::StaleData,
                    severity: AlertSeverity::Medium,
                    message: format!("Train {} ({}) hasn't updated position in {} minutes", 
                            train.name, train.train_number, 
                            (Utc::now() - train.updated_at).num_minutes()),
                    current_section: train.current_section.clone(),
                    created_at: Utc::now(),
                });
            }
        }
        
        Ok(alerts)
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

// ============================================================================
// Enhanced Monitoring Data Structures
// ============================================================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TrainFilters {
    pub status: Option<TrainStatus>,
    pub priority: Option<TrainPriority>,
    pub section_id: Option<String>,
    pub delayed_only: bool,
    pub min_speed: Option<f32>,
    pub max_speed: Option<f32>,
    pub sort_by: Option<String>,
    pub limit: Option<usize>,
}

#[derive(Debug, serde::Serialize)]
pub struct TrainAnalyticsResponse {
    pub trains: Vec<Train>,
    pub analytics: PerformanceAnalytics,
    pub total_count: usize,
    pub filters_applied: TrainFilters,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, serde::Serialize, Default)]
pub struct PerformanceAnalytics {
    pub total_trains: usize,
    pub delayed_trains: usize,
    pub on_time_percentage: f32,
    pub average_speed: f32,
    pub max_speed: f32,
    pub total_delay_minutes: i32,
    pub average_delay_minutes: f32,
    pub status_distribution: HashMap<TrainStatus, usize>,
    pub priority_distribution: HashMap<TrainPriority, usize>,
    pub section_utilization: HashMap<String, usize>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, serde::Serialize)]
pub struct TrainPositionUpdate {
    pub train_id: String,
    pub train_number: u32,
    pub name: String,
    pub position: GeoPoint,
    pub speed_kmh: f32,
    pub direction: Direction,
    pub status: TrainStatus,
    pub delay_minutes: i32,
    pub current_section: String,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, serde::Serialize)]
pub struct TrainConflict {
    pub id: String,
    pub train_a_id: String,
    pub train_b_id: String,
    pub section_id: String,
    pub conflict_type: ConflictType,
    pub severity: ConflictSeverity,
    pub estimated_time_to_conflict: f32, // seconds
    pub distance_meters: f32,
    pub relative_speed_kmh: f32,
    pub detected_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, serde::Serialize, serde::Deserialize, PartialEq)]
pub enum ConflictType {
    HeadOn,
    Overtaking,
    SameDirection,
    PlatformBlocking,
}

#[derive(Debug, Clone, Copy, serde::Serialize, serde::Deserialize, PartialEq)]
pub enum ConflictSeverity {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, serde::Serialize)]
pub struct TrainPerformanceHistory {
    pub train_id: String,
    pub period_hours: u32,
    pub speed_history: Vec<SpeedDataPoint>,
    pub delay_history: Vec<DelayDataPoint>,
    pub position_history: Vec<PositionDataPoint>,
    pub generated_at: DateTime<Utc>,
}

#[derive(Debug, serde::Serialize)]
pub struct SpeedDataPoint {
    pub timestamp: DateTime<Utc>,
    pub speed_kmh: f32,
}

#[derive(Debug, serde::Serialize)]
pub struct DelayDataPoint {
    pub timestamp: DateTime<Utc>,
    pub delay_minutes: i32,
    pub reason: Option<String>,
}

#[derive(Debug, serde::Serialize)]
pub struct PositionDataPoint {
    pub timestamp: DateTime<Utc>,
    pub position: GeoPoint,
    pub section_id: Option<String>,
}

#[derive(Debug, serde::Serialize)]
pub struct SectionDensity {
    pub section_id: String,
    pub train_count: usize,
    pub capacity: usize,
    pub utilization_percentage: f32,
    pub is_congested: bool,
    pub average_speed: f32,
}

#[derive(Debug, serde::Serialize)]
pub struct TrainAlert {
    pub id: String,
    pub train_id: String,
    pub alert_type: AlertType,
    pub severity: AlertSeverity,
    pub message: String,
    pub current_section: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, serde::Serialize, serde::Deserialize, PartialEq)]
pub enum AlertType {
    HighDelay,
    ExcessiveSpeed,
    StaleData,
    ConflictDetected,
    MaintenanceRequired,
    EmergencyStop,
}

#[derive(Debug, Clone, Copy, serde::Serialize, serde::Deserialize, PartialEq)]
pub enum AlertSeverity {
    Low,
    Medium,
    High,
    Critical,
}
