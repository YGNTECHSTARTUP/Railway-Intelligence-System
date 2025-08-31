use axum::{
    response::Json,
    http::StatusCode,
};

pub mod trains;
pub mod optimization;
pub mod sections; 
pub mod simulation;
pub mod analytics;
pub mod ingestion;


pub type ApiResult<T> = Result<Json<T>, ApiError>;

#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("Service error: {0}")]
    Service(#[from] crate::services::ServiceError),
    
    #[error("Validation error: {0}")]
    Validation(String),
    
    #[error("Not found: {0}")]
    NotFound(String),
}

impl From<ApiError> for StatusCode {
    fn from(err: ApiError) -> Self {
        match err {
            ApiError::Service(service_err) => match service_err {
                crate::services::ServiceError::NotFound(_) => StatusCode::NOT_FOUND,
                crate::services::ServiceError::Conflict(_) => StatusCode::CONFLICT,
                crate::services::ServiceError::Validation(_) => StatusCode::BAD_REQUEST,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            },
            ApiError::Validation(_) => StatusCode::BAD_REQUEST,
            ApiError::NotFound(_) => StatusCode::NOT_FOUND,
        }
    }
}
