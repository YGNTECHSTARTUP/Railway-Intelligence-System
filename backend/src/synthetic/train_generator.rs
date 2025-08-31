use rand::{Rng, seq::SliceRandom};
use chrono::{DateTime, Utc, Duration};
use crate::models::*;
use super::utils::*;

#[derive(Debug)]
pub struct TrainGenerator {
    // Configuration for train generation
}

impl TrainGenerator {
    pub fn new() -> Self {
        Self {}
    }

    /// Generate trains with realistic routes through the given sections
    pub async fn generate_trains_with_routes(
        &self,
        count: usize,
        sections: &[RailwaySection],
    ) -> Result<Vec<Train>, Box<dyn std::error::Error>> {
        let mut trains = Vec::with_capacity(count);
        let mut rng = rand::thread_rng();

        for i in 0..count {
            let train_number = 10000 + (i as u32) + rng.gen_range(0..=9999);
            let train_name = random_train_name(train_number);
            
            // Assign random priority based on train type
            let priority = self.determine_priority(&train_name);
            
            // Generate a route through 2-6 sections
            let route_sections = self.generate_route(sections, &mut rng)?;
            let route: Vec<String> = route_sections.iter()
                .map(|s| s.id.clone())
                .collect();

            let current_section = route_sections.first()
                .map(|s| s.id.clone())
                .unwrap_or_else(|| "UNKNOWN".to_string());

            // Create base train
            let mut train = Train::new(train_number, train_name, priority, route);

            // Set current section and position
            train.current_section = current_section;
            if let Some(section) = route_sections.first() {
                train.position = section.start_coordinates;
            }

            // Randomize current status
            train.status = self.random_train_status(&mut rng);
            
            // Generate realistic delays
            train.delay_minutes = self.generate_delay(&train.priority, &mut rng);
            if train.delay_minutes > 0 {
                train.status = TrainStatus::Delayed;
            }

            // Set realistic speed
            train.speed_kmh = self.generate_speed(&train.status, &train.consist, &mut rng);

            // Set realistic ETA
            train.eta_next_station = self.calculate_eta(&train, &mut rng);

            // Customize train consist based on type
            train.consist = self.generate_consist(&train.name, &mut rng);

            trains.push(train);
        }

        Ok(trains)
    }

