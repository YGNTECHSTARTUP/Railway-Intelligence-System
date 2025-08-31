use std::sync::Arc;
use tracing::{info, error, warn, debug};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use reqwest::Client;
use std::collections::HashMap;
use rand::{seq::SliceRandom, Rng};

use crate::{models::*, database::Database};
use super::{Service, ServiceResult};

#[derive(Debug, Clone)]
pub struct IngestionService {
    db: Arc<Database>,
    http_client: Client,
    config: IngestionConfig,
}

use crate::config::IngestionConfig;

#[derive(Debug, Serialize, Deserialize)]
pub struct IncomingTrainData {
    pub train_number: u32,
    pub current_station: String,
    pub delay_minutes: i32,
    pub speed_kmh: f32,
    pub latitude: f64,
    pub longitude: f64,
    pub timestamp: DateTime<Utc>,
    pub status: String,
    pub next_station: Option<String>,
    pub eta_next_station: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IncomingStationData {
    pub station_code: String,
    pub station_name: String,
    pub platform_count: u32,
    pub current_occupancy: u32,
    pub trains_in_station: Vec<String>,
    pub delays_reported: u32,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DataIngestionReport {
    pub trains_processed: u32,
    pub stations_processed: u32,
    pub events_generated: u32,
    pub errors_encountered: u32,
    pub processing_time_ms: u64,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IngestionStats {
    pub total_records_processed: u64,
    pub successful_ingestions: u64,
    pub failed_ingestions: u64,
    pub average_processing_time_ms: f64,
    pub last_ingestion: Option<DateTime<Utc>>,
    pub uptime_hours: f64,
}

impl IngestionService {
    pub fn new(db: Arc<Database>) -> Self {
        let config = crate::config::IngestionConfig {
            enabled: true,
            external_apis: vec![
                crate::config::ExternalApiConfig {
                    name: "trains".to_string(),
                    url: "https://api.indianrailway.gov.in/trains/live".to_string(),
                    api_key: None,
                    timeout_seconds: 10,
                    enabled: false, // Default to false for mock mode
                },
                crate::config::ExternalApiConfig {
                    name: "stations".to_string(),
                    url: "https://api.indianrailway.gov.in/stations/status".to_string(),
                    api_key: None,
                    timeout_seconds: 10,
                    enabled: false,
                },
            ],
            polling_interval_seconds: 30,
            batch_size: 100,
            retry_attempts: 3,
            retry_delay_seconds: 5,
        };
        
        Self {
            db,
            http_client: Client::builder()
                .timeout(std::time::Duration::from_secs(10))
                .build()
                .expect("Failed to create HTTP client"),
            config,
        }
    }

    pub fn with_config(db: Arc<Database>, config: IngestionConfig) -> Self {
        // Use the first enabled API's timeout, or default to 10 seconds
        let timeout_seconds = config.external_apis
            .iter()
            .find(|api| api.enabled)
            .map(|api| api.timeout_seconds)
            .unwrap_or(10);
            
        Self {
            db,
            http_client: Client::builder()
                .timeout(std::time::Duration::from_secs(timeout_seconds))
                .build()
                .expect("Failed to create HTTP client"),
            config,
        }
    }

    /// Start continuous data ingestion from configured APIs
    pub async fn start_continuous_ingestion(&self) -> ServiceResult<()> {
        info!("Starting continuous data ingestion...");

        let mut interval = tokio::time::interval(
            std::time::Duration::from_secs(self.config.polling_interval_seconds)
        );

        loop {
            interval.tick().await;
            
            match self.perform_single_ingestion().await {
                Ok(report) => {
                    info!("Ingestion completed: {} trains, {} stations processed", 
                          report.trains_processed, report.stations_processed);
                    debug!("Ingestion report: {:?}", report);
                },
                Err(e) => {
                    error!("Ingestion failed: {:?}", e);
                    // Continue polling even if one iteration fails
                }
            }
        }
    }

    /// Perform a single ingestion cycle
    pub async fn perform_single_ingestion(&self) -> ServiceResult<DataIngestionReport> {
        let start_time = std::time::Instant::now();
        info!("Starting single ingestion cycle");

        let mut trains_processed = 0;
        let mut stations_processed = 0;
        let mut events_generated = 0;
        let mut errors_encountered = 0;

        // Ingest train data
        match self.ingest_train_data().await {
            Ok(count) => {
                trains_processed = count;
                info!("Successfully processed {} trains", count);
            },
            Err(e) => {
                error!("Failed to ingest train data: {:?}", e);
                errors_encountered += 1;
            }
        }

        // Ingest station data
        match self.ingest_station_data().await {
            Ok(count) => {
                stations_processed = count;
                info!("Successfully processed {} stations", count);
            },
            Err(e) => {
                error!("Failed to ingest station data: {:?}", e);
                errors_encountered += 1;
            }
        }

        // Generate events based on ingested data
        match self.generate_events().await {
            Ok(count) => {
                events_generated = count;
                debug!("Generated {} events", count);
            },
            Err(e) => {
                warn!("Failed to generate some events: {:?}", e);
                errors_encountered += 1;
            }
        }

        let processing_time_ms = start_time.elapsed().as_millis() as u64;

        Ok(DataIngestionReport {
            trains_processed,
            stations_processed,
            events_generated,
            errors_encountered,
            processing_time_ms,
            timestamp: Utc::now(),
        })
    }

    /// Ingest real-time train data from external APIs
    async fn ingest_train_data(&self) -> ServiceResult<u32> {
        info!("Ingesting train data...");

        // For now, generate mock data. In production, this would call actual APIs
        let mock_data = self.generate_mock_train_data().await?;
        let mut processed_count = 0;

        for train_data in mock_data {
            match self.process_incoming_train_data(train_data).await {
                Ok(_) => processed_count += 1,
                Err(e) => {
                    warn!("Failed to process train data: {:?}", e);
                }
            }
        }

        Ok(processed_count)
    }

    /// Ingest station status data
    async fn ingest_station_data(&self) -> ServiceResult<u32> {
        info!("Ingesting station data...");

        // Generate mock station data
        let mock_stations = self.generate_mock_station_data().await?;
        let mut processed_count = 0;

        for station_data in mock_stations {
            match self.process_incoming_station_data(station_data).await {
                Ok(_) => processed_count += 1,
                Err(e) => {
                    warn!("Failed to process station data: {:?}", e);
                }
            }
        }

        Ok(processed_count)
    }

    /// Generate events based on processed data
    async fn generate_events(&self) -> ServiceResult<u32> {
        debug!("Generating events from ingested data...");

        // Get recent trains that might need events
        let trains = self.db.get_active_trains().await
            .map_err(|e| super::ServiceError::Database(e))?;

        let mut events_generated = 0;

        for train in trains {
            // Generate delay events for delayed trains
            if train.is_delayed() {
                let event = TrainEvent::new(
                    train.id.clone(),
                    TrainEventType::Delay,
                    train.position,
                ).with_delay(train.delay_minutes);

                match self.db.create_train_event(&event).await {
                    Ok(_) => events_generated += 1,
                    Err(e) => warn!("Failed to create delay event: {:?}", e),
                }
            }

            // Generate speed change events for moving trains
            if train.speed_kmh > 0.0 {
                let event = TrainEvent::new(
                    train.id.clone(),
                    TrainEventType::SpeedChange,
                    train.position,
                ).with_speed(train.speed_kmh);

                match self.db.create_train_event(&event).await {
                    Ok(_) => events_generated += 1,
                    Err(e) => debug!("Failed to create speed event: {:?}", e),
                }
            }
        }

        Ok(events_generated)
    }

    /// Process incoming train data and update database
    async fn process_incoming_train_data(&self, data: IncomingTrainData) -> ServiceResult<()> {
        // Check if train exists
        let existing_trains = self.db.get_active_trains().await
            .map_err(|e| super::ServiceError::Database(e))?;

        let existing_train = existing_trains.iter()
            .find(|t| t.train_number == data.train_number);

        match existing_train {
            Some(train) => {
                // Update existing train
                let mut updated_train = train.clone();
                updated_train.position = GeoPoint {
                    latitude: data.latitude,
                    longitude: data.longitude,
                };
                updated_train.speed_kmh = data.speed_kmh;
                updated_train.delay_minutes = data.delay_minutes;
                updated_train.status = self.parse_train_status(&data.status);
                updated_train.updated_at = Utc::now();

                self.db.update_train(&train.id, &updated_train).await
                    .map_err(|e| super::ServiceError::Database(e))?;

                debug!("Updated train {}: {}", train.train_number, train.name);
            },
            None => {
                // Create new train from incoming data
                let new_train = self.create_train_from_data(data).await?;
                self.db.create_train(&new_train).await
                    .map_err(|e| super::ServiceError::Database(e))?;

                info!("Created new train from incoming data: {}", new_train.train_number);
            }
        }

        Ok(())
    }

    /// Process incoming station data
    async fn process_incoming_station_data(&self, data: IncomingStationData) -> ServiceResult<()> {
        debug!("Processing station data for: {}", data.station_code);

        // TODO: Implement station data processing
        // This would involve updating station occupancy, platform availability, etc.
        
        Ok(())
    }

    /// Generate mock train data for testing/demo purposes
    async fn generate_mock_train_data(&self) -> ServiceResult<Vec<IncomingTrainData>> {
        let train_numbers = vec![12249, 12648, 12951, 12723, 22691];
        let stations = vec!["NDLS", "GZB", "AGC", "JHS", "BPL"];
        let mut mock_data = Vec::new();
        let mut rng = rand::thread_rng();

        for &train_number in &train_numbers {
            let station = stations.choose(&mut rng).unwrap();
            let base_lat = 28.6 + (rng.gen::<f64>() * 10.0); // Random Indian coordinates
            let base_lng = 77.2 + (rng.gen::<f64>() * 15.0);
            
            let data = IncomingTrainData {
                train_number,
                current_station: station.to_string(),
                delay_minutes: rng.gen_range(-5..=45), // Can be negative (early) or positive (late)
                speed_kmh: rng.gen_range(0.0..=120.0),
                latitude: base_lat,
                longitude: base_lng,
                timestamp: Utc::now(),
                status: ["Running", "Delayed", "AtStation", "Scheduled"].choose(&mut rng).unwrap().to_string(),
                next_station: stations.choose(&mut rng).map(|s| s.to_string()),
                eta_next_station: Some(Utc::now() + chrono::Duration::minutes(rng.gen_range(15..=120))),
            };
            
            mock_data.push(data);
        }

        Ok(mock_data)
    }

    /// Generate mock station data
    async fn generate_mock_station_data(&self) -> ServiceResult<Vec<IncomingStationData>> {
        let stations = vec![
            ("NDLS", "New Delhi", 16),
            ("GZB", "Ghaziabad", 8),
            ("AGC", "Agra Cantonment", 6),
            ("JHS", "Jhansi Junction", 7),
            ("BPL", "Bhopal Junction", 10),
        ];
        
        let mut mock_data = Vec::new();
        let mut rng = rand::thread_rng();

        for (code, name, platforms) in stations {
            let occupancy = rng.gen_range(0..=platforms);
            let delays = rng.gen_range(0..=5);
            
            let data = IncomingStationData {
                station_code: code.to_string(),
                station_name: name.to_string(),
                platform_count: platforms,
                current_occupancy: occupancy,
                trains_in_station: (0..occupancy).map(|i| format!("T{:05}", 10000 + i)).collect(),
                delays_reported: delays,
                timestamp: Utc::now(),
            };
            
            mock_data.push(data);
        }

        Ok(mock_data)
    }

    /// Create a train object from incoming data
    async fn create_train_from_data(&self, data: IncomingTrainData) -> ServiceResult<Train> {
        let train_name = format!("Train {}", data.train_number);
        let route = vec![data.current_station.clone()];
        
        let mut train = Train::new(
            data.train_number,
            train_name,
            TrainPriority::Passenger, // Default priority
            route,
        );
        
        train.position = GeoPoint {
            latitude: data.latitude,
            longitude: data.longitude,
        };
        train.speed_kmh = data.speed_kmh;
        train.delay_minutes = data.delay_minutes;
        train.status = self.parse_train_status(&data.status);
        
        if let Some(eta) = data.eta_next_station {
            train.eta_next_station = eta;
        }

        Ok(train)
    }

    /// Parse string status to TrainStatus enum
    fn parse_train_status(&self, status: &str) -> TrainStatus {
        match status.to_lowercase().as_str() {
            "running" => TrainStatus::Running,
            "delayed" => TrainStatus::Delayed,
            "atstation" | "at_station" => TrainStatus::AtStation,
            "scheduled" => TrainStatus::Scheduled,
            "terminated" => TrainStatus::Terminated,
            "cancelled" => TrainStatus::Cancelled,
            _ => TrainStatus::Scheduled, // Default
        }
    }

    /// Get ingestion statistics
    pub async fn get_ingestion_stats(&self) -> ServiceResult<IngestionStats> {
        // TODO: Implement actual stats tracking
        // For now, return mock stats
        Ok(IngestionStats {
            total_records_processed: 1250,
            successful_ingestions: 1195,
            failed_ingestions: 55,
            average_processing_time_ms: 125.5,
            last_ingestion: Some(Utc::now()),
            uptime_hours: 24.5,
        })
    }

    /// Manual trigger for data ingestion (for testing/admin purposes)
    pub async fn trigger_manual_ingestion(&self) -> ServiceResult<DataIngestionReport> {
        info!("Manual ingestion triggered");
        self.perform_single_ingestion().await
    }

    /// Health check for external APIs
    pub async fn check_api_health(&self) -> ServiceResult<HashMap<String, bool>> {
        let mut health_status = HashMap::new();
        
        for api in &self.config.external_apis {
            if !api.enabled {
                // Skip disabled APIs
                health_status.insert(api.name.clone(), false);
                continue;
            }
            
            let is_healthy = match self.http_client.get(&api.url).send().await {
                Ok(response) => response.status().is_success(),
                Err(_) => false,
            };
            
            health_status.insert(api.name.clone(), is_healthy);
            
            if is_healthy {
                debug!("API {} is healthy", api.name);
            } else {
                warn!("API {} is not responding", api.name);
            }
        }
        
        Ok(health_status)
    }
}

impl Service for IngestionService {
    fn name(&self) -> &'static str {
        "IngestionService"
    }
}

