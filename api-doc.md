# Railway Intelligence System - API Documentation

## Overview

The Railway Intelligence System provides a comprehensive REST API for managing train operations, optimization, analytics, and real-time monitoring. The API is built using Rust with Axum framework and includes authentication, real-time WebSocket connections, and extensive monitoring capabilities.

**Base URL**: `http://localhost:8000`
**API Version**: v1
**Authentication**: JWT Bearer Token

## Table of Contents

1. [Authentication](#authentication)
2. [Train Management](#train-management)
3. [Analytics & KPIs](#analytics--kpis)
4. [Optimization](#optimization)
5. [Simulation](#simulation)
6. [Section Management](#section-management)
7. [Data Ingestion](#data-ingestion)
8. [WebSocket Real-time Updates](#websocket-real-time-updates)
9. [System Monitoring](#system-monitoring)
10. [Error Handling](#error-handling)

---

## Authentication

### Login
**POST** `/api/v1/auth/login`

Authenticate user and receive JWT token.

#### Request Body
```json
{
  "username": "admin",
  "password": "admin123"
}
```

#### Response
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_admin_001",
    "username": "admin",
    "email": "admin@railway.gov.in",
    "role": "Admin"
  },
  "expires_at": "2024-01-15T12:00:00Z"
}
```

#### Demo Credentials
- **Admin**: `admin` / `admin123`
- **Operator**: `operator` / `operator123`
- **Viewer**: `viewer` / `viewer123`

### Get User Info
**GET** `/api/v1/auth/user`

Get current authenticated user information.

#### Headers
```
Authorization: Bearer <jwt_token>
```

#### Response
```json
{
  "id": "user_admin_001",
  "username": "admin",
  "email": "admin@railway.gov.in",
  "role": "Admin"
}
```

### Logout
**POST** `/api/v1/auth/logout`

Logout current user (invalidates token on client side).

#### Response
```json
{
  "message": "Logged out successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Train Management

### Get All Train Status
**GET** `/api/v1/trains/status`

Retrieve current status of all trains with optional filtering.

#### Query Parameters
- `status` (optional): Filter by train status (`Running`, `Delayed`, `AtStation`, `Scheduled`, `Terminated`, `Cancelled`)
- `section_id` (optional): Filter by section ID
- `priority` (optional): Filter by priority (`Emergency`, `Mail`, `Express`, `Passenger`, `Freight`, `Maintenance`)
- `delayed_only` (optional): `true` to show only delayed trains
- `limit` (optional): Limit number of results

#### Example Request
```bash
GET /api/v1/trains/status?status=Running&limit=10
```

#### Response
```json
{
  "trains": [
    {
      "id": "train_001",
      "train_number": 12249,
      "name": "Howrah Rajdhani Express",
      "priority": "Express",
      "current_section": "SEC001",
      "position": {
        "latitude": 28.6139,
        "longitude": 77.2090
      },
      "delay_minutes": 15,
      "eta_next_station": "2024-01-15T12:45:00Z",
      "speed_kmh": 85.5,
      "direction": "Up",
      "status": "Running",
      "route": ["NDLS", "GZB", "AGC", "JHS"],
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total_count": 25,
  "delayed_count": 8,
  "on_time_count": 17,
  "average_delay_minutes": 12.5,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Get Train by ID
**GET** `/api/v1/trains/{train_id}`

Get detailed information about a specific train.

#### Example Request
```bash
GET /api/v1/trains/train_001
```

#### Response
Same as individual train object in the trains array above.

### Create New Train
**POST** `/api/v1/trains`

Create a new train in the system.

#### Request Body
```json
{
  "train_number": 12345,
  "name": "New Express",
  "priority": "Express",
  "route": ["NDLS", "GZB", "AGC"],
  "current_section": "SEC001",
  "position": {
    "latitude": 28.6139,
    "longitude": 77.2090
  }
}
```

#### Response
Returns the created train object with generated ID.

### Update Train Status
**POST** `/api/v1/trains/{train_id}/update`

Update train position, status, or other attributes.

#### Request Body
```json
{
  "position": {
    "latitude": 28.7041,
    "longitude": 77.1025
  },
  "speed_kmh": 95.0,
  "delay_minutes": 5,
  "status": "Running",
  "current_section": "SEC002"
}
```

#### Response
Returns the updated train object.

### Get Delayed Trains
**GET** `/api/v1/trains/delayed`

Get all trains with delays (delay_minutes > 0).

#### Response
Same structure as `/trains/status` but filtered to delayed trains only.

### Get Trains in Section
**GET** `/api/v1/trains/section/{section_id}`

Get all trains currently in a specific section.

#### Example Request
```bash
GET /api/v1/trains/section/SEC001
```

#### Response
Same structure as `/trains/status` filtered by section.

---

## Analytics & KPIs

### Get Key Performance Indicators
**GET** `/api/v1/analytics/kpis`

Get system-wide KPIs and performance metrics.

#### Query Parameters
- `hours` (optional): Time period in hours (default: 24)
- `section_id` (optional): Filter by specific section

#### Example Request
```bash
GET /api/v1/analytics/kpis?hours=6&section_id=SEC001
```

#### Response
```json
{
  "punctuality_percent": 87.5,
  "average_delay_minutes": 8.2,
  "throughput_trains_per_hour": 12.8,
  "utilization_percent": 75.0,
  "conflicts_resolved": 3,
  "total_trains_processed": 156,
  "period_hours": 6,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Get System Overview
**GET** `/api/v1/analytics/overview`

Get high-level system status and overview.

#### Response
```json
{
  "total_active_trains": 45,
  "delayed_trains": 12,
  "on_time_trains": 33,
  "total_sections": 50,
  "active_disruptions": 2,
  "system_utilization": 68.5,
  "average_speed_kmh": 78.3,
  "last_updated": "2024-01-15T10:30:00Z"
}
```

### Get Section Analytics
**GET** `/api/v1/analytics/sections`

Get performance analytics for all sections.

#### Query Parameters
- `hours` (optional): Time period in hours (default: 24)

#### Response
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

## Optimization

### Optimize Schedule
**POST** `/api/v1/optimize/schedule`

Request schedule optimization for improved train flow and reduced delays.

#### Request Body
```json
{
  "section_id": "SEC001",
  "trains": [
    {
      "id": "train_001",
      "train_number": 12249,
      "name": "Howrah Rajdhani",
      "priority": "Express",
      "current_section": "SEC001",
      "position": {"latitude": 28.6139, "longitude": 77.2090},
      "delay_minutes": 15,
      "eta_next_station": "2024-01-15T12:45:00Z",
      "speed_kmh": 85.5,
      "direction": "Up",
      "status": "Running",
      "route": ["NDLS", "GZB", "AGC"]
    }
  ],
  "constraints": [
    {
      "constraint_type": "SafetyDistance",
      "priority": 1,
      "parameters": {"minimum_distance_km": 2.0}
    }
  ],
  "objective": "BalancedOptimal",
  "time_horizon_minutes": 120
}
```

#### Response
```json
{
  "success": true,
  "optimized_schedule": [
    {
      "train_id": "train_001",
      "new_departure_time": "2024-01-15T11:00:00Z",
      "new_arrival_time": "2024-01-15T13:00:00Z",
      "assigned_platform": "PF3",
      "speed_profile": [
        {"position_km": 0.0, "speed_kmh": 60.0, "time_offset_minutes": 0.0},
        {"position_km": 50.0, "speed_kmh": 80.0, "time_offset_minutes": 30.0}
      ],
      "delay_adjustment_minutes": -5
    }
  ],
  "objective_value": 95.5,
  "computation_time_ms": 500,
  "conflicts_resolved": 2,
  "total_delay_reduction_minutes": 18.5,
  "message": "Schedule optimized successfully using constraint programming"
}
```

---

## Simulation

### Simulate Scenario
**POST** `/api/v1/simulate/scenario`

Run "what-if" scenario simulations for planning and analysis.

#### Request Body
```json
{
  "scenario_name": "Peak Hour Load Test",
  "section_id": "SEC001",
  "base_trains": [
    {
      "id": "train_001",
      "train_number": 12249,
      "name": "Express Train",
      "priority": "Express",
      "route": ["NDLS", "GZB", "AGC"]
    }
  ],
  "what_if_changes": [
    {
      "change_type": "DelayTrain",
      "train_id": "train_001",
      "section_id": null,
      "parameters": {"delay_minutes": 30}
    }
  ],
  "simulation_duration_hours": 2.0
}
```

#### Response
```json
{
  "success": true,
  "scenario_name": "Peak Hour Load Test",
  "simulation_results": {
    "total_trains_processed": 25,
    "average_delay_minutes": 12.3,
    "throughput_trains_per_hour": 18.5,
    "conflicts_detected": 2,
    "utilization_percent": 82.0,
    "timeline_events": [
      {
        "timestamp": "2024-01-15T11:00:00Z",
        "event_type": "TrainDeparture",
        "train_id": "T12345",
        "section_id": "SEC001",
        "description": "Express train departed on schedule"
      }
    ]
  },
  "performance_comparison": {
    "baseline_delay_minutes": 18.5,
    "scenario_delay_minutes": 12.3,
    "improvement_percent": 33.5,
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

## Section Management

### Get Section State
**GET** `/api/v1/sections/{id}/state`

Get current state and status of a railway section.

#### Example Request
```bash
GET /api/v1/sections/SEC001/state
```

#### Response
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

## Data Ingestion

### Trigger Manual Ingestion
**POST** `/api/v1/ingestion/trigger`

Manually trigger data ingestion from external APIs (Admin/Operator only).

#### Headers
```
Authorization: Bearer <admin_or_operator_token>
```

#### Response
```json
{
  "status": "success",
  "message": "Data ingestion completed",
  "report": {
    "trains_processed": 45,
    "stations_processed": 12,
    "events_generated": 23,
    "errors_encountered": 0,
    "processing_time_ms": 1250,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Get Ingestion Statistics
**GET** `/api/v1/ingestion/stats`

Get statistics about data ingestion performance.

#### Response
```json
{
  "status": "success",
  "stats": {
    "total_records_processed": 12500,
    "successful_ingestions": 12350,
    "failed_ingestions": 150,
    "average_processing_time_ms": 125.5,
    "last_ingestion": "2024-01-15T10:25:00Z",
    "uptime_hours": 72.5
  }
}
```

### Check API Health
**GET** `/api/v1/ingestion/health`

Check health status of external APIs (Admin/Operator/SystemMonitor only).

#### Response
```json
{
  "status": "success",
  "overall_health": "healthy",
  "api_status": {
    "Indian Railways API": false,
    "Weather API": true
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## WebSocket Real-time Updates

### Connection
**WebSocket** `/ws`

Establish WebSocket connection for real-time updates.

#### Connection Example
```javascript
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onopen = function() {
    console.log('Connected to Railway Intelligence System');
};

ws.onmessage = function(event) {
    const message = JSON.parse(event.data);
    console.log('Received:', message);
};
```

#### Message Types

##### Subscribe to Train Updates
```json
{
  "type": "Subscribe",
  "train_ids": ["train_001", "train_002"]
}
```

##### Subscribe to Section Updates
```json
{
  "type": "SubscribeSection",
  "section_ids": ["SEC001", "SEC002"]
}
```

##### Received Train Update
```json
{
  "type": "TrainUpdate",
  "train_id": "train_001",
  "position": {"latitude": 28.6139, "longitude": 77.2090},
  "speed_kmh": 85.5,
  "delay_minutes": 10,
  "status": "Running",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

##### Received Disruption Alert
```json
{
  "type": "DisruptionAlert",
  "disruption_id": "disruption_001",
  "disruption_type": "Weather",
  "affected_sections": ["SEC001", "SEC002"],
  "impact_level": 7,
  "description": "Heavy fog affecting visibility",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## System Monitoring

### Health Check
**GET** `/health`

Basic system health check (no authentication required).

#### Response
```json
{
  "status": "healthy",
  "service": "railway-backend",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Metrics
**GET** `/metrics`

Prometheus-compatible metrics endpoint for monitoring.

#### Response
```
# HELP train_count Total number of active trains
# TYPE train_count gauge
train_count 45

# HELP average_delay_minutes Average delay across all trains
# TYPE average_delay_minutes gauge
average_delay_minutes 8.2

# HELP system_utilization_percent Overall system utilization
# TYPE system_utilization_percent gauge
system_utilization_percent 68.5
```

---

## Error Handling

### HTTP Status Codes

- **200 OK**: Successful request
- **400 Bad Request**: Invalid request parameters or validation errors
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: Insufficient permissions for the requested operation
- **404 Not Found**: Requested resource not found
- **409 Conflict**: Resource conflict (e.g., duplicate train number)
- **500 Internal Server Error**: Server-side error

### Error Response Format

```json
{
  "error": {
    "type": "ValidationError",
    "message": "Train number cannot be zero",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

---

## Data Models

### Train Object
```json
{
  "id": "string",
  "train_number": "number",
  "name": "string",
  "priority": "Emergency|Mail|Express|Passenger|Freight|Maintenance",
  "current_section": "string",
  "position": {
    "latitude": "number",
    "longitude": "number"
  },
  "delay_minutes": "number",
  "eta_next_station": "ISO8601 datetime",
  "speed_kmh": "number",
  "direction": "Up|Down",
  "status": "Scheduled|Running|Delayed|AtStation|Terminated|Cancelled",
  "route": ["array of station codes"],
  "created_at": "ISO8601 datetime",
  "updated_at": "ISO8601 datetime"
}
```

### Priority Levels
1. **Emergency** (1): Emergency services, medical trains
2. **Mail** (2): Mail and parcel trains
3. **Express** (3): Express passenger trains
4. **Passenger** (4): Regular passenger trains
5. **Freight** (5): Goods and freight trains
6. **Maintenance** (6): Maintenance and engineering trains

### User Roles & Permissions

#### Admin
- Full system access
- Create/modify trains and schedules
- Trigger manual ingestion
- View all analytics and monitoring data

#### Operator
- Train status updates
- Trigger manual ingestion
- View analytics
- Cannot modify system configuration

#### SystemMonitor
- View analytics and monitoring data
- Check API health
- Cannot modify system state

#### Viewer
- Read-only access to train status and basic analytics
- Cannot modify any data

---

## Rate Limiting

- **Default Rate Limit**: 100 requests per minute per client
- **Authentication Required**: Most endpoints require valid JWT token
- **Role-based Access**: Different endpoints require different user roles

---

## Configuration

The system can be configured via `config.toml` file or environment variables:

### Key Configuration Parameters

- **Server**: Host, port, CORS settings
- **Database**: SurrealDB connection details
- **Security**: JWT settings, rate limiting
- **Services**: Optimization, ingestion, WebSocket settings
- **Monitoring**: Prometheus metrics, logging levels

---

## Quick Start Guide

1. **Start the system**:
   ```bash
   cargo run --bin railway-backend
   ```

2. **Login**:
   ```bash
   curl -X POST http://localhost:8000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username": "admin", "password": "admin123"}'
   ```

3. **Get train status**:
   ```bash
   curl -H "Authorization: Bearer <token>" \
     http://localhost:8000/api/v1/trains/status
   ```

4. **Connect WebSocket**:
   ```javascript
   const ws = new WebSocket('ws://localhost:8000/ws');
   ```

---

## Support & Contact

For technical support or questions about the Railway Intelligence System API:

- **Documentation**: Available in `/backend/docs/`
- **Logs**: Available at `logs/railway-backend.log`
- **Metrics**: Available at `http://localhost:8000/metrics`
- **Health Check**: Available at `http://localhost:8000/health`