    /// Generate a realistic route through sections
    fn generate_route<'a>(
        &self,
        sections: &'a [RailwaySection],
        rng: &mut impl Rng,
    ) -> Result<Vec<&'a RailwaySection>, Box<dyn std::error::Error>> {
        if sections.is_empty() {
            return Err("No sections available for route generation".into());
        }

        let max_route_length = 6.min(sections.len());
        let route_length = if max_route_length < 2 {
            1 // If we have less than 2 sections, use 1
        } else {
            rng.gen_range(2..=max_route_length)
        };
        let mut route = Vec::with_capacity(route_length);

        // Pick a random starting section
        let start_section = sections.choose(rng).unwrap();
        route.push(start_section);

        // Add subsequent sections (simplified - in reality would consider connectivity)
        for _ in 1..route_length {
            let next_section = sections.choose(rng).unwrap();
            // Avoid immediate duplicates
            if !route.iter().any(|&s| s.id == next_section.id) {
                route.push(next_section);
            }
        }

        Ok(route)
    }

    /// Determine train priority based on name/type
    fn determine_priority(&self, train_name: &str) -> TrainPriority {
        if train_name.contains("Rajdhani") || train_name.contains("Emergency") {
            TrainPriority::Emergency
        } else if train_name.contains("Mail") {
            TrainPriority::Mail
        } else if train_name.contains("Express") || train_name.contains("Shatabdi") {
            TrainPriority::Express
        } else if train_name.contains("Passenger") || train_name.contains("Jan") {
            TrainPriority::Passenger
        } else if train_name.contains("Freight") {
            TrainPriority::Freight
        } else {
            TrainPriority::Passenger // Default
        }
    }

    /// Generate random train status
    fn random_train_status(&self, rng: &mut impl Rng) -> TrainStatus {
        let statuses = [
            TrainStatus::Running,
            TrainStatus::Running,
            TrainStatus::Running, // More likely to be running
            TrainStatus::AtStation,
            TrainStatus::Delayed,
            TrainStatus::Scheduled,
        ];
        
        *statuses.choose(rng).unwrap()
    }

    /// Generate realistic delay based on priority
    fn generate_delay(&self, priority: &TrainPriority, rng: &mut impl Rng) -> i32 {
        let base_delay = match priority {
            TrainPriority::Emergency => rng.gen_range(0..=2),
            TrainPriority::Mail => rng.gen_range(0..=5),
            TrainPriority::Express => rng.gen_range(0..=15),
            TrainPriority::Passenger => rng.gen_range(0..=30),
            TrainPriority::Freight => rng.gen_range(0..=60),
            TrainPriority::Maintenance => rng.gen_range(0..=10),
        };

        // 20% chance of no delay
        if rng.gen_bool(0.2) {
            0
        } else {
            base_delay
        }
    }

    /// Generate realistic speed based on status and consist
    fn generate_speed(
        &self,
        status: &TrainStatus,
        consist: &TrainConsist,
        rng: &mut impl Rng,
    ) -> f32 {
        match status {
            TrainStatus::AtStation => 0.0,
            TrainStatus::Terminated | TrainStatus::Cancelled => 0.0,
            TrainStatus::Scheduled => rng.gen_range(0.0..=10.0), // Very low speed for scheduled
            _ => {
                // Running or delayed trains
                let max_speed = consist.max_speed_kmh;
                let typical_speed = max_speed * 0.7; // Trains rarely run at max speed
                
                rng.gen_range(30.0..=typical_speed.min(120.0))
            }
        }
    }

    /// Calculate realistic ETA to next station
    fn calculate_eta(&self, train: &Train, rng: &mut impl Rng) -> DateTime<Utc> {
        let base_minutes = match train.status {
            TrainStatus::AtStation => rng.gen_range(2..=15), // Departure time
            TrainStatus::Running => rng.gen_range(15..=90),  // Time to next station
            TrainStatus::Delayed => rng.gen_range(20..=120), // Delayed arrival
            TrainStatus::Scheduled => rng.gen_range(30..=180), // Scheduled time
            _ => rng.gen_range(60..=240), // Default
        };

        Utc::now() + Duration::minutes(base_minutes + train.delay_minutes as i64)
    }

    /// Generate train consist based on train type
    fn generate_consist(&self, train_name: &str, rng: &mut impl Rng) -> TrainConsist {
        if train_name.contains("Freight") {
            TrainConsist {
                locomotive_type: "WAG-9".to_string(),
                total_coaches: rng.gen_range(20..=60),
                passenger_coaches: 0,
                freight_wagons: rng.gen_range(20..=60),
                total_length_meters: rng.gen_range(400.0..=1200.0),
                max_speed_kmh: rng.gen_range(75.0..=100.0),
            }
        } else if train_name.contains("Rajdhani") {
            TrainConsist {
                locomotive_type: "WAP-7".to_string(),
                total_coaches: rng.gen_range(16..=24),
                passenger_coaches: rng.gen_range(16..=24),
                freight_wagons: 0,
                total_length_meters: rng.gen_range(400.0..=600.0),
                max_speed_kmh: 130.0,
            }
        } else if train_name.contains("Shatabdi") {
            TrainConsist {
                locomotive_type: "WAP-5".to_string(),
                total_coaches: rng.gen_range(8..=12),
                passenger_coaches: rng.gen_range(8..=12),
                freight_wagons: 0,
                total_length_meters: rng.gen_range(200.0..=300.0),
                max_speed_kmh: 150.0,
            }
        } else if train_name.contains("Express") {
            TrainConsist {
                locomotive_type: ["WDM-3A", "WAP-4", "WDP-4"].choose(rng).unwrap().to_string(),
                total_coaches: rng.gen_range(12..=20),
                passenger_coaches: rng.gen_range(12..=20),
                freight_wagons: 0,
                total_length_meters: rng.gen_range(300.0..=500.0),
                max_speed_kmh: rng.gen_range(110.0..=130.0),
            }
        } else {
            // Passenger/Local trains
            TrainConsist {
                locomotive_type: ["WDM-3A", "WDP-4", "WAG-5"].choose(rng).unwrap().to_string(),
                total_coaches: rng.gen_range(8..=16),
                passenger_coaches: rng.gen_range(8..=16),
                freight_wagons: 0,
                total_length_meters: rng.gen_range(200.0..=400.0),
                max_speed_kmh: rng.gen_range(80.0..=110.0),
            }
        }
    }

    /// Generate trains for specific test scenarios
    pub async fn generate_scenario_trains(
        &self,
        scenario: &str,
        sections: &[RailwaySection],
    ) -> Result<Vec<Train>, Box<dyn std::error::Error>> {
        let (count, delay_factor) = match scenario {
            "normal" => (25, 0.1),
            "peak_hour" => (60, 0.25),
            "disruption" => (35, 0.4),
            "maintenance" => (20, 0.3),
            _ => (30, 0.15),
        };

        let mut trains = self.generate_trains_with_routes(count, sections).await?;
        
        // Adjust delays based on scenario
        let mut rng = rand::thread_rng();
        for train in &mut trains {
            if rng.gen_bool(delay_factor) {
                let additional_delay = match scenario {
                    "peak_hour" => rng.gen_range(5..=25),
                    "disruption" => rng.gen_range(15..=60),
                    "maintenance" => rng.gen_range(10..=40),
                    _ => rng.gen_range(0..=10),
                };
                
                train.add_delay(additional_delay);
            }
        }

        Ok(trains)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_train_generation() {
        let generator = TrainGenerator::new();
        
        // Create some dummy sections for testing
        let sections = vec![
            RailwaySection {
                id: "SEC001".to_string(),
                name: "Test Section 1".to_string(),
                start_coordinates: GeoPoint { latitude: 28.6, longitude: 77.2 },
                end_coordinates: GeoPoint { latitude: 28.7, longitude: 77.3 },
                length_km: 50.0,
                track_type: TrackType::Double,
                max_speed_kmh: 110.0,
                capacity_trains_per_hour: 20,
                current_occupancy: 5,
                status: SectionStatus::Active,
                signals: vec![],
                created_at: Utc::now(),
                updated_at: Utc::now(),
            },
        ];

        let trains = generator.generate_trains_with_routes(5, &sections).await;
        assert!(trains.is_ok());
        
        let trains = trains.unwrap();
        assert_eq!(trains.len(), 5);
        
        for train in trains {
            assert!(!train.id.is_empty());
            assert!(train.train_number >= 10000);
            assert!(!train.name.is_empty());
            assert!(!train.route.is_empty());
        }
    }
}
