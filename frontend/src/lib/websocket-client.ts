import {
  WsMessage,
  WsTrainUpdateMessage,
  WsSectionUpdateMessage,
  WsDisruptionAlertMessage,
  WsSystemAlertMessage,
  WsConnectedMessage,
  WsErrorMessage,
  WebSocketConfig,
} from '@/types/api';

export interface WebSocketEventHandlers {
  onConnected?: (info: WsConnectedMessage) => void;
  onTrainUpdate?: (update: WsTrainUpdateMessage) => void;
  onSectionUpdate?: (update: WsSectionUpdateMessage) => void;
  onDisruptionAlert?: (alert: WsDisruptionAlertMessage) => void;
  onSystemAlert?: (alert: WsSystemAlertMessage) => void;
  onError?: (error: WsErrorMessage) => void;
  onConnectionChange?: (isConnected: boolean) => void;
}

export class RailwayWebSocketClient {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private reconnectTimeoutId: NodeJS.Timeout | null = null;
  private heartbeatIntervalId: NodeJS.Timeout | null = null;
  private isConnected = false;
  private isReconnecting = false;
  private eventHandlers: WebSocketEventHandlers = {};
  
  // Subscription state
  private subscribedTrains = new Set<string>();
  private subscribedSections = new Set<string>();

