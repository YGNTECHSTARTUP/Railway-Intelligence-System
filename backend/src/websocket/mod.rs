use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::Response,
};
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    sync::{Arc, Mutex},
};
use tokio::sync::broadcast;
use tracing::{info, warn, error};
use futures_util::{SinkExt, StreamExt};
use crate::{AppState, models::*, services::train_service::*};
use chrono::{DateTime, Utc};
use uuid::Uuid;

/// WebSocket message types for real-time communication
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum WsMessage {
    /// Subscribe to specific train updates
    Subscribe {
        train_ids: Vec<String>,
    },
    /// Subscribe to section updates
    SubscribeSection {
        section_ids: Vec<String>,
    },
    /// Train position update
    TrainUpdate {
        train_id: String,
        position: GeoPoint,
        speed_kmh: f32,
        delay_minutes: i32,
        status: TrainStatus,
        timestamp: chrono::DateTime<chrono::Utc>,
    },
    /// Section status update
    SectionUpdate {
        section_id: String,
        occupancy: u32,
        conflicts: Vec<String>,
        timestamp: chrono::DateTime<chrono::Utc>,
    },
    /// Disruption alert
    DisruptionAlert {
        disruption_id: String,
        disruption_type: DisruptionType,
        affected_sections: Vec<String>,
        impact_level: u8,
        description: String,
        timestamp: chrono::DateTime<chrono::Utc>,
    },
    /// System alert
    SystemAlert {
        alert_type: String,
        message: String,
        severity: String,
        timestamp: chrono::DateTime<chrono::Utc>,
    },
    /// Connection confirmation
    Connected {
        client_id: String,
        timestamp: chrono::DateTime<chrono::Utc>,
    },
    /// Error message
    Error {
        message: String,
        timestamp: chrono::DateTime<chrono::Utc>,
    },
}

/// WebSocket connection manager
#[derive(Debug)]
pub struct WebSocketManager {
    /// Broadcast channel for sending messages to all connected clients
    pub sender: broadcast::Sender<WsMessage>,
    /// Connected clients with their subscriptions
    pub clients: Arc<Mutex<HashMap<String, ClientInfo>>>,
    /// Train service reference for real-time data
    pub train_service: Arc<TrainService>,
}

#[derive(Debug, Clone)]
pub struct ClientInfo {
    pub client_id: String,
    pub subscribed_trains: HashSet<String>,
    pub subscribed_sections: HashSet<String>,
    pub connected_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
}

impl WebSocketManager {
    pub fn new(train_service: Arc<TrainService>) -> Self {
        let (sender, _) = broadcast::channel(1000);
        Self {
            sender,
            clients: Arc::new(Mutex::new(HashMap::new())),
            train_service,
        }
    }

    /// Send a message to all connected clients
    pub fn broadcast(&self, message: WsMessage) -> Result<(), broadcast::error::SendError<WsMessage>> {
        self.sender.send(message).map(|_| ())
    }

    /// Add a new client
    pub fn add_client(&self, client_id: String, client_info: ClientInfo) {
        let mut clients = self.clients.lock().unwrap();
        clients.insert(client_id, client_info);
    }

    /// Remove a client
    pub fn remove_client(&self, client_id: &str) {
        let mut clients = self.clients.lock().unwrap();
        clients.remove(client_id);
        info!("Client {} disconnected", client_id);
    }

    /// Get client count
    pub fn client_count(&self) -> usize {
        self.clients.lock().unwrap().len()
    }

    /// Send train update to subscribed clients
    pub async fn send_train_update(
        &self,
        train: &Train,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let message = WsMessage::TrainUpdate {
            train_id: train.id.clone(),
            position: train.position,
            speed_kmh: train.speed_kmh,
            delay_minutes: train.delay_minutes,
            status: train.status,
            timestamp: chrono::Utc::now(),
        };

        self.broadcast(message)?;
        Ok(())
    }

    /// Send disruption alert to all clients
    pub async fn send_disruption_alert(
        &self,
        disruption: &DisruptionEvent,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let message = WsMessage::DisruptionAlert {
            disruption_id: disruption.id.clone(),
            disruption_type: disruption.disruption_type,
            affected_sections: disruption.affected_sections.clone(),
            impact_level: disruption.impact_level,
            description: disruption.description.clone(),
            timestamp: chrono::Utc::now(),
        };

        self.broadcast(message)?;
        Ok(())
    }

    /// Send train alert to all clients
    pub async fn send_train_alert(
        &self,
        alert: &TrainAlert,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let message = WsMessage::SystemAlert {
            alert_type: format!("{:?}", alert.alert_type),
            message: alert.message.clone(),
            severity: format!("{:?}", alert.severity),
            timestamp: alert.created_at,
        };

        self.broadcast(message)?;
        Ok(())
    }

    /// Send section update to subscribed clients
    pub async fn send_section_update(
        &self,
        section_id: &str,
        occupancy: u32,
        conflicts: Vec<String>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let message = WsMessage::SectionUpdate {
            section_id: section_id.to_string(),
            occupancy,
            conflicts,
            timestamp: Utc::now(),
        };

        self.broadcast(message)?;
        Ok(())
    }

    /// Get all trains subscribed by any client
    pub fn get_all_subscribed_trains(&self) -> Vec<String> {
        let clients = self.clients.lock().unwrap();
        let mut all_trains = HashSet::new();
        
        for client in clients.values() {
            all_trains.extend(client.subscribed_trains.iter().cloned());
        }
        
        all_trains.into_iter().collect()
    }

    /// Update client activity timestamp
    pub fn update_client_activity(&self, client_id: &str) {
        let mut clients = self.clients.lock().unwrap();
        if let Some(client) = clients.get_mut(client_id) {
            client.last_activity = Utc::now();
        }
    }

