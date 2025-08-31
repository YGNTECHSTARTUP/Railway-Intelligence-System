use prometheus::{Gauge, Histogram, IntCounter, IntGauge, Registry, Opts, HistogramOpts};
use std::sync::Arc;
use anyhow::Result;
use axum::{extract::State, response::Response, http::StatusCode};
use crate::AppState;

/// Application metrics collection
#[derive(Debug, Clone)]
pub struct AppMetrics {
    // HTTP request metrics
    pub http_requests_total: IntCounter,
    pub http_request_duration: Histogram,
    pub http_requests_in_flight: IntGauge,
    
    // Train metrics
    pub trains_active_total: IntGauge,
    pub trains_delayed_total: IntGauge,
    pub average_delay_minutes: Gauge,
    pub train_events_total: IntCounter,
    
    // Section metrics
    pub sections_total: IntGauge,
    pub section_utilization: Gauge,
    pub conflicts_detected_total: IntCounter,
    pub conflicts_resolved_total: IntCounter,
    
    // Optimization metrics
    pub optimization_requests_total: IntCounter,
    pub optimization_duration: Histogram,
    pub optimization_success_total: IntCounter,
    pub optimization_failures_total: IntCounter,
    
    // Database metrics
    pub database_queries_total: IntCounter,
    pub database_query_duration: Histogram,
    pub database_connections_active: IntGauge,
    
    // WebSocket metrics
    pub websocket_connections_active: IntGauge,
    pub websocket_messages_sent: IntCounter,
    pub websocket_messages_received: IntCounter,
    
    // System metrics
    pub system_uptime_seconds: Gauge,
    pub memory_usage_bytes: Gauge,
    
    pub registry: Registry,
}

impl AppMetrics {
    pub fn new() -> Result<Self> {
        let registry = Registry::new();
        
        // HTTP metrics
        let http_requests_total = IntCounter::with_opts(
            Opts::new("http_requests_total", "Total number of HTTP requests")
        )?;
        let http_request_duration = Histogram::with_opts(
            HistogramOpts::new("http_request_duration_seconds", "HTTP request duration")
        )?;
        let http_requests_in_flight = IntGauge::with_opts(
            Opts::new("http_requests_in_flight", "Current number of HTTP requests being processed")
        )?;
        
        // Train metrics
        let trains_active_total = IntGauge::with_opts(
            Opts::new("trains_active_total", "Total number of active trains")
        )?;
        let trains_delayed_total = IntGauge::with_opts(
            Opts::new("trains_delayed_total", "Total number of delayed trains")
        )?;
        let average_delay_minutes = Gauge::with_opts(
            Opts::new("average_delay_minutes", "Average delay across all trains in minutes")
        )?;
        let train_events_total = IntCounter::with_opts(
            Opts::new("train_events_total", "Total number of train events processed")
        )?;
        
        // Section metrics
        let sections_total = IntGauge::with_opts(
            Opts::new("sections_total", "Total number of railway sections")
        )?;
        let section_utilization = Gauge::with_opts(
            Opts::new("section_utilization_percent", "Average section utilization percentage")
        )?;
        let conflicts_detected_total = IntCounter::with_opts(
            Opts::new("conflicts_detected_total", "Total number of conflicts detected")
        )?;
        let conflicts_resolved_total = IntCounter::with_opts(
            Opts::new("conflicts_resolved_total", "Total number of conflicts resolved")
        )?;
        
        // Optimization metrics
        let optimization_requests_total = IntCounter::with_opts(
            Opts::new("optimization_requests_total", "Total number of optimization requests")
        )?;
        let optimization_duration = Histogram::with_opts(
            HistogramOpts::new("optimization_duration_seconds", "Optimization computation duration")
        )?;
        let optimization_success_total = IntCounter::with_opts(
            Opts::new("optimization_success_total", "Total number of successful optimizations")
        )?;
        let optimization_failures_total = IntCounter::with_opts(
            Opts::new("optimization_failures_total", "Total number of failed optimizations")
        )?;
        
        // Database metrics
        let database_queries_total = IntCounter::with_opts(
            Opts::new("database_queries_total", "Total number of database queries")
        )?;
        let database_query_duration = Histogram::with_opts(
            HistogramOpts::new("database_query_duration_seconds", "Database query duration")
        )?;
        let database_connections_active = IntGauge::with_opts(
            Opts::new("database_connections_active", "Active database connections")
        )?;
        
        // WebSocket metrics
        let websocket_connections_active = IntGauge::with_opts(
            Opts::new("websocket_connections_active", "Active WebSocket connections")
        )?;
        let websocket_messages_sent = IntCounter::with_opts(
            Opts::new("websocket_messages_sent_total", "Total WebSocket messages sent")
        )?;
        let websocket_messages_received = IntCounter::with_opts(
            Opts::new("websocket_messages_received_total", "Total WebSocket messages received")
        )?;
        
        // System metrics
        let system_uptime_seconds = Gauge::with_opts(
            Opts::new("system_uptime_seconds", "System uptime in seconds")
        )?;
        let memory_usage_bytes = Gauge::with_opts(
            Opts::new("memory_usage_bytes", "Memory usage in bytes")
        )?;
        
        // Register all metrics
        registry.register(Box::new(http_requests_total.clone()))?;
        registry.register(Box::new(http_request_duration.clone()))?;
        registry.register(Box::new(http_requests_in_flight.clone()))?;
        registry.register(Box::new(trains_active_total.clone()))?;
        registry.register(Box::new(trains_delayed_total.clone()))?;
        registry.register(Box::new(average_delay_minutes.clone()))?;
        registry.register(Box::new(train_events_total.clone()))?;
        registry.register(Box::new(sections_total.clone()))?;
        registry.register(Box::new(section_utilization.clone()))?;
        registry.register(Box::new(conflicts_detected_total.clone()))?;
        registry.register(Box::new(conflicts_resolved_total.clone()))?;
        registry.register(Box::new(optimization_requests_total.clone()))?;
        registry.register(Box::new(optimization_duration.clone()))?;
        registry.register(Box::new(optimization_success_total.clone()))?;
        registry.register(Box::new(optimization_failures_total.clone()))?;
        registry.register(Box::new(database_queries_total.clone()))?;
        registry.register(Box::new(database_query_duration.clone()))?;
        registry.register(Box::new(database_connections_active.clone()))?;
        registry.register(Box::new(websocket_connections_active.clone()))?;
        registry.register(Box::new(websocket_messages_sent.clone()))?;
        registry.register(Box::new(websocket_messages_received.clone()))?;
        registry.register(Box::new(system_uptime_seconds.clone()))?;
        registry.register(Box::new(memory_usage_bytes.clone()))?;
        
        Ok(Self {
            http_requests_total,
            http_request_duration,
            http_requests_in_flight,
            trains_active_total,
            trains_delayed_total,
            average_delay_minutes,
            train_events_total,
            sections_total,
            section_utilization,
            conflicts_detected_total,
            conflicts_resolved_total,
            optimization_requests_total,
            optimization_duration,
            optimization_success_total,
            optimization_failures_total,
            database_queries_total,
            database_query_duration,
            database_connections_active,
            websocket_connections_active,
            websocket_messages_sent,
            websocket_messages_received,
            system_uptime_seconds,
            memory_usage_bytes,
            registry,
        })
    }
    
