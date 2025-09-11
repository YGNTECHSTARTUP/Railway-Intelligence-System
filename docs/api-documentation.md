# Railway Intelligence System - Backend API Documentation

This document provides comprehensive documentation for all API endpoints, WebSocket connections, and data models for the Railway Intelligence System backend, designed for frontend integration.

## Table of Contents

1. [Base Configuration](#base-configuration)
2. [Authentication](#authentication)
3. [Train Management APIs](#train-management-apis)
4. [Optimization APIs](#optimization-apis)
5. [Simulation APIs](#simulation-apis)
6. [Analytics APIs](#analytics-apis)
7. [Data Ingestion APIs](#data-ingestion-apis)
8. [Section Management APIs](#section-management-apis)
9. [WebSocket Real-time Communication](#websocket-real-time-communication)
10. [Data Models](#data-models)
11. [Error Handling](#error-handling)
12. [Authentication & Authorization](#authentication--authorization)

---

## Base Configuration

**Base URL**: `http://localhost:3001`
**API Version**: `v1`
**Content-Type**: `application/json`

### Health Check
**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "healthy",
  "service": "railway-backend",
  "timestamp": "2023-12-01T10:30:00Z"
}
```

---

## Authentication

All API endpoints (except `/health`) require JWT authentication via the `Authorization: Bearer <token>` header.

### Login
**Endpoint**: `POST /api/v1/auth/login`

**Request**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_admin_001",
    "username": "admin",
    "email": "admin@railway.gov.in",
    "role": "Admin"
  },
  "expires_at": "2023-12-02T10:30:00Z"
}
```

**Available Users**:
- Username: `admin`, Password: `admin123`, Role: `Admin`
- Username: `operator`, Password: `operator123`, Role: `Operator`
- Username: `viewer`, Password: `viewer123`, Role: `Viewer`

### Logout
**Endpoint**: `POST /api/v1/auth/logout`
**Auth Required**: Yes

**Response**:
```json
{
  "message": "Logged out successfully",
  "timestamp": "2023-12-01T10:30:00Z"
}
```

### Get User Info
**Endpoint**: `GET /api/v1/auth/user`
**Auth Required**: Yes

**Response**:
```json
{
  "id": "user_admin_001",
  "username": "admin",
  "email": "admin@railway.gov.in",
  "role": "Admin"
}
```

---

## Train Management APIs

### Get Train Status
**Endpoint**: `GET /api/v1/trains/status`
**Auth Required**: Yes

**Query Parameters**:
- `status` (optional): Filter by train status (`Scheduled`, `Running`, `Delayed`, `AtStation`, `Terminated`, `Cancelled`)
- `section_id` (optional): Filter by section ID
- `priority` (optional): Filter by priority (`Emergency`, `Mail`, `Express`, `Passenger`, `Freight`, `Maintenance`)
- `delayed_only` (optional): Boolean, show only delayed trains
- `limit` (optional): Limit number of results

**Example**: `GET /api/v1/trains/status?status=Running&limit=10`

**Response**:
```json
{
  "trains": [
    {
      "id": "train_12345",
      "train_number": 12345,
      "name": "Rajdhani Express",
      "priority": "Express",
      "current_section": "SEC001",
      "position": {
        "latitude": 28.6139,
        "longitude": 77.2090
      },
      "delay_minutes": 5,
      "eta_next_station": "2023-12-01T11:30:00Z",
      "speed_kmh": 85.5,
      "direction": "Up",
      "status": "Running",
      "route": ["NDLS", "AGC", "JHS", "BPL", "NGP", "SECB"],
      "updated_at": "2023-12-01T10:25:00Z"
    }
  ],
  "total_count": 1,
  "delayed_count": 1,
  "on_time_count": 0,
  "average_delay_minutes": 5.0,
  "timestamp": "2023-12-01T10:30:00Z"
}
```

### Get Train by ID
**Endpoint**: `GET /api/v1/trains/{train_id}`
**Auth Required**: Yes

**Response**:
```json
{
  "id": "train_12345",
  "train_number": 12345,
  "name": "Rajdhani Express",
  "priority": "Express",
  "current_section": "SEC001",
  "position": {
    "latitude": 28.6139,
    "longitude": 77.2090
  },
  "delay_minutes": 5,
  "eta_next_station": "2023-12-01T11:30:00Z",
  "speed_kmh": 85.5,
  "direction": "Up",
  "status": "Running",
  "route": ["NDLS", "AGC", "JHS", "BPL", "NGP", "SECB"],
  "updated_at": "2023-12-01T10:25:00Z"
}
```

### Update Train Status
**Endpoint**: `POST /api/v1/trains/{train_id}/update`
**Auth Required**: Yes
**Roles**: Admin, Operator

**Request**:
```json
{
  "position": {
    "latitude": 28.6139,
    "longitude": 77.2090
  },
  "speed_kmh": 75.0,
  "delay_minutes": 8,
  "status": "Delayed",
  "current_section": "SEC002"
}
```

**Response**: Same as Get Train by ID

### Get Delayed Trains
**Endpoint**: `GET /api/v1/trains/delayed`
**Auth Required**: Yes

**Response**: Same structure as Get Train Status, but only delayed trains

### Get Trains in Section
**Endpoint**: `GET /api/v1/trains/section/{section_id}`
**Auth Required**: Yes

**Response**: Same structure as Get Train Status, filtered by section

### Create Train
**Endpoint**: `POST /api/v1/trains`
**Auth Required**: Yes
**Roles**: Admin, Operator

**Request**:
```json
{
  "train_number": 12345,
  "name": "Rajdhani Express",
  "priority": "Express",
  "route": ["NDLS", "AGC", "JHS", "BPL", "NGP", "SECB"],
  "current_section": "SEC001",
  "position": {
    "latitude": 28.6139,
    "longitude": 77.2090
  }
}
```

**Response**: Same as Get Train by ID

---

## Optimization APIs

### Optimize Schedule
**Endpoint**: `POST /api/v1/optimize/schedule`
**Auth Required**: Yes
**Roles**: Admin, Operator

**Request**:
```json
{
  "section_id": "SEC001",
  "trains": [
    {
      "id": "train_12345",
      "train_number": 12345,
      "name": "Rajdhani Express",
      "priority": "Express",
      "current_section": "SEC001",
      "position": {
        "latitude": 28.6139,
        "longitude": 77.2090
      },
      "delay_minutes": 5,
      "eta_next_station": "2023-12-01T11:30:00Z",
      "speed_kmh": 85.5,
      "direction": "Up",
      "status": "Running",
      "route": ["NDLS", "AGC", "JHS"],
      "created_at": "2023-12-01T09:00:00Z",
      "updated_at": "2023-12-01T10:25:00Z"
    }
  ],
  "constraints": [
    {
      "constraint_type": "SafetyDistance",
      "priority": 1,
      "parameters": {
        "minimum_distance_meters": 1000
      }
    }
  ],
  "objective": "MinimizeDelay",
  "time_horizon_minutes": 240
}
```

**Constraint Types**:
- `SafetyDistance`: Minimum distance between trains
- `PlatformCapacity`: Platform occupancy limits
- `TrainPriority`: Priority-based scheduling
- `MaintenanceWindow`: Maintenance schedule constraints
- `SpeedLimit`: Section speed restrictions
- `CrossingTime`: Level crossing timing

**Optimization Objectives**:
- `MinimizeDelay`: Reduce total delay time
- `MaximizeThroughput`: Maximize trains processed
- `MinimizeEnergyConsumption`: Optimize for energy efficiency
- `BalancedOptimal`: Multi-objective optimization

**Response**:
```json
{
  "success": true,
  "optimized_schedule": [
    {
      "train_id": "train_12345",
      "new_departure_time": "2023-12-01T11:00:00Z",
      "new_arrival_time": "2023-12-01T13:00:00Z",
      "assigned_platform": "PF3",
      "speed_profile": [
        {
          "position_km": 0.0,
          "speed_kmh": 60.0,
          "time_offset_minutes": 0.0
        },
        {
          "position_km": 50.0,
          "speed_kmh": 80.0,
          "time_offset_minutes": 30.0
        }
      ],
      "delay_adjustment_minutes": -3
    }
  ],
  "objective_value": 95.5,
  "computation_time_ms": 500,
  "conflicts_resolved": 2,
  "total_delay_reduction_minutes": 15.2,
  "message": "Schedule optimized successfully using constraint programming"
}
```

---

## Simulation APIs

### Simulate Scenario
**Endpoint**: `POST /api/v1/simulate/scenario`
**Auth Required**: Yes
**Roles**: Admin, Operator

**Request**:
```json
{
  "scenario_name": "Peak Hour Analysis",
  "section_id": "SEC001",
  "base_trains": [
    {
      "id": "train_12345",
      "train_number": 12345,
      "name": "Rajdhani Express",
      "priority": "Express",
      "current_section": "SEC001",
      "position": {
        "latitude": 28.6139,
        "longitude": 77.2090
      },
      "delay_minutes": 0,
      "eta_next_station": "2023-12-01T11:30:00Z",
      "speed_kmh": 85.5,
      "direction": "Up",
      "status": "Running",
      "route": ["NDLS", "AGC", "JHS"],
      "created_at": "2023-12-01T09:00:00Z",
      "updated_at": "2023-12-01T10:25:00Z"
    }
  ],
  "what_if_changes": [
    {
      "change_type": "AddTrain",
      "train_id": null,
      "section_id": "SEC001",
      "parameters": {
        "train_number": 12347,
        "priority": "Passenger",
        "departure_time": "2023-12-01T11:45:00Z"
      }
    }
  ],
  "simulation_duration_hours": 4.0
}
```

**What-If Change Types**:
- `AddTrain`: Add a new train to the scenario
- `RemoveTrain`: Remove a train from the schedule
- `DelayTrain`: Introduce delay to a specific train
- `ChangeRoute`: Modify train route
- `BlockSection`: Block a section for maintenance
- `ChangeCapacity`: Modify section capacity

**Response**:
```json
{
  "success": true,
  "scenario_name": "Peak Hour Analysis",
  "simulation_results": {
    "total_trains_processed": 25,
    "average_delay_minutes": 12.8,
    "throughput_trains_per_hour": 18.5,
    "conflicts_detected": 2,
    "utilization_percent": 87.3,
    "timeline_events": [
      {
        "timestamp": "2023-12-01T11:00:00Z",
        "event_type": "TrainDeparture",
        "train_id": "T12345",
        "section_id": "SEC001",
        "description": "Express train departed on schedule"
      }
    ]
  },
  "performance_comparison": {
    "baseline_delay_minutes": 20.5,
    "scenario_delay_minutes": 12.8,
    "improvement_percent": 37.6,
    "baseline_throughput": 15.2,
    "scenario_throughput": 18.5,
    "throughput_improvement_percent": 21.7
  },
  "recommendations": [
    "Consider implementing dynamic platform assignment",
    "Optimize signal timing for peak hours",
    "Review freight train scheduling during passenger peak times"
  ]
}
```

---

## Analytics APIs

### Get KPIs
**Endpoint**: `GET /api/v1/analytics/kpis`
**Auth Required**: Yes

**Query Parameters**:
- `hours` (optional): Time period in hours (default: 24)
- `section_id` (optional): Filter by specific section

**Example**: `GET /api/v1/analytics/kpis?hours=12&section_id=SEC001`

**Response**:
```json
{
  "punctuality_percent": 94.2,
  "average_delay_minutes": 8.5,
  "throughput_trains_per_hour": 16.8,
  "utilization_percent": 75.0,
  "conflicts_resolved": 12,
  "total_trains_processed": 247,
  "period_hours": 12,
  "timestamp": "2023-12-01T10:30:00Z"
}
```

### Get System Overview
**Endpoint**: `GET /api/v1/analytics/overview`
**Auth Required**: Yes

**Response**:
```json
{
  "total_active_trains": 247,
  "delayed_trains": 23,
  "on_time_trains": 224,
  "total_sections": 50,
  "active_disruptions": 2,
  "system_utilization": 68.5,
  "average_speed_kmh": 78.3,
  "last_updated": "2023-12-01T10:30:00Z"
}
```

### Get Section Analytics
**Endpoint**: `GET /api/v1/analytics/sections`
**Auth Required**: Yes

**Query Parameters**:
- `hours` (optional): Time period in hours (default: 24)

**Response**:
```json
[
  {
    "section_id": "SEC001",
    "section_name": "Delhi-Gurgaon",
    "trains_processed": 25,
    "average_delay": 8.5,
    "utilization_percent": 85.0,
    "conflicts": 2,
    "capacity_utilization": 75.0
  },
  {
    "section_id": "SEC002",
    "section_name": "Mumbai-Pune",
    "trains_processed": 32,
    "average_delay": 15.2,
    "utilization_percent": 92.0,
    "conflicts": 5,
    "capacity_utilization": 88.0
  }
]
```

---

## Data Ingestion APIs

### Trigger Manual Ingestion
**Endpoint**: `POST /api/v1/ingestion/trigger`
**Auth Required**: Yes
**Roles**: Admin, Operator

**Response**:
```json
{
  "status": "success",
  "message": "Data ingestion completed",
  "report": {
    "trains_processed": 247,
    "stations_processed": 89,
    "events_generated": 156,
    "errors_encountered": 0,
    "processing_time_ms": 1250,
    "timestamp": "2023-12-01T10:30:00Z"
  }
}
```

### Get Ingestion Statistics
**Endpoint**: `GET /api/v1/ingestion/stats`
**Auth Required**: Yes

**Response**:
```json
{
  "status": "success",
  "stats": {
    "total_records_processed": 15847,
    "successful_ingestions": 15734,
    "failed_ingestions": 113,
    "average_processing_time_ms": 450,
    "last_ingestion": "2023-12-01T10:28:00Z",
    "uptime_hours": 72.5
  }
}
```

### Check API Health
**Endpoint**: `GET /api/v1/ingestion/health`
**Auth Required**: Yes
**Roles**: Admin, Operator, SystemMonitor

**Response**:
```json
{
  "status": "success",
  "overall_health": "healthy",
  "api_status": {
    "railway_api": true,
    "weather_api": true,
    "traffic_api": false,
    "signal_api": true
  },
  "timestamp": "2023-12-01T10:30:00Z"
}
```

---

## Section Management APIs

### Get Section State
**Endpoint**: `GET /api/v1/sections/{section_id}/state`
**Auth Required**: Yes

**Response**:
```json
{
  "section_id": "SEC001",
  "status": "active",
  "occupancy": 5,
  "capacity": 20,
  "trains": []
}
```

---

## WebSocket Real-time Communication

### Connection
**Endpoint**: `ws://localhost:3001/ws`
**Protocol**: WebSocket
**Auth Required**: Yes (via query parameter or header)

### Message Types

#### Client to Server Messages

**Subscribe to Train Updates**:
```json
{
  "type": "Subscribe",
  "train_ids": ["train_12345", "train_67890"]
}
```

**Subscribe to Section Updates**:
```json
{
  "type": "SubscribeSection",
  "section_ids": ["SEC001", "SEC002"]
}
```

#### Server to Client Messages

**Connection Confirmation**:
```json
{
  "type": "Connected",
  "client_id": "client_uuid_123",
  "timestamp": "2023-12-01T10:30:00Z"
}
```

**Train Position Update**:
```json
{
  "type": "TrainUpdate",
  "train_id": "train_12345",
  "position": {
    "latitude": 28.6139,
    "longitude": 77.2090
  },
  "speed_kmh": 85.5,
  "delay_minutes": 5,
  "status": "Running",
  "timestamp": "2023-12-01T10:30:00Z"
}
```

**Section Status Update**:
```json
{
  "type": "SectionUpdate",
  "section_id": "SEC001",
  "occupancy": 5,
  "conflicts": ["conflict_001"],
  "timestamp": "2023-12-01T10:30:00Z"
}
```

**Disruption Alert**:
```json
{
  "type": "DisruptionAlert",
  "disruption_id": "disruption_001",
  "disruption_type": "SignalFailure",
  "affected_sections": ["SEC001", "SEC002"],
  "impact_level": 7,
  "description": "Signal failure causing delays on Western Line",
  "timestamp": "2023-12-01T10:30:00Z"
}
```

**System Alert**:
```json
{
  "type": "SystemAlert",
  "alert_type": "HighTraffic",
  "message": "High traffic detected on Central Line",
  "severity": "Medium",
  "timestamp": "2023-12-01T10:30:00Z"
}
```

**Error Message**:
```json
{
  "type": "Error",
  "message": "Invalid subscription request",
  "timestamp": "2023-12-01T10:30:00Z"
}
```

---

## Data Models

### Train Model
```typescript
interface Train {
  id: string;
  train_number: number;
  name: string;
  priority: TrainPriority;
  current_section: string;
  position: GeoPoint;
  delay_minutes: number;
  eta_next_station: string; // ISO 8601 datetime
  speed_kmh: number;
  direction: Direction;
  status: TrainStatus;
  route: string[]; // Station codes
  created_at: string; // ISO 8601 datetime
  updated_at: string; // ISO 8601 datetime
}
```

### Enums
```typescript
enum TrainPriority {
  Emergency = 1,
  Mail = 2,
  Express = 3,
  Passenger = 4,
  Freight = 5,
  Maintenance = 6
}

enum TrainStatus {
  Scheduled = "Scheduled",
  Running = "Running",
  Delayed = "Delayed",
  AtStation = "AtStation",
  Terminated = "Terminated",
  Cancelled = "Cancelled"
}

enum Direction {
  Up = "Up",
  Down = "Down"
}

enum UserRole {
  Admin = "Admin",
  Operator = "Operator",
  Viewer = "Viewer",
  SystemMonitor = "SystemMonitor"
}

enum SectionStatus {
  Active = "Active",
  Maintenance = "Maintenance",
  Blocked = "Blocked",
  Closed = "Closed"
}

enum DisruptionType {
  Weather = "Weather",
  SignalFailure = "SignalFailure",
  TrackMaintenance = "TrackMaintenance",
  Accident = "Accident",
  StrikeFactor = "StrikeFactor",
  PowerFailure = "PowerFailure",
  RollingStockFailure = "RollingStockFailure"
}
```

### Geographic Point
```typescript
interface GeoPoint {
  latitude: number;
  longitude: number;
}
```

### Railway Section
```typescript
interface RailwaySection {
  id: string;
  name: string;
  start_coordinates: GeoPoint;
  end_coordinates: GeoPoint;
  length_km: number;
  track_type: TrackType;
  max_speed_kmh: number;
  capacity_trains_per_hour: number;
  current_occupancy: number;
  status: SectionStatus;
  signals: string[];
  created_at: string;
  updated_at: string;
}
```

### Events
```typescript
interface TrainEvent {
  id: string;
  train_id: string;
  event_type: TrainEventType;
  location: GeoPoint;
  station_code?: string;
  section_id?: string;
  timestamp: string;
  metadata: EventMetadata;
}

interface EventMetadata {
  speed_kmh?: number;
  delay_minutes?: number;
  platform?: number;
  reason?: string;
  severity: EventSeverity;
}

enum TrainEventType {
  Departure = "Departure",
  Arrival = "Arrival",
  Delay = "Delay",
  SpeedChange = "SpeedChange",
  RouteChange = "RouteChange",
  Breakdown = "Breakdown",
  Emergency = "Emergency"
}

enum EventSeverity {
  Low = "Low",
  Medium = "Medium",
  High = "High",
  Critical = "Critical"
}
```

---

## Error Handling

### HTTP Status Codes
- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data or validation error
- `401 Unauthorized`: Authentication required or invalid token
- `403 Forbidden`: Insufficient permissions for the operation
- `404 Not Found`: Requested resource not found
- `409 Conflict`: Resource conflict (e.g., duplicate train number)
- `500 Internal Server Error`: Server-side error

### Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid train number format",
    "details": {
      "field": "train_number",
      "value": "invalid_value",
      "expected": "positive_integer"
    },
    "timestamp": "2023-12-01T10:30:00Z"
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Request validation failed
- `NOT_FOUND`: Resource not found
- `UNAUTHORIZED`: Authentication failed
- `FORBIDDEN`: Access denied
- `CONFLICT`: Resource conflict
- `SERVICE_UNAVAILABLE`: External service unavailable
- `OPTIMIZATION_FAILED`: OR-Tools optimization failed
- `SIMULATION_FAILED`: Simulation processing failed

---

## Authentication & Authorization

### Role-Based Access Control

#### Admin Role
- Full access to all endpoints
- Can create, update, delete trains
- Can trigger manual data ingestion
- Can access all analytics and monitoring data
- Can manage user accounts (future feature)

#### Operator Role
- Can view and update train statuses
- Can run optimizations and simulations
- Can trigger manual data ingestion
- Can access analytics and monitoring data
- Cannot access admin-specific functions

#### Viewer Role
- Read-only access to train data
- Can view analytics and dashboards
- Cannot modify any data
- Cannot trigger operations

#### SystemMonitor Role
- Can view all system data
- Can access health checks and monitoring endpoints
- Can view ingestion statistics
- Cannot modify operational data

### JWT Token Structure
```json
{
  "sub": "user_id",
  "username": "admin",
  "role": "Admin",
  "exp": 1701432600,
  "iat": 1701346200
}
```

### Token Validation
- Tokens expire after 24 hours
- Include token in `Authorization: Bearer <token>` header
- Token validation occurs on every protected endpoint request

---

## Frontend Integration Examples

### React/TypeScript Integration

#### API Client Setup
```typescript
// api/client.ts
export class RailwayApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('railway_auth_token');
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Authentication
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    this.token = response.token;
    localStorage.setItem('railway_auth_token', response.token);
    return response;
  }

  // Train APIs
  async getTrainStatus(params?: TrainStatusQuery): Promise<TrainStatusResponse> {
    const queryString = new URLSearchParams(params as any).toString();
    return this.request<TrainStatusResponse>(`/api/v1/trains/status?${queryString}`);
  }

  async getTrainById(trainId: string): Promise<TrainStatusInfo> {
    return this.request<TrainStatusInfo>(`/api/v1/trains/${trainId}`);
  }

  async updateTrainStatus(trainId: string, update: TrainUpdateRequest): Promise<TrainStatusInfo> {
    return this.request<TrainStatusInfo>(`/api/v1/trains/${trainId}/update`, {
      method: 'POST',
      body: JSON.stringify(update),
    });
  }

  // Optimization APIs
  async optimizeSchedule(request: OptimizationRequest): Promise<OptimizationResponse> {
    return this.request<OptimizationResponse>('/api/v1/optimize/schedule', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Analytics APIs
  async getKPIs(hours?: number, sectionId?: string): Promise<KPIResponse> {
    const params = new URLSearchParams();
    if (hours) params.append('hours', hours.toString());
    if (sectionId) params.append('section_id', sectionId);
    
    return this.request<KPIResponse>(`/api/v1/analytics/kpis?${params}`);
  }

  async getSystemOverview(): Promise<SystemOverview> {
    return this.request<SystemOverview>('/api/v1/analytics/overview');
  }
}
```

#### WebSocket Integration
```typescript
// websocket/client.ts
export class RailwayWebSocketClient {
  private ws: WebSocket | null = null;
  private baseUrl: string;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(baseUrl: string = 'ws://localhost:3001') {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('railway_auth_token');
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.baseUrl}/ws`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  subscribeToTrains(trainIds: string[]): void {
    this.send({
      type: 'Subscribe',
      train_ids: trainIds,
    });
  }

  subscribeToSections(sectionIds: string[]): void {
    this.send({
      type: 'SubscribeSection',
      section_ids: sectionIds,
    });
  }

  private send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'TrainUpdate':
        this.onTrainUpdate?.(message);
        break;
      case 'SectionUpdate':
        this.onSectionUpdate?.(message);
        break;
      case 'DisruptionAlert':
        this.onDisruptionAlert?.(message);
        break;
      case 'SystemAlert':
        this.onSystemAlert?.(message);
        break;
      case 'Connected':
        this.onConnected?.(message);
        break;
      case 'Error':
        this.onError?.(message);
        break;
    }
  }

  // Event handlers (to be set by consumer)
  onTrainUpdate?: (update: any) => void;
  onSectionUpdate?: (update: any) => void;
  onDisruptionAlert?: (alert: any) => void;
  onSystemAlert?: (alert: any) => void;
  onConnected?: (info: any) => void;
  onError?: (error: any) => void;

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;
      console.log(`Attempting to reconnect in ${delay}ms...`);
      
      setTimeout(() => {
        this.connect().catch(console.error);
      }, delay);
    }
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }
}
```

#### React Hook for WebSocket
```typescript
// hooks/useWebSocket.ts
import { useEffect, useState, useCallback } from 'react';
import { RailwayWebSocketClient } from '../websocket/client';

export function useRailwayWebSocket() {
  const [client, setClient] = useState<RailwayWebSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [trainUpdates, setTrainUpdates] = useState<any[]>([]);
  const [disruptions, setDisruptions] = useState<any[]>([]);

  useEffect(() => {
    const wsClient = new RailwayWebSocketClient();
    
    wsClient.onConnected = () => {
      setIsConnected(true);
    };

    wsClient.onTrainUpdate = (update) => {
      setTrainUpdates(prev => [update, ...prev.slice(0, 99)]); // Keep last 100
    };

    wsClient.onDisruptionAlert = (alert) => {
      setDisruptions(prev => [alert, ...prev]);
    };

    wsClient.connect().then(() => {
      setClient(wsClient);
    }).catch(console.error);

    return () => {
      wsClient.disconnect();
      setIsConnected(false);
    };
  }, []);

  const subscribeToTrains = useCallback((trainIds: string[]) => {
    client?.subscribeToTrains(trainIds);
  }, [client]);

  const subscribeToSections = useCallback((sectionIds: string[]) => {
    client?.subscribeToSections(sectionIds);
  }, [client]);

  return {
    isConnected,
    trainUpdates,
    disruptions,
    subscribeToTrains,
    subscribeToSections,
  };
}
```

### Usage in React Components
```typescript
// components/TrainMonitor.tsx
import { useEffect, useState } from 'react';
import { RailwayApiClient } from '../api/client';
import { useRailwayWebSocket } from '../hooks/useWebSocket';

export function TrainMonitor() {
  const [trains, setTrains] = useState<TrainStatusInfo[]>([]);
  const { isConnected, trainUpdates, subscribeToTrains } = useRailwayWebSocket();
  const apiClient = new RailwayApiClient();

  useEffect(() => {
    // Load initial train data
    apiClient.getTrainStatus().then(response => {
      setTrains(response.trains);
      // Subscribe to real-time updates
      const trainIds = response.trains.map(t => t.id);
      subscribeToTrains(trainIds);
    });
  }, []);

  useEffect(() => {
    // Update trains with real-time data
    trainUpdates.forEach(update => {
      setTrains(prev => prev.map(train => 
        train.id === update.train_id 
          ? { ...train, ...update }
          : train
      ));
    });
  }, [trainUpdates]);

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      {trains.map(train => (
        <TrainCard key={train.id} train={train} />
      ))}
    </div>
  );
}
```

---

## Rate Limiting & Performance

### Rate Limits
- Authentication endpoints: 5 requests/minute per IP
- Train status endpoints: 60 requests/minute per user
- Optimization endpoints: 10 requests/minute per user
- WebSocket connections: 5 concurrent connections per user

### Caching
- Train status data: Cached for 30 seconds
- Analytics data: Cached for 5 minutes
- Section data: Cached for 2 minutes

### Performance Considerations
- Use WebSocket for real-time data instead of polling
- Implement client-side caching for static data
- Use pagination for large datasets
- Optimize queries with appropriate filters

---

## Environment Configuration

### Backend Configuration
```env
# Server Configuration
RUST_LOG=info
SERVER_HOST=0.0.0.0
SERVER_PORT=3001

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/railway_db

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY_HOURS=24

# OR-Tools gRPC Service
OPTIMIZER_SERVICE_URL=http://localhost:50051
OPTIMIZER_TIMEOUT_SECONDS=30

# Redis Cache
REDIS_URL=redis://localhost:6379

# Monitoring
METRICS_ENABLED=true
PROMETHEUS_PORT=9090
```

### Frontend Configuration
```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:3001

# Authentication
NEXT_PUBLIC_JWT_STORAGE_KEY=railway_auth_token

# Feature Flags
NEXT_PUBLIC_ENABLE_REAL_TIME=true
NEXT_PUBLIC_ENABLE_SIMULATIONS=true
```

---

## Integration Checklist

### Frontend Integration Steps
1. ✅ Install HTTP client (fetch/axios)
2. ✅ Set up API client with authentication
3. ✅ Implement WebSocket client for real-time updates
4. ✅ Create TypeScript interfaces matching backend models
5. ✅ Set up error handling and loading states
6. ✅ Implement authentication flow
7. ✅ Create reusable hooks for API calls
8. ✅ Add real-time data synchronization
9. ✅ Implement offline/error state handling
10. ✅ Add performance optimization (caching, debouncing)

### Testing Endpoints
```bash
# Health check
curl http://localhost:3001/health

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get train status (with auth token)
curl http://localhost:3001/api/v1/trains/status \
  -H "Authorization: Bearer <your_token_here>"

# WebSocket connection test
wscat -c ws://localhost:3001/ws
```

### Docker Development Setup
```yaml
# docker-compose.yml for development
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/railway_db
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
      - NEXT_PUBLIC_WS_BASE_URL=ws://localhost:3001
    depends_on:
      - backend

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: railway_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

---

## Additional Notes

### Security Considerations
- Always use HTTPS in production
- Implement rate limiting on all endpoints
- Validate and sanitize all input data
- Use environment variables for sensitive configuration
- Implement proper CORS policies
- Consider implementing refresh tokens for long-lived sessions

### Monitoring & Observability
- Metrics endpoint available at `/metrics` (Prometheus format)
- Structured logging with correlation IDs
- Health checks for all external dependencies
- Performance metrics for optimization operations

### Scalability Features
- Horizontal scaling support via stateless design
- Redis-based session storage
- Load balancer ready (no server-side state)
- Async processing for heavy operations
- Connection pooling for database operations

---

## Support & Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if backend is running on correct port
   - Verify CORS configuration
   - Ensure authentication token is valid

2. **API Authentication Errors**
   - Verify JWT token is included in headers
   - Check token expiration
   - Confirm user role has required permissions

3. **Optimization Timeouts**
   - Large optimization requests may take longer
   - Consider reducing time horizon or train count
   - Monitor OR-Tools service health

4. **Real-time Data Not Updating**
   - Check WebSocket connection status
   - Verify subscription to correct train/section IDs
   - Monitor for network connectivity issues

### Debug Endpoints
- `GET /health` - Service health check
- `GET /metrics` - Prometheus metrics
- `GET /api/v1/ingestion/health` - External API health status

For additional support, check the application logs and monitoring dashboards.
