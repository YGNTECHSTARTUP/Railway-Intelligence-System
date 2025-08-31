use axum::{
    async_trait,
    extract::{FromRequestParts, State},
    http::{request::Parts, StatusCode},
    response::Json,
};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc, Duration};
use crate::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub username: String,
    pub email: String,
    pub role: UserRole,
    pub created_at: DateTime<Utc>,
    pub last_login: Option<DateTime<Utc>>,
    pub active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum UserRole {
    Admin,
    Operator,
    Viewer,
    SystemMonitor,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,      // Subject (user ID)
    pub username: String, 
    pub role: UserRole,
    pub exp: usize,       // Expiration time
    pub iat: usize,       // Issued at
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: UserInfo,
    pub expires_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct UserInfo {
    pub id: String,
    pub username: String,
    pub email: String,
    pub role: UserRole,
}

/// JWT token management
pub struct AuthService {
    pub encoding_key: EncodingKey,
    pub decoding_key: DecodingKey,
    pub token_expiry_hours: u64,
}

impl AuthService {
    pub fn new(secret: &str, token_expiry_hours: u64) -> Self {
        let encoding_key = EncodingKey::from_secret(secret.as_ref());
        let decoding_key = DecodingKey::from_secret(secret.as_ref());
        
        Self {
            encoding_key,
            decoding_key,
            token_expiry_hours,
        }
    }
    
    /// Generate JWT token for user
    pub fn generate_token(&self, user: &User) -> Result<String, jsonwebtoken::errors::Error> {
        let now = Utc::now();
        let exp = (now + Duration::hours(self.token_expiry_hours as i64)).timestamp() as usize;
        let iat = now.timestamp() as usize;
        
        let claims = Claims {
            sub: user.id.clone(),
            username: user.username.clone(),
            role: user.role.clone(),
            exp,
            iat,
        };
        
        encode(&Header::default(), &claims, &self.encoding_key)
    }
    
    /// Validate JWT token
    pub fn validate_token(&self, token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
        let validation = Validation::new(Algorithm::HS256);
        let token_data = decode::<Claims>(token, &self.decoding_key, &validation)?;
        Ok(token_data.claims)
    }
    
    /// Authenticate user credentials (mock implementation)
    pub async fn authenticate_user(&self, username: &str, password: &str) -> Option<User> {
        // TODO: Replace with actual user authentication against database
        // This is a mock implementation for demonstration
        match (username, password) {
            ("admin", "admin123") => Some(User {
                id: "user_admin_001".to_string(),
                username: "admin".to_string(),
                email: "admin@railway.gov.in".to_string(),
                role: UserRole::Admin,
                created_at: Utc::now(),
                last_login: Some(Utc::now()),
                active: true,
            }),
            ("operator", "operator123") => Some(User {
                id: "user_operator_001".to_string(),
                username: "operator".to_string(),
                email: "operator@railway.gov.in".to_string(),
                role: UserRole::Operator,
                created_at: Utc::now(),
                last_login: Some(Utc::now()),
                active: true,
            }),
            ("viewer", "viewer123") => Some(User {
                id: "user_viewer_001".to_string(),
                username: "viewer".to_string(),
                email: "viewer@railway.gov.in".to_string(),
                role: UserRole::Viewer,
                created_at: Utc::now(),
                last_login: Some(Utc::now()),
                active: true,
            }),
            _ => None,
        }
    }
}

/// Authentication extractor for protected routes
pub struct AuthenticatedUser(pub Claims);

#[async_trait]
impl<S> FromRequestParts<S> for AuthenticatedUser
where
    S: Send + Sync,
{
    type Rejection = StatusCode;
    
    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        // Extract authorization header
        let auth_header = parts.headers
            .get("authorization")
            .and_then(|h| h.to_str().ok())
            .ok_or(StatusCode::UNAUTHORIZED)?;
        
        // Check for Bearer token
        if !auth_header.starts_with("Bearer ") {
            return Err(StatusCode::UNAUTHORIZED);
        }
        
        let token = &auth_header[7..]; // Remove "Bearer " prefix
        
        // For now, use a hardcoded secret for validation
        // TODO: Get secret from app state properly
        let secret = "your-super-secret-jwt-key-change-in-production";
        let auth_service = AuthService::new(secret, 24);
        
        match auth_service.validate_token(token) {
            Ok(claims) => Ok(AuthenticatedUser(claims)),
            Err(_) => Err(StatusCode::UNAUTHORIZED),
        }
    }
}

