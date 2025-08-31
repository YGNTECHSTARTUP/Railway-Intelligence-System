use rand::{Rng, seq::SliceRandom};
use chrono::{Utc, Duration};
use crate::models::*;

#[derive(Debug)]
pub struct DisruptionGenerator;

impl DisruptionGenerator {
    pub fn new() -> Self {
        Self
    }

    pub async fn generate_disruptions(
        &self,
        trains: &[Train],
        sections: &[RailwaySection],
        probability: f32,
        time_horizon_hours: u32,
    ) -> Result<Vec<DisruptionEvent>, Box<dyn std::error::Error>> {
        let mut disruptions = Vec::new();
        let mut rng = rand::thread_rng();

        let disruption_count = (sections.len() as f32 * probability) as usize;

        for _i in 0..disruption_count {
            let section = sections.choose(&mut rng).unwrap();
            let disruption_types = [
                DisruptionType::SignalFailure,
                DisruptionType::TrackMaintenance,
                DisruptionType::Weather,
                DisruptionType::Accident,
                DisruptionType::PowerFailure,
                DisruptionType::StrikeFactor,
                DisruptionType::RollingStockFailure,
            ];

            let disruption_type = disruption_types.choose(&mut rng).unwrap();
            let start_time = Utc::now() + Duration::hours(rng.gen_range(0..time_horizon_hours as i64));
            let duration = match disruption_type {
                DisruptionType::SignalFailure => rng.gen_range(15..120),
                DisruptionType::TrackMaintenance => rng.gen_range(60..480),
                DisruptionType::Weather => rng.gen_range(30..180),
                DisruptionType::Accident => rng.gen_range(120..600),
                DisruptionType::PowerFailure => rng.gen_range(20..240),
                DisruptionType::StrikeFactor => rng.gen_range(240..1440), // 4-24 hours
                DisruptionType::RollingStockFailure => rng.gen_range(60..360), // 1-6 hours
            };

            let affected_trains: Vec<String> = trains
                .iter()
                .filter(|t| t.current_section == section.id && rng.gen_bool(0.3))
                .map(|t| t.id.clone())
                .collect();

            let impact_level = if duration > 180 { 8 } else if duration > 60 { 5 } else { 2 };
            
            disruptions.push(DisruptionEvent {
                id: uuid::Uuid::new_v4().to_string(),
                disruption_type: *disruption_type,
                affected_sections: vec![section.id.clone()],
                affected_trains,
                start_time,
                end_time: Some(start_time + chrono::Duration::minutes(duration as i64)),
                impact_level,
                description: format!("{:?} in {}", disruption_type, section.name),
                response_actions: vec![],
            });
        }

        Ok(disruptions)
    }
}
