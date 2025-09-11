# 🚂 Python Optimization Service - Integration Documentation

## 📋 Overview

The Python Optimization Service is a gRPC-based microservice that provides train schedule optimization capabilities using Google's OR-Tools. It acts as the computational brain of the Railway Intelligence System, handling complex optimization algorithms while maintaining high performance and scalability.

---

## 🏗️ Architecture Overview

```
┌─────────────────┐    gRPC/HTTP    ┌──────────────────┐    gRPC     ┌─────────────────────┐
│                 │    Requests     │                  │   Calls     │                     │
│  React Frontend │ ──────────────► │   Rust Backend   │ ──────────► │  Python Optimizer  │
│   (Port 3000)   │                 │   (Port 8080)    │             │   (Port 50051)      │
│                 │ ◄────────────── │                  │ ◄────────── │                     │
└─────────────────┘    JSON/WS      └──────────────────┘   Results   └─────────────────────┘
```

### Service Communication Flow:
1. **Frontend** → **Backend**: HTTP/WebSocket requests for optimization
2. **Backend** → **Python Service**: gRPC calls for heavy computation
3. **Python Service** → **Backend**: Optimization results via gRPC
4. **Backend** → **Frontend**: Processed results via JSON/WebSocket

---

## 🔧 Simple Server Implementation

### Current Status: ✅ Running

The `simple_server.py` is currently running and provides:

```python
class SimpleOptimizationService(optimization_pb2_grpc.OptimizationServiceServicer):
    """
    4 Core gRPC Endpoints:
    """
    
    # 1. Schedule Optimization
    def OptimizeSchedule(request, context) -> OptimizationResponse
    
    # 2. Scenario Simulation  
    def SimulateScenario(request, context) -> SimulationResponse
    
    # 3. Schedule Validation
    def ValidateSchedule(request, context) -> ValidationResponse
    
    # 4. Status Tracking
    def GetOptimizationStatus(request, context) -> StatusResponse
```

### Mock Response Examples

#### Optimization Response:
```json
{
  "request_id": "REQ_001",
  "status": "OPTIMAL",
  "reasoning": "Mock optimization completed successfully",
  "confidence_score": 0.95,
  "execution_time_ms": 500,
  "kpis": {
    "total_delay_minutes": 12.5,
    "average_delay_per_train": 2.1,
    "conflicts_resolved": 3,
    "throughput_trains_per_hour": 15.0,
    "utilization_percent": 87.5
  }
}
```

#### Simulation Response:
```json
{
  "request_id": "SIM_001",
  "success": true,
  "scenario_name": "Peak Hour Analysis",
  "simulation_results": {
    "total_trains_processed": 25,
    "average_delay_minutes": 6.2,
    "throughput_trains_per_hour": 18.0,
    "conflicts_detected": 1,
    "utilization_percent": 92.0
  },
  "recommendations": [
    "Implement smart signal coordination",
    "Consider adding express lanes"
  ]
}
```

---

## 🔗 Backend Integration Points

### Rust Backend gRPC Client Integration

The Rust backend needs to call the Python service. Here's how it should integrate:

#### 1. gRPC Client Configuration
```rust
// In backend/src/services/optimization_client.rs
use tonic::transport::Channel;

pub struct OptimizationClient {
    client: optimization_client::OptimizationServiceClient<Channel>,
}

impl OptimizationClient {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let channel = Channel::from_static("http://localhost:50051")
            .connect()
            .await?;
        
        Ok(Self {
            client: optimization_client::OptimizationServiceClient::new(channel),
        })
    }
    
    pub async fn optimize_schedule(&mut self, request: OptimizationRequest) 
        -> Result<OptimizationResponse, Status> {
        let response = self.client.optimize_schedule(request).await?;
        Ok(response.into_inner())
    }
}
```