    /// Start background task for periodic train updates
    pub fn start_train_monitoring_loop(
        self: Arc<Self>,
        interval_seconds: u64,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let ws_manager = self.clone();
        let train_service = self.train_service.clone();
        
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(
                tokio::time::Duration::from_secs(interval_seconds)
            );
            
            loop {
                interval.tick().await;
                
                // Get all subscribed trains
                let subscribed_trains = ws_manager.get_all_subscribed_trains();
                if subscribed_trains.is_empty() {
                    continue;
                }
                
                // Send updates for subscribed trains
                for train_id in subscribed_trains {
                    if let Ok(Some(train)) = train_service.get_train_by_id(&train_id).await {
                        if let Err(e) = ws_manager.send_train_update(&train).await {
                            warn!("Failed to send train update for {}: {:?}", train_id, e);
                        }
                    }
                }
                
                // Check for and send alerts
                if let Ok(alerts) = train_service.generate_monitoring_alerts().await {
                    for alert in alerts {
                        if let Err(e) = ws_manager.send_train_alert(&alert).await {
                            warn!("Failed to send train alert: {:?}", e);
                        }
                    }
                }
                
                // Check for conflicts
                if let Ok(conflicts) = train_service.detect_train_conflicts().await {
                    for conflict in conflicts {
                        let alert_msg = WsMessage::SystemAlert {
                            alert_type: "ConflictDetected".to_string(),
                            message: format!("Conflict detected in section {} between trains", conflict.section_id),
                            severity: format!("{:?}", conflict.severity),
                            timestamp: conflict.detected_at,
                        };
                        
                        if let Err(e) = ws_manager.broadcast(alert_msg) {
                            warn!("Failed to send conflict alert: {:?}", e);
                        }
                    }
                }
            }
        });
        
        Ok(())
    }
}

/// WebSocket connection handler
pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> Response {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

/// Handle individual WebSocket connection
async fn handle_socket(socket: WebSocket, state: AppState) {
    let client_id = Uuid::new_v4().to_string();
    info!("New WebSocket connection: {}", client_id);

    // Create WebSocket manager with train service
    let ws_manager = WebSocketManager::new(state.train_service.clone());
    let mut receiver = ws_manager.sender.subscribe();

    // Add client to manager
    let client_info = ClientInfo {
        client_id: client_id.clone(),
        subscribed_trains: HashSet::new(),
        subscribed_sections: HashSet::new(),
        connected_at: Utc::now(),
        last_activity: Utc::now(),
    };
    ws_manager.add_client(client_id.clone(), client_info);

    // Send connection confirmation
    let connected_msg = WsMessage::Connected {
        client_id: client_id.clone(),
        timestamp: chrono::Utc::now(),
    };

    let (mut sender, mut receiver_ws) = socket.split();

    // Send initial connection message
    if let Ok(msg_text) = serde_json::to_string(&connected_msg) {
        if sender.send(Message::Text(msg_text)).await.is_err() {
            warn!("Failed to send connection confirmation to {}", client_id);
            return;
        }
    }

    // Handle incoming messages in one task
    let client_id_clone = client_id.clone();
    let ws_manager_clone = Arc::new(ws_manager);
    let ws_manager_for_cleanup = ws_manager_clone.clone();
    let handle_incoming = tokio::spawn(async move {
        while let Some(msg) = receiver_ws.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    if let Err(e) = handle_client_message(&text, &client_id_clone, &ws_manager_clone).await {
                        error!("Error handling client message: {:?}", e);
                    }
                }
                Ok(Message::Close(_)) => {
                    info!("Client {} requested close", client_id_clone);
                    break;
                }
                Err(e) => {
                    warn!("WebSocket error for client {}: {:?}", client_id_clone, e);
                    break;
                }
                _ => {}
            }
        }
    });

    // Handle outgoing broadcasts in another task
    let client_id_clone2 = client_id.clone();
    let handle_outgoing = tokio::spawn(async move {
        while let Ok(msg) = receiver.recv().await {
            if let Ok(msg_text) = serde_json::to_string(&msg) {
                if sender.send(Message::Text(msg_text)).await.is_err() {
                    warn!("Failed to send message to client {}", client_id_clone2);
                    break;
                }
            }
        }
    });

    // Wait for either task to complete
    tokio::select! {
        _ = handle_incoming => {},
        _ = handle_outgoing => {},
    }

    // Clean up
    ws_manager_for_cleanup.remove_client(&client_id);
}

/// Handle incoming client messages
async fn handle_client_message(
    text: &str,
    client_id: &str,
    ws_manager: &Arc<WebSocketManager>,
) -> Result<(), Box<dyn std::error::Error>> {
    let message: WsMessage = serde_json::from_str(text)?;
    
    match message {
        WsMessage::Subscribe { train_ids } => {
            info!("Client {} subscribing to trains: {:?}", client_id, train_ids);
            // Update client subscriptions
            let mut clients = ws_manager.clients.lock().unwrap();
            if let Some(client_info) = clients.get_mut(client_id) {
                client_info.subscribed_trains = train_ids.into_iter().collect();
                client_info.last_activity = Utc::now();
            }
        }
        WsMessage::SubscribeSection { section_ids } => {
            info!("Client {} subscribing to sections: {:?}", client_id, section_ids);
            // Update client subscriptions
            let mut clients = ws_manager.clients.lock().unwrap();
            if let Some(client_info) = clients.get_mut(client_id) {
                client_info.subscribed_sections = section_ids.into_iter().collect();
                client_info.last_activity = Utc::now();
            }
        }
        _ => {
            warn!("Unexpected message type from client {}", client_id);
        }
    }

    Ok(())
}
