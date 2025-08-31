use std::sync::Arc;
use anyhow::Result;
use tracing::{info, error, warn};
use crate::{models::*, database::Database};

pub mod train_service;
pub mod optimization_service;
pub mod ingestion_service;
pub mod conflict_detection;

pub use train_service::TrainService;
pub use optimization_service::OptimizationService;
pub use ingestion_service::IngestionService;

/// Service trait for common service patterns
pub trait Service {
    fn name(&self) -> &'static str;
}

/// Result type for service operations
pub type ServiceResult<T> = Result<T, ServiceError>;

#[derive(Debug, thiserror::Error)]
pub enum ServiceError {
    #[error("Database error: {0}")]
    Database(#[from] anyhow::Error),
    
    #[error("Validation error: {0}")]
    Validation(String),
    
    #[error("Not found: {0}")]
    NotFound(String),
    
    #[error("Conflict detected: {0}")]
    Conflict(String),
    
    #[error("External API error: {0}")]
    ExternalApi(String),
    
    #[error("Optimization error: {0}")]
    Optimization(String),
}