#### 2. Backend API Endpoints
```rust
// In backend/src/routes/optimization.rs
use axum::{Json, extract::State};

#[derive(Serialize, Deserialize)]
pub struct OptimizeRequest {
    pub section_id: String,
    pub time_horizon_minutes: u32,
    pub trains: Vec<TrainInfo>,
    pub constraints: Vec<ConstraintInfo>,
}

pub async fn optimize_schedule(
    State(app_state): State<AppState>,
    Json(request): Json<OptimizeRequest>,
) -> Result<Json<OptimizationResult>, AppError> {
    // Convert HTTP request to gRPC request
    let grpc_request = convert_to_grpc_request(request);
    
    // Call Python optimization service
    let mut client = app_state.optimization_client.clone();
    let grpc_response = client.optimize_schedule(grpc_request).await?;
    
    // Convert gRPC response to HTTP response
    let http_response = convert_from_grpc_response(grpc_response);
    
    Ok(Json(http_response))
}
```

---

## 🌐 Frontend Integration Requirements

### Current Frontend State Analysis

Based on the conversation history, your frontend already has:
- ✅ API hooks for data fetching
- ✅ WebSocket connections for real-time updates
- ✅ Toast notifications via Sonner
- ✅ Proper TypeScript types

### Frontend Integration Status: ✅ READY

Great news! Your frontend is already well-prepared for optimization integration:

✅ **API Client**: Has `optimizeSchedule()` and `simulateScenario()` methods  
✅ **TypeScript Types**: Complete optimization types already defined  
✅ **API Hooks**: Generic `useApi()` hook ready for use  
✅ **Error Handling**: Robust error handling with retries  
✅ **Authentication**: JWT token management integrated  

#### Current API Client Methods:
```typescript
// Already implemented in src/lib/api-client.ts
async optimizeSchedule(request: OptimizationRequest): Promise<OptimizationResponse>
async simulateScenario(request: SimulationRequest): Promise<SimulationResponse>
```

#### Frontend TypeScript Types (Already Defined):
```typescript
// In src/types/api.ts
export interface OptimizationRequest {
  section_id: string;
  trains: Train[];
  constraints: OptimizationConstraint[];
  objective: OptimizationObjective;
  time_horizon_minutes: number;
}

export interface OptimizationResponse {
  success: boolean;
  optimized_schedule: TrainScheduleUpdate[];
  objective_value: number;
  computation_time_ms: number;
  conflicts_resolved: number;
  total_delay_reduction_minutes: number;
  message: string;
}

export interface SimulationRequest {
  scenario_name: string;
  section_id: string;
  base_trains: Train[];
  what_if_changes: WhatIfChange[];
  simulation_duration_hours: number;
}

export interface SimulationResponse {
  success: boolean;
  scenario_name: string;
  simulation_results: SimulationResults;
  performance_comparison: PerformanceComparison;
  recommendations: string[];
}
```

### Recommended Frontend Hooks (Optional Enhancement)

While your current API hooks work perfectly, here are some specialized hooks you could add for optimization:

```typescript
// src/hooks/useOptimization.ts
export function useOptimization(options?: UseApiOptions) {
  const [optimizing, setOptimizing] = useState(false);
  
  const optimize = useCallback(async (request: OptimizationRequest) => {
    setOptimizing(true);
    try {
      const result = await apiClient.optimizeSchedule(request);
      toast.success(`Optimization completed! ${result.conflicts_resolved} conflicts resolved.`);
      return result;
    } catch (error) {
      toast.error('Optimization failed. Please try again.');
      throw error;
    } finally {
      setOptimizing(false);
    }
  }, []);
  
  return { optimize, optimizing };
}

export function useSimulation(options?: UseApiOptions) {
  const [simulating, setSimulating] = useState(false);
  
  const simulate = useCallback(async (request: SimulationRequest) => {
    setSimulating(true);
    try {
      const result = await apiClient.simulateScenario(request);
      toast.success(`Simulation "${result.scenario_name}" completed!`);
      return result;
    } catch (error) {
      toast.error('Simulation failed. Please try again.');
      throw error;
    } finally {
      setSimulating(false);
    }
  }, []);
  
  return { simulate, simulating };
}
```

---

## 🔄 Integration Workflow

### Complete Request Flow:

1. **Frontend User Action**:
   ```typescript
   // User clicks "Optimize Schedule" button
   const { optimize } = useOptimization();
   
   const handleOptimize = async () => {
     const request: OptimizationRequest = {
       section_id: "SEC_001",
       trains: selectedTrains,
       constraints: constraints,
       objective: OptimizationObjective.MinimizeDelay,
       time_horizon_minutes: 120
     };
     
     const result = await optimize(request);
     // Handle result...
   };
   ```

