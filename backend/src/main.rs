use axum::{
    routing::{get, post, put, delete},
    Router,
    response::Json,
    http::StatusCode,
};
use serde_json::{json, Value};
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tracing::{info, error};
use tracing_subscriber;

mod models;
mod services;
mod database;
mod api;
mod ingestion;
mod synthetic;
mod metrics;
mod auth;
mod websocket;
mod config;
mod generated;

use services::*;
use database::Database;
use config::AppConfig;
use metrics::AppMetrics;
use auth::AuthService;
use websocket::WebSocketManager;

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<Database>,
    pub train_service: Arc<TrainService>,
    pub optimization_service: Arc<OptimizationService>,
    pub ingestion_service: Arc<IngestionService>,
    pub auth_service: Arc<AuthService>,
    pub metrics: Arc<AppMetrics>,
    pub config: Arc<AppConfig>,
    pub websocket_manager: Arc<WebSocketManager>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load configuration
    let config = Arc::new(AppConfig::from_env()?);
    config.validate()?;
    info!("📋 Configuration loaded successfully");

    // Initialize tracing with config
    tracing_subscriber::fmt()
        .with_max_level(config.logging.level.parse().unwrap_or(tracing::Level::INFO))
        .init();

    info!("🚆 Starting Railway Intelligence System Backend");

    // Initialize metrics
    let metrics = Arc::new(AppMetrics::new()?);
    info!("📊 Metrics system initialized");

    // Initialize database connection
    let db = Arc::new(Database::new().await?);
    info!("✅ Database connected");

    // Initialize authentication service
    let auth_service = Arc::new(AuthService::new(
        &config.security.jwt_secret,
        config.security.jwt_expiry_hours,
    ));
    info!("🔐 Authentication service initialized");

    // Initialize services
    let train_service = Arc::new(TrainService::new(db.clone()));
    let optimization_service = Arc::new(OptimizationService::new());
    let ingestion_service = Arc::new(IngestionService::with_config(
        db.clone(), 
        config.services.ingestion.clone()
    ));
    
    // Initialize WebSocket manager
    let websocket_manager = Arc::new(WebSocketManager::new(train_service.clone()));
    info!("🔌 WebSocket manager initialized");

    let state = AppState {
        db,
        train_service,
        optimization_service,
        ingestion_service,
        auth_service,
        metrics: metrics.clone(),
        config: config.clone(),
        websocket_manager: websocket_manager.clone(),
    };

    // Start background metrics updater
    let metrics_state = state.clone();
    let metrics_clone = metrics.clone();
    let metrics_interval = config.monitoring.metrics_collection_interval_seconds;
    tokio::spawn(async move {
        metrics::metrics_updater(metrics_state, metrics_clone, metrics_interval).await;
    });
    info!("📈 Background metrics collection started");

    // Start background data ingestion if enabled
    if config.services.ingestion.enabled {
        let ingestion_state = state.clone();
        tokio::spawn(async move {
            if let Err(e) = ingestion_state.ingestion_service.start_continuous_ingestion().await {
                error!("Background data ingestion failed: {:?}", e);
            }
        });
        info!("🔄 Background data ingestion started");
    }
    
    // Start WebSocket monitoring loop
    let websocket_state = state.clone();
    tokio::spawn(async move {
        if let Err(e) = websocket_state.websocket_manager.start_train_monitoring_loop(10) {
            error!("WebSocket monitoring loop failed: {:?}", e);
        }
    });
    info!("🔌 WebSocket monitoring loop started");

    // Build application routes
    let app = Router::new()
        .route("/health", get(health_check))
        // Authentication endpoints
        .route("/api/v1/auth/login", post(auth::login))
        .route("/api/v1/auth/logout", post(auth::logout))
        .route("/api/v1/auth/user", get(auth::get_user_info))
        // Train management endpoints
        .route("/api/v1/trains", get(api::trains::get_all_trains).post(api::trains::create_train))
        .route("/api/v1/trains/status", get(api::trains::get_train_status))
        .route("/api/v1/trains/delayed", get(api::trains::get_delayed_trains))
        .route("/api/v1/trains/:train_id", 
               get(api::trains::get_train_by_id)
               .put(api::trains::update_train)
               .delete(api::trains::delete_train))
        .route("/api/v1/trains/:train_id/update", post(api::trains::update_train_status))
        .route("/api/v1/trains/section/:section_id", get(api::trains::get_trains_in_section))
        // Enhanced monitoring endpoints
        .route("/api/v1/trains/analytics", get(api::trains::get_trains_with_analytics))
        .route("/api/v1/trains/positions", get(api::trains::get_real_time_positions))
        .route("/api/v1/trains/conflicts", get(api::trains::get_train_conflicts))
        .route("/api/v1/trains/alerts", get(api::trains::get_monitoring_alerts))
        .route("/api/v1/trains/:train_id/history", get(api::trains::get_train_performance_history))
        .route("/api/v1/trains/density", get(api::trains::get_section_density))
        // Optimization endpoints
        .nest("/api/v1/optimize", api::optimization::routes())
        // Simulation endpoints
        .route("/api/v1/simulate/scenario", post(api::simulation::simulate_scenario))
        // Section endpoints
        .route("/api/v1/sections/:id/state", get(api::sections::get_section_state))
        // Analytics endpoints
        .route("/api/v1/analytics/kpis", get(api::analytics::get_kpis))
        .route("/api/v1/analytics/overview", get(api::analytics::get_system_overview))
        .route("/api/v1/analytics/sections", get(api::analytics::get_section_analytics))
        // Data ingestion endpoints
        .route("/api/v1/ingestion/trigger", post(api::ingestion::trigger_ingestion))
        .route("/api/v1/ingestion/stats", get(api::ingestion::get_ingestion_stats))
        .route("/api/v1/ingestion/health", get(api::ingestion::check_api_health))
        // WebSocket endpoint
        .route("/ws", get(websocket::websocket_handler))
        // Metrics endpoint
        .route("/metrics", get(metrics::metrics_handler))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let bind_address = config.server_bind_address();
    info!("🚀 Server starting on {}", bind_address);
    info!("📊 Metrics available at: http://{}/metrics", bind_address);
    info!("🔌 WebSocket endpoint: ws://{}/ws", bind_address);

    // Start server
    let listener = tokio::net::TcpListener::bind(&bind_address).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> Result<Json<Value>, StatusCode> {
    Ok(Json(json!({
        "status": "healthy",
        "service": "railway-backend",
        "timestamp": chrono::Utc::now().to_rfc3339()
    })))
}
