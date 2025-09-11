'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  WsTrainUpdateMessage,
  WsSectionUpdateMessage,
  WsDisruptionAlertMessage,
  WsSystemAlertMessage,
  WsConnectedMessage,
  WsErrorMessage,
} from '@/types/api';
import { RailwayWebSocketClient, WebSocketEventHandlers } from '@/lib/websocket-client';
import { apiClient } from '@/lib/api-client';

// ============================================================================
// WebSocket Hook State
// ============================================================================

export interface UseWebSocketState {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  clientId: string | null;
  lastError: WsErrorMessage | null;
}

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  onTrainUpdate?: (update: WsTrainUpdateMessage) => void;
  onSectionUpdate?: (update: WsSectionUpdateMessage) => void;
  onDisruptionAlert?: (alert: WsDisruptionAlertMessage) => void;
  onSystemAlert?: (alert: WsSystemAlertMessage) => void;
  onError?: (error: WsErrorMessage) => void;
}

// ============================================================================
// Main WebSocket Hook
// ============================================================================

export function useWebSocket(options: UseWebSocketOptions = {}) {
  // Disable auto-connect in development if environment variable is set
  const shouldAutoConnect = options.autoConnect ?? (
    process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DISABLE_WS === 'true' 
      ? false 
      : true
  );
  const { autoConnect = shouldAutoConnect, ...eventHandlers } = options;
  
  const [state, setState] = useState<UseWebSocketState>({
    isConnected: false,
    isReconnecting: false,
    reconnectAttempts: 0,
    clientId: null,
    lastError: null,
  });

  const clientRef = useRef<RailwayWebSocketClient | null>(null);
  const [trainUpdates, setTrainUpdates] = useState<WsTrainUpdateMessage[]>([]);
  const [sectionUpdates, setSectionUpdates] = useState<WsSectionUpdateMessage[]>([]);
  const [disruptions, setDisruptions] = useState<WsDisruptionAlertMessage[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<WsSystemAlertMessage[]>([]);

  // Initialize WebSocket client
  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = new RailwayWebSocketClient();
    }

    const client = clientRef.current;

    // Set up event handlers
    const handlers: WebSocketEventHandlers = {
      onConnected: (info: WsConnectedMessage) => {
        console.log('🔌 WebSocket connected:', info.client_id);
        setState(prev => ({
          ...prev,
          isConnected: true,
          isReconnecting: false,
          clientId: info.client_id,
          lastError: null,
        }));
      },

      onConnectionChange: (isConnected: boolean) => {
        const connectionState = client.getConnectionState();
        setState(prev => ({
          ...prev,
          isConnected,
          isReconnecting: connectionState.isReconnecting,
          reconnectAttempts: connectionState.reconnectAttempts,
        }));
      },

      onTrainUpdate: (update: WsTrainUpdateMessage) => {
        setTrainUpdates(prev => [update, ...prev.slice(0, 99)]); // Keep last 100
        eventHandlers.onTrainUpdate?.(update);
      },

      onSectionUpdate: (update: WsSectionUpdateMessage) => {
        setSectionUpdates(prev => [update, ...prev.slice(0, 99)]); // Keep last 100
        eventHandlers.onSectionUpdate?.(update);
      },

      onDisruptionAlert: (alert: WsDisruptionAlertMessage) => {
        setDisruptions(prev => [alert, ...prev.slice(0, 49)]); // Keep last 50
        eventHandlers.onDisruptionAlert?.(alert);
      },

      onSystemAlert: (alert: WsSystemAlertMessage) => {
        setSystemAlerts(prev => [alert, ...prev.slice(0, 49)]); // Keep last 50
        eventHandlers.onSystemAlert?.(alert);
      },

      onError: (error: WsErrorMessage) => {
        setState(prev => ({ ...prev, lastError: error }));
        eventHandlers.onError?.(error);
      },
    };

    client.setEventHandlers(handlers);

    // Auto-connect if enabled and not in development mode without backend
    if (autoConnect) {
      // Add a small delay to avoid immediate connection attempts during SSR
      const connectTimeout = setTimeout(() => {
        client.connect().catch((error) => {
          // Silently handle connection errors in development
          if (process.env.NODE_ENV === 'development') {
            console.warn('🔌 WebSocket connection failed (this is normal if backend is not running)');
          } else {
            console.error('Failed to connect WebSocket:', error);
          }
        });
      }, 1000);
      
      return () => {
        clearTimeout(connectTimeout);
        client.disconnect();
      };
    }

    // Cleanup on unmount
    return () => {
      client.disconnect();
    };
  }, [autoConnect]);

  // ============================================================================
  // Connection Management
  // ============================================================================

  const connect = useCallback(async () => {
    if (clientRef.current) {
      try {
        await clientRef.current.connect();
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        throw error;
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
  }, []);

  // ============================================================================
  // Subscription Management
  // ============================================================================

  const subscribeToTrains = useCallback((trainIds: string[]) => {
    clientRef.current?.subscribeToTrains(trainIds);
  }, []);

  const unsubscribeFromTrains = useCallback((trainIds: string[]) => {
    clientRef.current?.unsubscribeFromTrains(trainIds);
  }, []);

  const subscribeToSections = useCallback((sectionIds: string[]) => {
    clientRef.current?.subscribeToSections(sectionIds);
  }, []);

  const unsubscribeFromSections = useCallback((sectionIds: string[]) => {
    clientRef.current?.unsubscribeFromSections(sectionIds);
  }, []);

  const clearAllSubscriptions = useCallback(() => {
    clientRef.current?.clearAllSubscriptions();
    setTrainUpdates([]);
    setSectionUpdates([]);
    setDisruptions([]);
    setSystemAlerts([]);
  }, []);

  const getSubscriptions = useCallback(() => {
    return clientRef.current?.getSubscriptions() || { trains: [], sections: [] };
  }, []);

  // ============================================================================
  // Data Management
  // ============================================================================

  const clearTrainUpdates = useCallback(() => {
    setTrainUpdates([]);
  }, []);

  const clearSectionUpdates = useCallback(() => {
    setSectionUpdates([]);
  }, []);

  const clearDisruptions = useCallback(() => {
    setDisruptions([]);
  }, []);

  const clearSystemAlerts = useCallback(() => {
    setSystemAlerts([]);
  }, []);

  const clearAllData = useCallback(() => {
    clearTrainUpdates();
    clearSectionUpdates();
    clearDisruptions();
    clearSystemAlerts();
  }, [clearTrainUpdates, clearSectionUpdates, clearDisruptions, clearSystemAlerts]);

  return {
    // Connection state
    ...state,
    
    // Connection methods
    connect,
    disconnect,
    
    // Subscription methods
    subscribeToTrains,
    unsubscribeFromTrains,
    subscribeToSections,
    unsubscribeFromSections,
    clearAllSubscriptions,
    getSubscriptions,
    
    // Real-time data
    trainUpdates,
    sectionUpdates,
    disruptions,
    systemAlerts,
    
    // Data management
    clearTrainUpdates,
    clearSectionUpdates,
    clearDisruptions,
    clearSystemAlerts,
    clearAllData,
  };
}

// ============================================================================
// Specialized WebSocket Hooks
// ============================================================================

// Enhanced hook for train monitoring with automatic subscription management
export function useTrainUpdates(trainIds: string[] = []) {
  const [updates, setUpdates] = useState<WsTrainUpdateMessage[]>([]);
  const [trainStates, setTrainStates] = useState<Map<string, WsTrainUpdateMessage>>(new Map());
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  const {
    isConnected,
    subscribeToTrains,
    unsubscribeFromTrains,
    connect,
  } = useWebSocket({
    autoConnect: false, // We'll manage connection manually
    onTrainUpdate: (update) => {
      setUpdates(prev => [update, ...prev.slice(0, 99)]);
      setTrainStates(prev => new Map(prev.set(update.train_id, update)));
      setLastUpdateTime(new Date());
    },
  });

  // Auto-connect for train monitoring
  useEffect(() => {
    if (!isConnected) {
      connect().catch((error) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('🔌 Could not connect to WebSocket for train updates (backend may not be running)');
        } else {
          console.error('Failed to connect for train updates:', error);
        }
      });
    }
  }, [isConnected, connect]);

  // Subscribe to trains when trainIds change
  useEffect(() => {
    if (isConnected && trainIds.length > 0) {
      subscribeToTrains(trainIds);
    }
    
    return () => {
      if (trainIds.length > 0) {
        unsubscribeFromTrains(trainIds);
      }
    };
  }, [trainIds, isConnected, subscribeToTrains, unsubscribeFromTrains]);

  const getTrainState = useCallback((trainId: string) => {
    return trainStates.get(trainId) || null;
  }, [trainStates]);

  const getLatestUpdate = useCallback((trainId: string) => {
    return updates.find(update => update.train_id === trainId) || null;
  }, [updates]);

  const clearUpdates = useCallback(() => {
    setUpdates([]);
    setTrainStates(new Map());
    setLastUpdateTime(null);
  }, []);

  // Convert updates to array format for easier consumption
  const updatesArray = useMemo(() => {
    return Array.from(trainStates.values());
  }, [trainStates]);

  return {
    updates: updatesArray,
    allUpdates: updates,
    trainStates: Object.fromEntries(trainStates),
    getTrainState,
    getLatestUpdate,
    clearUpdates,
    isConnected,
    lastUpdateTime,
    updateCount: updates.length
  };
}