2. **Backend Processing**:
   ```rust
   // Rust backend receives HTTP POST to /api/v1/optimize/schedule
   // Converts HTTP request to gRPC request
   // Calls Python optimization service on port 50051
   // Receives gRPC response
   // Converts back to HTTP JSON response
   ```

3. **Python Service Processing**:
   ```python
   # simple_server.py receives gRPC call
   # Processes optimization with mock algorithm
   # Returns structured gRPC response
   ```

4. **Frontend Result Handling**:
   ```typescript
   // Receives optimized schedule
   // Updates UI with results
   // Shows toast notification
   // Triggers dashboard refresh
   ```

---

## 🚀 Current Integration Status

### ✅ What's Working:
- **Python Service**: Running on port 50051 with 4 gRPC endpoints
- **Frontend API**: Complete optimization/simulation API methods
- **Type Safety**: Full TypeScript definitions for all optimization types
- **Error Handling**: Robust error handling with user notifications
- **Authentication**: JWT token handling for secure API calls

### 🔄 What Needs Backend Implementation:
- **gRPC Client**: Rust backend needs gRPC client to call Python service
- **Endpoint Mapping**: Map HTTP `/api/v1/optimize/*` to gRPC calls
- **Data Transformation**: Convert between HTTP JSON and gRPC protobuf
- **Error Translation**: Convert gRPC errors to HTTP error responses

---

## 🛠️ Required Backend Changes

### 1. Add gRPC Dependencies to Cargo.toml
```toml
[dependencies]
tonic = "0.11"
prost = "0.12"
tokio = { version = "1.0", features = ["full"] }

[build-dependencies]
tonic-build = "0.11"
```

### 2. Generate Rust gRPC Code
```rust
// backend/build.rs
fn main() -> Result<(), Box<dyn std::error::Error>> {
    tonic_build::compile_protos("../optimizer/python_service/proto/optimization.proto")?;
    Ok(())
}
```

### 3. Add Optimization Routes
```rust
// backend/src/routes/mod.rs
pub mod optimization;  // Add this line

// In main.rs router setup:
let app = Router::new()
    .nest("/api/v1/optimize", optimization::routes())
    // ... other routes
```

### 4. Implement Optimization Client Service
```rust
// backend/src/services/optimization_service.rs
use crate::optimization_pb2::OptimizationServiceClient;
use tonic::transport::Channel;

pub struct OptimizationService {
    client: OptimizationServiceClient<Channel>,
}

impl OptimizationService {
    pub async fn new() -> Result<Self, tonic::transport::Error> {
        let channel = Channel::from_static("http://localhost:50051")
            .connect()
            .await?;
            
        Ok(Self {
            client: OptimizationServiceClient::new(channel),
        })
    }
    
    pub async fn optimize_schedule(
        &mut self,
        request: crate::optimization_pb2::OptimizationRequest,
    ) -> Result<crate::optimization_pb2::OptimizationResponse, tonic::Status> {
        let response = self.client.optimize_schedule(request).await?;
        Ok(response.into_inner())
    }
}
```

---

## 🧪 Testing the Integration

### 1. Test Python Service Directly
```bash
# Install grpcurl for testing
go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest

# Test optimization endpoint
grpcurl -plaintext localhost:50051 list
grpcurl -plaintext localhost:50051 railway.optimization.OptimizationService/OptimizeSchedule
```

### 2. Test Through Backend (Once Implemented)
```bash
# Test optimization via HTTP
curl -X POST http://localhost:8080/api/v1/optimize/schedule \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "section_id": "SEC_001",
    "trains": [],
    "constraints": [],
    "objective": "MinimizeDelay",
    "time_horizon_minutes": 120
  }'
```

### 3. Test From Frontend
```typescript
// In React component
const { data, loading, error } = useApi(
  () => apiClient.optimizeSchedule({
    section_id: "SEC_001",
    trains: [],
    constraints: [],
    objective: OptimizationObjective.MinimizeDelay,
    time_horizon_minutes: 120
  }),
  [],
  { immediate: false }
);
```

---

## 📊 Performance Monitoring

