use serde::{Deserialize, Serialize};
use std::path::Path;
use anyhow::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub services: ServicesConfig,
    pub logging: LoggingConfig,
    pub security: SecurityConfig,
    pub monitoring: MonitoringConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub cors_enabled: bool,
    pub max_connections: usize,
    pub request_timeout_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseConfig {
    pub url: String,
    pub namespace: String,
    pub database: String,
    pub connection_pool_size: u32,
    pub connection_timeout_seconds: u64,
    pub query_timeout_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServicesConfig {
    pub optimization: OptimizationConfig,
    pub ingestion: IngestionConfig,
    pub websocket: WebSocketConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationConfig {
    pub grpc_endpoint: Option<String>,
    pub max_computation_time_seconds: u32,
    pub default_time_horizon_minutes: u32,
    pub enable_caching: bool,
    pub cache_ttl_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IngestionConfig {
    pub enabled: bool,
    pub external_apis: Vec<ExternalApiConfig>,
    pub polling_interval_seconds: u64,
    pub batch_size: usize,
    pub retry_attempts: u32,
    pub retry_delay_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExternalApiConfig {
    pub name: String,
    pub url: String,
    pub api_key: Option<String>,
    pub timeout_seconds: u64,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketConfig {
    pub max_connections: usize,
    pub message_buffer_size: usize,
    pub heartbeat_interval_seconds: u64,
    pub connection_timeout_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    pub level: String,
    pub file_output: bool,
    pub file_path: Option<String>,
    pub json_format: bool,
    pub include_line_numbers: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    pub jwt_secret: String,
    pub jwt_expiry_hours: u64,
    pub api_rate_limit_per_minute: u32,
    pub enable_api_key_auth: bool,
    pub cors_origins: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitoringConfig {
    pub prometheus_enabled: bool,
    pub prometheus_endpoint: String,
    pub metrics_collection_interval_seconds: u64,
    pub health_check_enabled: bool,
    pub alert_webhook_url: Option<String>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            server: ServerConfig {
                host: "0.0.0.0".to_string(),
                port: 8000,
                cors_enabled: true,
                max_connections: 1000,
                request_timeout_seconds: 30,
            },
            database: DatabaseConfig {
                url: "127.0.0.1:8000".to_string(),
                namespace: "railway".to_string(),
                database: "intelligence".to_string(),
                connection_pool_size: 10,
                connection_timeout_seconds: 10,
                query_timeout_seconds: 30,
            },
            services: ServicesConfig {
                optimization: OptimizationConfig {
                    grpc_endpoint: None,
                    max_computation_time_seconds: 300,
                    default_time_horizon_minutes: 120,
                    enable_caching: true,
                    cache_ttl_seconds: 300,
                },
                ingestion: IngestionConfig {
                    enabled: true, // Enable by default
                    external_apis: vec![
                        ExternalApiConfig {
                            name: "Indian Railways API".to_string(),
                            url: "https://api.indianrail.gov.in".to_string(),
                            api_key: None,
                            timeout_seconds: 30,
                            enabled: false, // External APIs disabled by default (use mock data)
                        },
                    ],
                    polling_interval_seconds: 60,
                    batch_size: 100,
                    retry_attempts: 3,
                    retry_delay_seconds: 5,
                },
                websocket: WebSocketConfig {
                    max_connections: 1000,
                    message_buffer_size: 1000,
                    heartbeat_interval_seconds: 30,
                    connection_timeout_seconds: 300,
                },
            },
            logging: LoggingConfig {
                level: "info".to_string(),
                file_output: true,
                file_path: Some("logs/railway-backend.log".to_string()),
                json_format: false,
                include_line_numbers: true,
            },
            security: SecurityConfig {
                jwt_secret: "your-super-secret-jwt-key-change-in-production".to_string(),
                jwt_expiry_hours: 24,
                api_rate_limit_per_minute: 100,
                enable_api_key_auth: false,
                cors_origins: vec!["*".to_string()],
            },
            monitoring: MonitoringConfig {
                prometheus_enabled: true,
                prometheus_endpoint: "/metrics".to_string(),
                metrics_collection_interval_seconds: 15,
                health_check_enabled: true,
                alert_webhook_url: None,
            },
        }
    }
}

impl AppConfig {
    /// Load configuration from file
    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<Self> {
        let config_str = std::fs::read_to_string(path)?;
        let config: AppConfig = toml::from_str(&config_str)?;
        Ok(config)
    }

    /// Load configuration from environment variables
    pub fn from_env() -> Result<Self> {
        let mut config = AppConfig::default();

        // Server configuration
        if let Ok(host) = std::env::var("SERVER_HOST") {
            config.server.host = host;
        }
        if let Ok(port) = std::env::var("SERVER_PORT") {
            config.server.port = port.parse()?;
        }

        // Database configuration
        if let Ok(db_url) = std::env::var("DATABASE_URL") {
            config.database.url = db_url;
        }
        if let Ok(db_ns) = std::env::var("DATABASE_NAMESPACE") {
            config.database.namespace = db_ns;
        }
        if let Ok(db_name) = std::env::var("DATABASE_NAME") {
            config.database.database = db_name;
        }

        // Security configuration
        if let Ok(jwt_secret) = std::env::var("JWT_SECRET") {
            config.security.jwt_secret = jwt_secret;
        }

        // Logging configuration
        if let Ok(log_level) = std::env::var("LOG_LEVEL") {
            config.logging.level = log_level;
        }

        Ok(config)
    }

    /// Save configuration to file
    pub fn save_to_file<P: AsRef<Path>>(&self, path: P) -> Result<()> {
        let config_str = toml::to_string_pretty(self)?;
        std::fs::write(path, config_str)?;
        Ok(())
    }

    /// Validate configuration
    pub fn validate(&self) -> Result<()> {
        // Validate server config
        if self.server.port == 0 {
            return Err(anyhow::anyhow!("Server port cannot be 0"));
        }

        // Validate database config
        if self.database.url.is_empty() {
            return Err(anyhow::anyhow!("Database URL cannot be empty"));
        }

        // Validate security config
        if self.security.jwt_secret.len() < 32 {
            return Err(anyhow::anyhow!("JWT secret must be at least 32 characters"));
        }

        // Validate services config
        if self.services.optimization.max_computation_time_seconds == 0 {
            return Err(anyhow::anyhow!("Optimization computation time must be greater than 0"));
        }

        Ok(())
    }

    /// Get database connection string
    pub fn database_connection_string(&self) -> String {
        format!(
            "surreal://{}?ns={}&db={}",
            self.database.url,
            self.database.namespace,
            self.database.database
        )
    }

    /// Get server bind address
    pub fn server_bind_address(&self) -> String {
        format!("{}:{}", self.server.host, self.server.port)
    }
}

/// Environment-specific configurations
#[derive(Debug, Clone)]
pub enum Environment {
    Development,
    Testing,
    Staging,
    Production,
}

impl Environment {
    pub fn from_env() -> Self {
        match std::env::var("ENVIRONMENT").as_deref() {
            Ok("prod") | Ok("production") => Environment::Production,
            Ok("staging") => Environment::Staging,
            Ok("test") | Ok("testing") => Environment::Testing,
            _ => Environment::Development,
        }
    }

    pub fn is_production(&self) -> bool {
        matches!(self, Environment::Production)
    }

    pub fn is_development(&self) -> bool {
        matches!(self, Environment::Development)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    #[test]
    fn test_default_config() {
        let config = AppConfig::default();
        assert_eq!(config.server.port, 8000);
        assert_eq!(config.database.namespace, "railway");
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_config_serialization() {
        let config = AppConfig::default();
        let toml_str = toml::to_string(&config).unwrap();
        let deserialized: AppConfig = toml::from_str(&toml_str).unwrap();
        assert_eq!(config.server.port, deserialized.server.port);
    }

    #[test]
    fn test_config_file_operations() {
        let config = AppConfig::default();
        let temp_file = NamedTempFile::new().unwrap();
        
        // Save and load
        config.save_to_file(temp_file.path()).unwrap();
        let loaded_config = AppConfig::from_file(temp_file.path()).unwrap();
        
        assert_eq!(config.server.port, loaded_config.server.port);
        assert_eq!(config.database.namespace, loaded_config.database.namespace);
    }
}