export function useDisruptionAlerts() {
  const [alerts, setAlerts] = useState<WsDisruptionAlertMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const { isConnected } = useWebSocket({
    onDisruptionAlert: (alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 49)]);
      setUnreadCount(prev => prev + 1);
    },
  });

  const markAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    setUnreadCount(0);
  }, []);

  const removeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.disruption_id !== alertId));
  }, []);

  return {
    alerts,
    unreadCount,
    markAsRead,
    clearAlerts,
    removeAlert,
    isConnected,
  };
}

export function useSystemStatus() {
  const [systemAlerts, setSystemAlerts] = useState<WsSystemAlertMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<{
    backend: boolean;
    websocket: boolean;
    optimizer: boolean;
  }>({
    backend: false,
    websocket: false,
    optimizer: false,
  });

  const { isConnected } = useWebSocket({
    onSystemAlert: (alert) => {
      setSystemAlerts(prev => [alert, ...prev.slice(0, 19)]);
      
      // Update connection status based on alerts
      if (alert.alert_type === 'OptimizerStatus') {
        setConnectionStatus(prev => ({
          ...prev,
          optimizer: alert.severity === 'Low',
        }));
      }
    },
    onError: (error) => {
      setConnectionStatus(prev => ({
        ...prev,
        websocket: false,
      }));
    },
  });

  useEffect(() => {
    setConnectionStatus(prev => ({
      ...prev,
      websocket: isConnected,
    }));
  }, [isConnected]);

  // Check backend status periodically
  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        await apiClient.healthCheck();
        setConnectionStatus(prev => ({ ...prev, backend: true }));
      } catch {
        setConnectionStatus(prev => ({ ...prev, backend: false }));
      }
    };

    checkBackendStatus();
    const interval = setInterval(checkBackendStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    systemAlerts,
    connectionStatus,
    isConnected,
  };
}