### Python Service Metrics
The simple server logs all operations:
- Request processing times
- Success/failure rates
- Active request tracking
- Resource utilization

### Integration Monitoring
```python
# In simple_server.py (already implemented)
logger.info(f"📊 Processing optimization request: {request.request_id}")
logger.info(f"✅ Optimization completed for request: {request.request_id}")
logger.error(f"❌ Optimization failed: {str(e)}")
```

---

## 🔧 Configuration

### Environment Variables

#### Python Service:
```bash
# Port configuration
GRPC_PORT=50051
GRPC_HOST=0.0.0.0

# Logging
LOG_LEVEL=INFO

# OR-Tools settings
ORTOOLS_MAX_TIME_SECONDS=300
ORTOOLS_LOG_LEVEL=1
```

#### Backend:
```bash
# Python service connection
OPTIMIZATION_SERVICE_URL=http://localhost:50051
OPTIMIZATION_TIMEOUT_SECONDS=30
OPTIMIZATION_MAX_RETRIES=3
```

#### Frontend (.env.local):
```bash
# API configuration (already set)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_ENABLE_SIMULATIONS=true
```

---

## 📋 Development Checklist

### ✅ Completed:
- [x] Python optimization service running
- [x] gRPC protobuf definitions
- [x] Frontend TypeScript types
- [x] Frontend API client methods
- [x] Frontend generic API hooks
- [x] Error handling and retries
- [x] Toast notifications

### 🔄 Remaining Tasks:
- [ ] **Backend gRPC client implementation**
- [ ] **Backend optimization route handlers**
- [ ] **Data transformation between HTTP/gRPC**
- [ ] **Integration testing**
- [ ] **Frontend optimization UI components**

---

## 🎯 Next Steps

### Immediate Actions:
1. **Start Backend**: Run `cargo run` in backend directory
2. **Add gRPC Client**: Implement Rust gRPC client for Python service
3. **Test Integration**: Verify end-to-end communication
4. **Build UI**: Create optimization dashboard components

### Quick Test Commands:
```bash
# 1. Check Python service is running
netstat -ano | findstr :50051

# 2. Start backend (in new terminal)
cd C:\Users\gagan\Desktop\Personal\SOA\SIH\railway-intelligence-system\backend
cargo run

# 3. Start frontend (in another terminal)
cd C:\Users\gagan\Desktop\Personal\SOA\SIH\railway-intelligence-system\frontend
npm run dev

# 4. Test the complete flow
# Navigate to http://localhost:3000 and test optimization features
```

---

## 🐛 Troubleshooting

### Common Issues:

#### Python Service Won't Start:
```bash
# Check if port is in use
netstat -ano | findstr :50051

# Kill conflicting process
taskkill /PID <PID> /F

# Restart service
cd C:\Users\gagan\Desktop\Personal\SOA\SIH\railway-intelligence-system\optimizer\python_service
.\venv\Scripts\Activate.ps1
python src/simple_server.py
```

#### Backend Can't Connect to Python Service:
```bash
# Verify Python service is running
curl -X POST http://localhost:50051 # Should get gRPC error (expected)

# Check backend logs for connection errors
cargo run # Look for gRPC connection messages
```

#### Frontend API Calls Failing:
```typescript
// Check network tab in browser dev tools
// Verify backend is running on port 8080
// Check JWT token is valid
// Verify CORS settings
```

---

## 🔐 Security Considerations

### Current Security:
- **Frontend ↔ Backend**: JWT authentication
- **Backend ↔ Python Service**: Insecure gRPC (localhost only)

### Production Security:
- Enable gRPC TLS for Python service
- Add gRPC authentication/authorization
- Implement rate limiting
- Add request validation

---

## 📈 Performance Optimization

### Current Performance:
- **Mock Responses**: ~500ms response time
- **Memory Usage**: Minimal (mock data)
- **Concurrent Requests**: Supported (10 workers)

### Production Optimizations:
- Implement connection pooling
- Add request caching
- Enable gRPC compression
- Monitor resource usage

---

**Last Updated**: August 31, 2025  
**Service Status**: ✅ Running (simple_server.py)  
**Integration Level**: Frontend Ready, Backend Pending  
**Next Priority**: Backend gRPC client implementation
