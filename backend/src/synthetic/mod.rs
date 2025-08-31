use std::sync::Arc;
use rand::Rng;
use chrono::{DateTime, Utc, Duration};
use crate::{models::*, database::Database};

pub mod train_generator;
pub mod section_generator; 
pub mod disruption_generator;

pub use train_generator::TrainGenerator;
pub use section_generator::SectionGenerator;
pub use disruption_generator::DisruptionGenerator;

/// Main synthetic data generator for the railway system
#[derive(Debug)]
pub struct SyntheticDataGenerator {
    pub train_generator: TrainGenerator,
    pub section_generator: SectionGenerator,
    pub disruption_generator: DisruptionGenerator,
    db: Arc<Database>,
}

#[derive(Debug, Clone)]
pub struct SyntheticDataConfig {
    pub train_count: usize,
    pub section_count: usize,
    pub disruption_probability: f32,
    pub time_horizon_hours: u32,
    pub delay_variance_minutes: i32,
    pub seed: Option<u64>,
}

impl Default for SyntheticDataConfig {
    fn default() -> Self {
        Self {
            train_count: 50,
            section_count: 20,
            disruption_probability: 0.15,
            time_horizon_hours: 24,
            delay_variance_minutes: 30,
            seed: None,
        }
    }
}

#[derive(Debug)]
pub struct SyntheticDataSet {
    pub trains: Vec<Train>,
    pub sections: Vec<RailwaySection>,
    pub events: Vec<Event>,
    pub disruptions: Vec<DisruptionEvent>,
    pub generated_at: DateTime<Utc>,
    pub config: SyntheticDataConfig,
}

impl SyntheticDataGenerator {
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            train_generator: TrainGenerator::new(),
            section_generator: SectionGenerator::new(),
            disruption_generator: DisruptionGenerator::new(),
            db,
        }
    }

    /// Generate a complete synthetic dataset for testing
    pub async fn generate_dataset(&self, config: SyntheticDataConfig) -> Result<SyntheticDataSet, Box<dyn std::error::Error>> {
        tracing::info!("Generating synthetic railway dataset with config: {:?}", config);

        // Set random seed if provided
        if let Some(seed) = config.seed {
            // TODO: Set global seed for reproducible testing
            tracing::info!("Using random seed: {}", seed);
        }

        // Generate railway sections first (needed for train routes)
        let sections = self.section_generator.generate_sections(config.section_count).await?;
        tracing::info!("Generated {} railway sections", sections.len());

        // Generate trains with routes through the sections
        let trains = self.train_generator.generate_trains_with_routes(config.train_count, &sections).await?;
        tracing::info!("Generated {} trains", trains.len());

        // Generate disruptions based on probability
        let disruptions = self.disruption_generator.generate_disruptions(
            &trains,
            &sections,
            config.disruption_probability,
            config.time_horizon_hours,
        ).await?;
        tracing::info!("Generated {} disruptions", disruptions.len());

        // Generate events based on trains and disruptions
        let events = self.generate_events(&trains, &disruptions, config.time_horizon_hours).await?;
        tracing::info!("Generated {} events", events.len());

        let dataset = SyntheticDataSet {
            trains,
            sections,
            events,
            disruptions,
            generated_at: Utc::now(),
            config,
        };

        tracing::info!("Synthetic dataset generation completed");
        Ok(dataset)
    }

    /// Load synthetic data into the database
    pub async fn load_dataset_to_db(&self, dataset: &SyntheticDataSet) -> Result<(), Box<dyn std::error::Error>> {
        tracing::info!("Loading synthetic dataset into database...");

        // TODO: Implement database loading
        // For now, just log the data that would be loaded
        tracing::info!("Would load {} trains, {} sections, {} events into database", 
                      dataset.trains.len(), dataset.sections.len(), dataset.events.len());

        tracing::info!("Dataset loaded successfully");
        Ok(())
    }

    /// Generate realistic test scenarios
    pub async fn generate_test_scenarios(&self) -> Result<Vec<TestScenario>, Box<dyn std::error::Error>> {
        let scenarios = vec![
            TestScenario {
                name: "Normal Operations".to_string(),
                description: "Standard railway operations with minimal delays".to_string(),
                config: SyntheticDataConfig {
                    train_count: 30,
                    section_count: 15,
                    disruption_probability: 0.05,
                    delay_variance_minutes: 10,
                    ..Default::default()
                },
            },
            TestScenario {
                name: "High Traffic".to_string(),
                description: "Peak hour traffic with increased congestion".to_string(),
                config: SyntheticDataConfig {
                    train_count: 80,
                    section_count: 25,
                    disruption_probability: 0.20,
                    delay_variance_minutes: 20,
                    ..Default::default()
                },
            },
            TestScenario {
                name: "Emergency Situation".to_string(),
                description: "Emergency with multiple disruptions and delays".to_string(),
                config: SyntheticDataConfig {
                    train_count: 40,
                    section_count: 20,
                    disruption_probability: 0.40,
                    delay_variance_minutes: 45,
                    ..Default::default()
                },
            },
            TestScenario {
                name: "Maintenance Window".to_string(),
                description: "Scheduled maintenance affecting multiple sections".to_string(),
                config: SyntheticDataConfig {
                    train_count: 25,
                    section_count: 12,
                    disruption_probability: 0.30,
                    delay_variance_minutes: 25,
                    ..Default::default()
                },
            },
        ];

        Ok(scenarios)
    }

    /// Generate realistic events based on trains and disruptions
    async fn generate_events(
        &self,
        trains: &[Train],
        disruptions: &[DisruptionEvent],
        time_horizon_hours: u32,
    ) -> Result<Vec<Event>, Box<dyn std::error::Error>> {
        let mut events = Vec::new();
        let mut rng = rand::thread_rng();

        let start_time = Utc::now();
        let _end_time = start_time + Duration::hours(time_horizon_hours as i64);

        // Generate train-related events
        for train in trains {
            let event_count = rng.gen_range(2..=6); // Each train generates 2-6 events

            for i in 0..event_count {
                let event_time = start_time + Duration::minutes(
                    rng.gen_range(0..(time_horizon_hours * 60)) as i64
                );

                let event_type = match i % 4 {
                    0 => EventType::TrainDeparture,
                    1 => EventType::TrainArrival,
                    2 => EventType::DelayReported,
                    3 => EventType::StatusUpdate,
                    _ => EventType::StatusUpdate,
                };

                let severity = match event_type {
                    EventType::DelayReported => {
                        if train.delay_minutes > 15 {
                            EventSeverity::High
                        } else if train.delay_minutes > 5 {
                            EventSeverity::Medium
                        } else {
                            EventSeverity::Low
                        }
                    },
                    _ => EventSeverity::Low,
                };

                events.push(Event {
                    id: uuid::Uuid::new_v4().to_string(),
                    event_type,
                    timestamp: event_time,
                    train_id: Some(train.id.clone()),
                    section_id: Some(train.current_section.clone()),
                    description: format!("Train {} - {:?}", train.train_number, event_type),
                    severity,
                    acknowledged: false,
                    metadata: serde_json::json!({
                        "train_number": train.train_number,
                        "train_name": train.name,
                        "delay_minutes": train.delay_minutes
                    }),
                    created_at: event_time,
                    updated_at: event_time,
                });
            }
        }

        // Generate disruption-related events
        for disruption in disruptions {
            let severity = match disruption.impact_level {
                1..=3 => EventSeverity::Low,
                4..=6 => EventSeverity::Medium,
                7..=8 => EventSeverity::High,
                _ => EventSeverity::Critical,
            };
            
            events.push(Event {
                id: uuid::Uuid::new_v4().to_string(),
                event_type: EventType::ConflictDetected,
                timestamp: disruption.start_time,
                train_id: disruption.affected_trains.first().cloned(),
                section_id: disruption.affected_sections.first().cloned(),
                description: format!("Disruption: {}", disruption.description),
                severity,
                acknowledged: false,
                metadata: serde_json::json!({
                    "disruption_type": disruption.disruption_type,
                    "impact_level": disruption.impact_level,
                    "affected_train_count": disruption.affected_trains.len(),
                    "affected_sections": disruption.affected_sections
                }),
                created_at: disruption.start_time,
                updated_at: disruption.start_time,
            });
        }

        // Sort events by timestamp
        events.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));

        Ok(events)
    }
}