    /// Update train-related metrics
    pub async fn update_train_metrics(&self, state: &AppState) -> Result<()> {
        if let Ok(trains) = state.train_service.get_all_trains().await {
            let active_count = trains.len() as i64;
            let delayed_count = trains.iter().filter(|t| t.is_delayed()).count() as i64;
            let total_delay: i32 = trains.iter().map(|t| t.delay_minutes).sum();
            let avg_delay = if active_count > 0 {
                total_delay as f64 / active_count as f64
            } else {
                0.0
            };
            
            self.trains_active_total.set(active_count);
            self.trains_delayed_total.set(delayed_count);
            self.average_delay_minutes.set(avg_delay);
        }
        
        Ok(())
    }
    
    /// Record an HTTP request
    pub fn record_http_request(&self) {
        self.http_requests_total.inc();
    }
    
    /// Record HTTP request duration
    pub fn record_http_duration(&self, duration_seconds: f64) {
        self.http_request_duration.observe(duration_seconds);
    }
    
    /// Record optimization request
    pub fn record_optimization_request(&self, success: bool, duration_seconds: f64) {
        self.optimization_requests_total.inc();
        self.optimization_duration.observe(duration_seconds);
        
        if success {
            self.optimization_success_total.inc();
        } else {
            self.optimization_failures_total.inc();
        }
    }
    
    /// Record database query
    pub fn record_database_query(&self, duration_seconds: f64) {
        self.database_queries_total.inc();
        self.database_query_duration.observe(duration_seconds);
    }
    
    /// Update WebSocket connection count
    pub fn update_websocket_connections(&self, count: i64) {
        self.websocket_connections_active.set(count);
    }
    
    /// Record WebSocket message
    pub fn record_websocket_message(&self, sent: bool) {
        if sent {
            self.websocket_messages_sent.inc();
        } else {
            self.websocket_messages_received.inc();
        }
    }
    
    /// Update system uptime
    pub fn update_system_uptime(&self, uptime_seconds: f64) {
        self.system_uptime_seconds.set(uptime_seconds);
    }
}

/// Prometheus metrics endpoint handler
pub async fn metrics_handler(
    State(_state): State<AppState>,
) -> Result<Response<String>, StatusCode> {
    // This would require accessing metrics from AppState
    // For now, return a basic response
    let metrics_text = "# Railway Intelligence System Metrics\n# TYPE trains_active gauge\ntrains_active 25\n";
    
    Ok(Response::builder()
        .status(StatusCode::OK)
        .header("content-type", "text/plain")
        .body(metrics_text.to_string())
        .unwrap())
}

/// Metrics middleware for automatic request tracking
pub struct MetricsMiddleware {
    pub metrics: Arc<AppMetrics>,
}

impl MetricsMiddleware {
    pub fn new(metrics: Arc<AppMetrics>) -> Self {
        Self { metrics }
    }
}

/// Background task to update metrics periodically
pub async fn metrics_updater(
    state: AppState,
    metrics: Arc<AppMetrics>,
    interval_seconds: u64,
) {
    let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(interval_seconds));
    
    loop {
        interval.tick().await;
        
        if let Err(e) = metrics.update_train_metrics(&state).await {
            tracing::error!("Failed to update train metrics: {:?}", e);
        }
        
        // Update system metrics
        let uptime = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as f64;
        metrics.update_system_uptime(uptime);
        
        tracing::debug!("Metrics updated successfully");
    }
}
