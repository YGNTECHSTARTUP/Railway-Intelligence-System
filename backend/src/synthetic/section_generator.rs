use rand::{Rng, seq::SliceRandom};
use chrono::Utc;
use crate::models::*;
use super::utils::*;

#[derive(Debug)]
pub struct SectionGenerator;

impl SectionGenerator {
    pub fn new() -> Self {
        Self
    }

    pub async fn generate_sections(&self, count: usize) -> Result<Vec<RailwaySection>, Box<dyn std::error::Error>> {
        let mut sections = Vec::with_capacity(count);
        let mut rng = rand::thread_rng();

        for i in 0..count {
            let section_id = format!("SEC{:03}", i + 1);
            let station_name = random_indian_station_name();
            
            let start_coords = random_coordinates_india();
            let end_coords = GeoPoint {
                latitude: start_coords.latitude + rng.gen_range(-0.1..0.1),
                longitude: start_coords.longitude + rng.gen_range(-0.1..0.1),
            };

            sections.push(RailwaySection {
                id: section_id,
                name: format!("{} - {} Section", station_name, i + 1),
                start_coordinates: start_coords,
                end_coordinates: end_coords,
                length_km: rng.gen_range(10.0..100.0),
                track_type: [TrackType::Single, TrackType::Double].choose(&mut rng).unwrap().clone(),
                max_speed_kmh: rng.gen_range(80.0..160.0),
                capacity_trains_per_hour: rng.gen_range(10..30),
                current_occupancy: rng.gen_range(0..15),
                status: SectionStatus::Active,
                signals: vec![],
                created_at: Utc::now(),
                updated_at: Utc::now(),
            });
        }

        Ok(sections)
    }
}
