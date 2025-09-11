use surrealdb::{Surreal, engine::remote::ws::Ws, engine::remote::ws::Client};
use anyhow::Result;
use crate::models::*;

#[derive(Debug)]
pub struct Database {
    pub client: Surreal<Client>,
}

impl Database {
    pub async fn new() -> Result<Self> {
        let client = Surreal::new::<Ws>("127.0.0.1:8000").await?;
        
        // Use namespace and database
        client.use_ns("railway").use_db("intelligence").await?;
        
        // Initialize schema
        Self::initialize_schema(&client).await?;
        
        Ok(Self { client })
    }

    async fn initialize_schema(client: &Surreal<Client>) -> Result<()> {
        // Define tables and fields
        client.query("
            -- Railway Network Graph
            DEFINE TABLE stations SCHEMAFULL;
            DEFINE FIELD id ON stations TYPE string;
            DEFINE FIELD name ON stations TYPE string;
            DEFINE FIELD coordinates ON stations TYPE geometry<point>;
            DEFINE FIELD platforms ON stations TYPE array<object>;
            DEFINE FIELD state_code ON stations TYPE string;
            DEFINE FIELD zone ON stations TYPE string;

            DEFINE TABLE sections SCHEMAFULL;
            DEFINE FIELD id ON sections TYPE string;
            DEFINE FIELD name ON sections TYPE string;
            DEFINE FIELD from_station ON sections TYPE record<stations>;
            DEFINE FIELD to_station ON sections TYPE record<stations>;
            DEFINE FIELD track_type ON sections TYPE string;
            DEFINE FIELD capacity ON sections TYPE int;
            DEFINE FIELD distance_km ON sections TYPE float;
            DEFINE FIELD speed_limit_kmh ON sections TYPE float;
            DEFINE FIELD created_at ON sections TYPE datetime;
            DEFINE FIELD updated_at ON sections TYPE datetime;

            -- Real-time Train Data
            DEFINE TABLE trains SCHEMAFULL;
            DEFINE FIELD id ON trains TYPE string;
            DEFINE FIELD train_number ON trains TYPE int;
            DEFINE FIELD name ON trains TYPE string;
            DEFINE FIELD priority ON trains TYPE string;
            DEFINE FIELD current_section ON trains TYPE string;
            DEFINE FIELD position ON trains TYPE geometry<point>;
            DEFINE FIELD delay_minutes ON trains TYPE int;
            DEFINE FIELD speed_kmh ON trains TYPE float;
            DEFINE FIELD status ON trains TYPE string;
            DEFINE FIELD route ON trains TYPE array<string>;
            DEFINE FIELD created_at ON trains TYPE datetime;
            DEFINE FIELD updated_at ON trains TYPE datetime;

            DEFINE TABLE train_events SCHEMAFULL;
            DEFINE FIELD id ON train_events TYPE string;
            DEFINE FIELD train_id ON train_events TYPE string;
            DEFINE FIELD event_type ON train_events TYPE string;
            DEFINE FIELD location ON train_events TYPE geometry<point>;
            DEFINE FIELD timestamp ON train_events TYPE datetime;
            DEFINE FIELD metadata ON train_events TYPE object;

            -- Optimization Results
            DEFINE TABLE optimization_results SCHEMAFULL;
            DEFINE FIELD request_id ON optimization_results TYPE uuid;
            DEFINE FIELD section_id ON optimization_results TYPE string;
            DEFINE FIELD status ON optimization_results TYPE string;
            DEFINE FIELD optimized_schedule ON optimization_results TYPE array<object>;
            DEFINE FIELD reasoning ON optimization_results TYPE string;
            DEFINE FIELD kpis ON optimization_results TYPE object;
            DEFINE FIELD execution_time_ms ON optimization_results TYPE int;
            DEFINE FIELD completed_at ON optimization_results TYPE datetime;

            -- Events and Disruptions
            DEFINE TABLE disruption_events SCHEMAFULL;
            DEFINE FIELD id ON disruption_events TYPE string;
            DEFINE FIELD disruption_type ON disruption_events TYPE string;
            DEFINE FIELD affected_sections ON disruption_events TYPE array<string>;
            DEFINE FIELD impact_level ON disruption_events TYPE int;
            DEFINE FIELD start_time ON disruption_events TYPE datetime;
            DEFINE FIELD end_time ON disruption_events TYPE datetime;
            DEFINE FIELD description ON disruption_events TYPE string;

            DEFINE TABLE conflict_events SCHEMAFULL;
            DEFINE FIELD id ON conflict_events TYPE string;
            DEFINE FIELD conflict_type ON conflict_events TYPE string;
            DEFINE FIELD trains_involved ON conflict_events TYPE array<string>;
            DEFINE FIELD section_id ON conflict_events TYPE string;
            DEFINE FIELD detected_at ON conflict_events TYPE datetime;
            DEFINE FIELD resolved_at ON conflict_events TYPE datetime;
            DEFINE FIELD severity ON conflict_events TYPE string;
        ").await?;
        
        Ok(())
    }

    // Train operations
    pub async fn create_train(&self, train: &Train) -> Result<String> {
        let created: Vec<Train> = self.client
            .create("trains")
            .content(train)
            .await?;
        
        Ok(created.first().unwrap().id.clone())
    }

    pub async fn get_train(&self, train_id: &str) -> Result<Option<Train>> {
        let train: Option<Train> = self.client
            .select(("trains", train_id))
            .await?;
        
        Ok(train)
    }

    pub async fn update_train(&self, train_id: &str, train: &Train) -> Result<()> {
        let _: Option<Train> = self.client
            .update(("trains", train_id))
            .content(train)
            .await?;
        
        Ok(())
    }

    pub async fn delete_train(&self, train_id: &str) -> Result<bool> {
        let deleted: Option<Train> = self.client
            .delete(("trains", train_id))
            .await?;
        
        Ok(deleted.is_some())
    }

    pub async fn get_all_trains(&self) -> Result<Vec<Train>> {
        let mut result = self.client
            .query("SELECT * FROM trains ORDER BY train_number ASC")
            .await?;
        
        let trains: Vec<Train> = result.take(0)?;
        Ok(trains)
    }

    pub async fn get_trains_in_section(&self, section_id: &str) -> Result<Vec<Train>> {
        let mut result = self.client
            .query("SELECT * FROM trains WHERE current_section = $section")
            .bind(("section", section_id))
            .await?;
        
        let trains: Vec<Train> = result.take(0)?;
        Ok(trains)
    }

    pub async fn get_active_trains(&self) -> Result<Vec<Train>> {
        let mut result = self.client
            .query("SELECT * FROM trains WHERE status IN ['Running', 'Delayed', 'AtStation']")
            .await?;
        
        let trains: Vec<Train> = result.take(0)?;
        Ok(trains)
    }

    // Section operations
    pub async fn create_section(&self, section: &Section) -> Result<String> {
        let created: Vec<Section> = self.client
            .create("sections")
            .content(section)
            .await?;
        
        Ok(created.first().unwrap().id.clone())
    }

    pub async fn get_section(&self, section_id: &str) -> Result<Option<Section>> {
        let section: Option<Section> = self.client
            .select(("sections", section_id))
            .await?;
        
        Ok(section)
    }

    pub async fn get_section_state(&self, section_id: &str) -> Result<SectionState> {
        let section = self.get_section(section_id).await?
            .ok_or_else(|| anyhow::anyhow!("Section not found: {}", section_id))?;
        
        let trains = self.get_trains_in_section(section_id).await?;
        let conflicts = self.get_active_conflicts_in_section(section_id).await?;
        
        let utilization_percent = section.utilization();
        Ok(SectionState {
            section_id: section.id,
            capacity: section.capacity,
            current_occupancy: trains.len() as u32,
            signal_status: SignalStatus::Green, // TODO: Get from signaling system
            weather_condition: WeatherType::Clear, // TODO: Get from weather API
            maintenance_blocks: section.maintenance_blocks.clone(),
            active_trains: trains.into_iter().map(|t| t.id).collect(),
            conflicts,
            utilization_percent,
            last_updated: chrono::Utc::now(),
        })
    }

    // Event operations
    pub async fn create_train_event(&self, event: &TrainEvent) -> Result<String> {
        let created: Vec<TrainEvent> = self.client
            .create("train_events")
            .content(event)
            .await?;
        
        Ok(created.first().unwrap().id.clone())
    }

    pub async fn get_train_events(&self, train_id: &str, hours: u32) -> Result<Vec<TrainEvent>> {
        let start_time = chrono::Utc::now() - chrono::Duration::hours(hours as i64);
        
        let mut result = self.client
            .query("SELECT * FROM train_events WHERE train_id = $train_id AND timestamp >= $start_time ORDER BY timestamp DESC")
            .bind(("train_id", train_id))
            .bind(("start_time", start_time))
            .await?;
        
        let events: Vec<TrainEvent> = result.take(0)?;
        Ok(events)
    }

    pub async fn create_disruption_event(&self, event: &DisruptionEvent) -> Result<String> {
        let created: Vec<DisruptionEvent> = self.client
            .create("disruption_events")
            .content(event)
            .await?;
        
        Ok(created.first().unwrap().id.clone())
    }

    pub async fn get_active_disruptions(&self) -> Result<Vec<DisruptionEvent>> {
        let mut result = self.client
            .query("SELECT * FROM disruption_events WHERE end_time IS NULL")
            .await?;
        
        let disruptions: Vec<DisruptionEvent> = result.take(0)?;
        Ok(disruptions)
    }

    pub async fn create_conflict_event(&self, event: &ConflictEvent) -> Result<String> {
        let created: Vec<ConflictEvent> = self.client
            .create("conflict_events")
            .content(event)
            .await?;
        
        Ok(created.first().unwrap().id.clone())
    }

    pub async fn get_active_conflicts_in_section(&self, section_id: &str) -> Result<Vec<ConflictEvent>> {
        let mut result = self.client
            .query("SELECT * FROM conflict_events WHERE section_id = $section AND resolved_at IS NULL")
            .bind(("section", section_id))
            .await?;
        
        let conflicts: Vec<ConflictEvent> = result.take(0)?;
        Ok(conflicts)
    }

    // Optimization results
    pub async fn store_optimization_result(&self, result: &OptimizationResponse) -> Result<String> {
        let created: Vec<OptimizationResponse> = self.client
            .create("optimization_results")
            .content(result)
            .await?;
        
        Ok(created.first().unwrap().request_id.clone())
    }

    pub async fn get_optimization_result(&self, request_id: &str) -> Result<Option<OptimizationResponse>> {
        let mut result = self.client
            .query("SELECT * FROM optimization_results WHERE request_id = $id")
            .bind(("id", request_id))
            .await?;
        
        let results: Vec<OptimizationResponse> = result.take(0)?;
        Ok(results.into_iter().next())
    }

    // Analytics and KPIs
    pub async fn get_performance_metrics(&self, section_id: &str, hours: i64) -> Result<PerformanceMetrics> {
        let start_time = chrono::Utc::now() - chrono::Duration::hours(hours);
        
        let mut result = self.client
            .query("
                LET $section = $section_id;
                LET $start = $start_time;
                
                SELECT 
                    count() as total_trains,
                    math::mean(delay_minutes) as avg_delay,
                    count(delay_minutes <= 5) / count() * 100 as punctuality
                FROM train_events 
                WHERE section_id = $section AND timestamp >= $start
            ")
            .bind(("section_id", section_id))
            .bind(("start_time", start_time))
            .await?;
        
        #[derive(serde::Deserialize)]
        struct QueryResult {
            total_trains: u32,
            avg_delay: f32,
            punctuality: f32,
        }
        
        let query_result: Vec<QueryResult> = result.take(0)?;
        let data = query_result.first().unwrap_or(&QueryResult {
            total_trains: 0,
            avg_delay: 0.0,
            punctuality: 0.0,
        });
        
        Ok(PerformanceMetrics {
            punctuality_percent: data.punctuality,
            average_delay_minutes: data.avg_delay,
            throughput_trains_per_hour: data.total_trains as f32 / hours as f32,
            utilization_percent: 0.0, // TODO: Calculate from section capacity
            conflicts_resolved: 0, // TODO: Count resolved conflicts
            total_trains_processed: data.total_trains,
        })
    }

    pub async fn health_check(&self) -> Result<bool> {
        let result = self.client.health().await;
        Ok(result.is_ok())
    }
}