  constructor(config?: Partial<WebSocketConfig>) {
    this.config = {
      url: process.env.NEXT_PUBLIC_WS_BASE_URL || 'ws://localhost:3001',
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      ...config,
    };
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  public async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.config.url}/ws`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('🔌 WebSocket connected to Railway Intelligence System');
          this.isConnected = true;
          this.isReconnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.eventHandlers.onConnectionChange?.(true);
          
          // Resubscribe to previous subscriptions
          this.resubscribe();
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WsMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
            this.eventHandlers.onError?.({
              type: 'Error',
              message: 'Failed to parse message',
              timestamp: new Date().toISOString(),
            });
          }
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket disconnected:', event.code, event.reason);
          this.isConnected = false;
          this.stopHeartbeat();
          this.eventHandlers.onConnectionChange?.(false);
          
          if (!this.isReconnecting && event.code !== 1000) {
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          // Only log error if we're not already reconnecting to avoid spam
          if (!this.isReconnecting) {
            console.warn('🔌 WebSocket connection failed, will attempt to reconnect');
          }
          this.eventHandlers.onError?.({
            type: 'Error',
            message: 'WebSocket connection error',
            timestamp: new Date().toISOString(),
          });
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  public disconnect(): void {
    this.isReconnecting = false;
    
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'User initiated disconnect');
      this.ws = null;
    }
    
    this.isConnected = false;
    this.eventHandlers.onConnectionChange?.(false);
  }

  public getConnectionState(): {
    isConnected: boolean;
    isReconnecting: boolean;
    reconnectAttempts: number;
  } {
    return {
      isConnected: this.isConnected,
      isReconnecting: this.isReconnecting,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  public setEventHandlers(handlers: WebSocketEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  public on<K extends keyof WebSocketEventHandlers>(
    event: K,
    handler: NonNullable<WebSocketEventHandlers[K]>
  ): void {
    this.eventHandlers[event] = handler;
  }

  public off<K extends keyof WebSocketEventHandlers>(event: K): void {
    delete this.eventHandlers[event];
  }

  // ============================================================================
  // Subscription Management
  // ============================================================================

  public subscribeToTrains(trainIds: string[]): void {
    trainIds.forEach(id => this.subscribedTrains.add(id));
    
    if (this.isConnected) {
      this.send({
        type: 'Subscribe',
        train_ids: trainIds,
      });
    }
  }

  public unsubscribeFromTrains(trainIds: string[]): void {
    trainIds.forEach(id => this.subscribedTrains.delete(id));
    
    if (this.isConnected) {
      this.send({
        type: 'Subscribe',
        train_ids: Array.from(this.subscribedTrains),
      });
    }
  }

  public subscribeToSections(sectionIds: string[]): void {
    sectionIds.forEach(id => this.subscribedSections.add(id));
    
    if (this.isConnected) {
      this.send({
        type: 'SubscribeSection',
        section_ids: sectionIds,
      });
    }
  }

  public unsubscribeFromSections(sectionIds: string[]): void {
    sectionIds.forEach(id => this.subscribedSections.delete(id));
    
    if (this.isConnected) {
      this.send({
        type: 'SubscribeSection',
        section_ids: Array.from(this.subscribedSections),
      });
    }
  }

  public clearAllSubscriptions(): void {
    this.subscribedTrains.clear();
    this.subscribedSections.clear();
  }

  public getSubscriptions(): {
    trains: string[];
    sections: string[];
  } {
    return {
      trains: Array.from(this.subscribedTrains),
      sections: Array.from(this.subscribedSections),
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private send(message: WsMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  private handleMessage(message: WsMessage): void {
    switch (message.type) {
      case 'Connected':
        console.log('🔌 WebSocket connection confirmed:', message.client_id);
        this.eventHandlers.onConnected?.(message);
        break;
        
      case 'TrainUpdate':
        this.eventHandlers.onTrainUpdate?.(message);
        break;
        
      case 'SectionUpdate':
        this.eventHandlers.onSectionUpdate?.(message);
        break;
        
      case 'DisruptionAlert':
        console.log('🚨 Disruption alert received:', message.description);
        this.eventHandlers.onDisruptionAlert?.(message);
        break;
        
      case 'SystemAlert':
        console.log('⚠️ System alert received:', message.message);
        this.eventHandlers.onSystemAlert?.(message);
        break;
        
      case 'Error':
        console.error('❌ WebSocket error:', message.message);
        this.eventHandlers.onError?.(message);
        break;
        
      default:
        console.warn('Unknown WebSocket message type:', message);
    }
  }

  private resubscribe(): void {
    if (this.subscribedTrains.size > 0) {
      this.send({
        type: 'Subscribe',
        train_ids: Array.from(this.subscribedTrains),
      });
    }

    if (this.subscribedSections.size > 0) {
      this.send({
        type: 'SubscribeSection',
        section_ids: Array.from(this.subscribedSections),
      });
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.reconnectAttempts) {
      console.error('🔌 Max reconnection attempts reached');
      this.eventHandlers.onError?.({
        type: 'Error',
        message: 'Max reconnection attempts reached',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;
    
    const delay = Math.pow(2, this.reconnectAttempts) * this.config.reconnectDelay;
    console.log(`🔌 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.reconnectAttempts})`);
    
    this.reconnectTimeoutId = setTimeout(() => {
      this.connect().catch((error) => {
        // Only log detailed errors on final attempt
        if (this.reconnectAttempts >= this.config.reconnectAttempts) {
          console.error('🔌 Final reconnection attempt failed:', error);
        } else {
          console.warn(`🔌 Reconnection attempt ${this.reconnectAttempts} failed, retrying...`);
        }
        this.attemptReconnect();
      });
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatIntervalId = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Send ping message (if backend supports it)
        // For now, just check connection state
        if (!this.isConnected) {
          this.attemptReconnect();
        }
      }
    }, 30000); // 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }
}

// ============================================================================
// WebSocket Manager for Multiple Instances
// ============================================================================

export class WebSocketManager {
  private static instance: RailwayWebSocketClient | null = null;
  private static subscribers = new Set<(client: RailwayWebSocketClient) => void>();

  public static getInstance(): RailwayWebSocketClient {
    if (!this.instance) {
      this.instance = new RailwayWebSocketClient();
      this.notifySubscribers();
    }
    return this.instance;
  }

  public static subscribe(callback: (client: RailwayWebSocketClient) => void): () => void {
    this.subscribers.add(callback);
    
    if (this.instance) {
      callback(this.instance);
    }
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private static notifySubscribers(): void {
    if (this.instance) {
      this.subscribers.forEach(callback => callback(this.instance!));
    }
  }

  public static async connect(): Promise<void> {
    const instance = this.getInstance();
    await instance.connect();
  }

  public static disconnect(): void {
    if (this.instance) {
      this.instance.disconnect();
      this.instance = null;
    }
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const websocketClient = WebSocketManager.getInstance();
export default websocketClient;
