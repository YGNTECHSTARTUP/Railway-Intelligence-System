use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::Response,
};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};
use tokio::sync::broadcast;
use tracing::{info, warn, error};
use futures_util::{SinkExt, StreamExt};
use crate::{AppState, models::*};

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
}

#[derive(Debug, Clone)]
pub struct ClientInfo {
    pub client_id: String,
    pub subscribed_trains: Vec<String>,
    pub subscribed_sections: Vec<String>,
    pub connected_at: chrono::DateTime<chrono::Utc>,
}

impl WebSocketManager {
    pub fn new() -> Self {
        let (sender, _) = broadcast::channel(1000);
        Self {
            sender,
            clients: Arc::new(Mutex::new(HashMap::new())),
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
}

/// WebSocket connection handler
pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> Response {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

/// Handle individual WebSocket connection
async fn handle_socket(socket: WebSocket, _state: AppState) {
    let client_id = uuid::Uuid::new_v4().to_string();
    info!("New WebSocket connection: {}", client_id);

    // Create WebSocket manager if not exists (should be in AppState)
    let ws_manager = WebSocketManager::new();
    let mut receiver = ws_manager.sender.subscribe();

    // Add client to manager
    let client_info = ClientInfo {
        client_id: client_id.clone(),
        subscribed_trains: Vec::new(),
        subscribed_sections: Vec::new(),
        connected_at: chrono::Utc::now(),
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
                client_info.subscribed_trains = train_ids;
            }
        }
        WsMessage::SubscribeSection { section_ids } => {
            info!("Client {} subscribing to sections: {:?}", client_id, section_ids);
            // Update client subscriptions
            let mut clients = ws_manager.clients.lock().unwrap();
            if let Some(client_info) = clients.get_mut(client_id) {
                client_info.subscribed_sections = section_ids;
            }
        }
        _ => {
            warn!("Unexpected message type from client {}", client_id);
        }
    }

    Ok(())
}