/// Login endpoint
pub async fn login(
    State(_state): State<AppState>,
    Json(request): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, StatusCode> {
    tracing::info!("Login attempt for user: {}", request.username);
    
    // TODO: Get auth service from app state
    let secret = "your-super-secret-jwt-key-change-in-production";
    let auth_service = AuthService::new(secret, 24);
    
    // Authenticate user
    match auth_service.authenticate_user(&request.username, &request.password).await {
        Some(user) => {
            // Generate token
            match auth_service.generate_token(&user) {
                Ok(token) => {
                    let expires_at = Utc::now() + Duration::hours(24);
                    
                    let response = LoginResponse {
                        token,
                        user: UserInfo {
                            id: user.id,
                            username: user.username,
                            email: user.email,
                            role: user.role,
                        },
                        expires_at,
                    };
                    
                    tracing::info!("User {} logged in successfully", request.username);
                    Ok(Json(response))
                }
                Err(e) => {
                    tracing::error!("Failed to generate token: {:?}", e);
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        }
        None => {
            tracing::warn!("Invalid credentials for user: {}", request.username);
            Err(StatusCode::UNAUTHORIZED)
        }
    }
}

/// Logout endpoint
pub async fn logout(
    _user: AuthenticatedUser,
) -> Result<Json<serde_json::Value>, StatusCode> {
    tracing::info!("User {} logged out", _user.0.username);
    
    Ok(Json(serde_json::json!({
        "message": "Logged out successfully",
        "timestamp": Utc::now().to_rfc3339()
    })))
}

/// Role-based authorization checker
pub struct RequireRole(pub UserRole);

impl RequireRole {
    pub fn check_permission(&self, user_role: &UserRole) -> bool {
        match (&self.0, user_role) {
            // Admin can access everything
            (_, UserRole::Admin) => true,
            // Operator can access most things except admin functions
            (UserRole::Viewer, UserRole::Operator) => true,
            (UserRole::SystemMonitor, UserRole::Operator) => true,
            // SystemMonitor can view and monitor
            (UserRole::Viewer, UserRole::SystemMonitor) => true,
            // Viewer can only view
            (UserRole::Viewer, UserRole::Viewer) => true,
            // Everything else is denied
            _ => false,
        }
    }
}

/// Get current user info
pub async fn get_user_info(
    user: AuthenticatedUser,
) -> Result<Json<UserInfo>, StatusCode> {
    let username = user.0.username.clone();
    Ok(Json(UserInfo {
        id: user.0.sub,
        username: username.clone(),
        email: format!("{}@railway.gov.in", username), // Mock email
        role: user.0.role,
    }))
}

/// Authorization middleware
pub fn require_role(required_role: UserRole) -> impl Fn(AuthenticatedUser) -> Result<AuthenticatedUser, StatusCode> {
    move |user: AuthenticatedUser| {
        let role_checker = RequireRole(required_role.clone());
        if role_checker.check_permission(&user.0.role) {
            Ok(user)
        } else {
            tracing::warn!(
                "Access denied for user {} with role {:?}, required: {:?}",
                user.0.username, user.0.role, required_role
            );
            Err(StatusCode::FORBIDDEN)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_role_permissions() {
        let admin_checker = RequireRole(UserRole::Admin);
        let operator_checker = RequireRole(UserRole::Operator);
        let viewer_checker = RequireRole(UserRole::Viewer);
        
        // Admin can access everything
        assert!(admin_checker.check_permission(&UserRole::Admin));
        assert!(operator_checker.check_permission(&UserRole::Admin));
        assert!(viewer_checker.check_permission(&UserRole::Admin));
        
        // Operator can access operator and viewer functions
        assert!(!admin_checker.check_permission(&UserRole::Operator));
        assert!(operator_checker.check_permission(&UserRole::Operator));
        assert!(viewer_checker.check_permission(&UserRole::Operator));
        
        // Viewer can only access viewer functions
        assert!(!admin_checker.check_permission(&UserRole::Viewer));
        assert!(!operator_checker.check_permission(&UserRole::Viewer));
        assert!(viewer_checker.check_permission(&UserRole::Viewer));
    }
    
    #[tokio::test]
    async fn test_jwt_token_generation() {
        let auth_service = AuthService::new("test-secret-key-at-least-32-chars", 24);
        
        let user = User {
            id: "test_user_001".to_string(),
            username: "testuser".to_string(),
            email: "test@railway.gov.in".to_string(),
            role: UserRole::Operator,
            created_at: Utc::now(),
            last_login: None,
            active: true,
        };
        
        let token = auth_service.generate_token(&user).unwrap();
        let claims = auth_service.validate_token(&token).unwrap();
        
        assert_eq!(claims.sub, user.id);
        assert_eq!(claims.username, user.username);
        assert_eq!(claims.role, user.role);
    }
}