#[derive(Debug, Clone)]
pub struct TestScenario {
    pub name: String,
    pub description: String,
    pub config: SyntheticDataConfig,
}

/// Utility functions for synthetic data generation
pub mod utils {
    use super::*;
    use rand::seq::SliceRandom;

    pub fn random_indian_station_name() -> String {
        let stations = [
            "New Delhi", "Mumbai Central", "Chennai Central", "Kolkata",
            "Bangalore", "Hyderabad", "Pune", "Ahmedabad", "Jaipur",
            "Lucknow", "Kanpur", "Nagpur", "Indore", "Bhopal", "Coimbatore",
            "Madurai", "Kochi", "Thiruvananthapuram", "Vijayawada", "Warangal",
            "Vizag", "Guwahati", "Patna", "Ranchi", "Bhubaneswar"
        ];
        
        let mut rng = rand::thread_rng();
        stations.choose(&mut rng).unwrap().to_string()
    }

    pub fn random_train_name(_train_number: u32) -> String {
        let prefixes = [
            "Rajdhani", "Shatabdi", "Duronto", "Garib Rath", "Jan Shatabdi",
            "Intercity", "Express", "Passenger", "Mail", "Special"
        ];
        
        let suffixes = [
            "Express", "SF Express", "Mail", "Passenger", "Local",
            "Fast", "Super Fast", "AC Express", "Jan Sadharan"
        ];

        let mut rng = rand::thread_rng();
        let prefix = prefixes.choose(&mut rng).unwrap();
        let suffix = suffixes.choose(&mut rng).unwrap();

        format!("{} {}", prefix, suffix)
    }

    pub fn random_coordinates_india() -> GeoPoint {
        let mut rng = rand::thread_rng();
        
        // Rough bounding box for India
        let lat_min = 8.0;
        let lat_max = 37.0;
        let lng_min = 68.0;
        let lng_max = 97.0;

        GeoPoint {
            latitude: rng.gen_range(lat_min..=lat_max),
            longitude: rng.gen_range(lng_min..=lng_max),
        }
    }
}
