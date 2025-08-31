# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## 🚆 Railway Intelligence System

This is an intelligent decision-support system for Indian Railways train traffic controllers, combining Operations Research (OR-Tools) and AI/ML for real-time train precedence and crossing optimization. The system is being built for Smart India Hackathon 2024 with the goal of national-level deployment.

## 🏗️ Architecture Overview

The system uses a multi-language microservices architecture:

- **Rust Backend** (`backend/`): High-performance API services, real-time data processing, WebSocket connections
- **Python Optimizer** (`optimizer/`): OR-Tools constraint programming, gRPC optimization service
- **React Frontend** (`frontend/`): Real-time dashboard, train visualization, what-if scenario simulation
- **SurrealDB**: Graph database for railway network topology, time-series train data, optimization results

The core data flow: Real-time train data → Rust services → Python optimizer (via gRPC) → Dashboard updates

## 📁 Key Directories and Files

### Backend (`backend/src/`)
- **models/**: Core domain models (Train, Section, OptimizationRequest, Events)
- **services/**: Business logic layer (TrainService, OptimizationService, ConflictDetection)
- **database/**: SurrealDB integration with comprehensive schema
- **api/**: REST API endpoints for trains, optimization, sections, analytics
- **main.rs**: Axum server setup with WebSocket support

### Critical Models
- **Train**: Real-time train state with position, delays, priority, consist details
- **Section**: Railway track sections with capacity, signal blocks, maintenance windows
- **OptimizationRequest/Response**: Interface for Python OR-Tools service
- **Events**: TrainEvent, DisruptionEvent, ConflictEvent for audit trail

## 🛠️ Development Commands

### Backend Development
```bash
cd backend

# Build and run (note: rdkafka has Windows compatibility issues)
cargo build
cargo run

# Run with specific features (disable kafka on Windows)
cargo build --no-default-features
cargo run --no-default-features

# Database setup (requires SurrealDB running)
# The app auto-initializes schema on startup

# Run tests
cargo test

# Development with auto-reload
cargo install cargo-watch
cargo watch -x run
```

### Database Commands
```bash
# Start SurrealDB locally
surreal start --log trace --user root --pass root memory

# Connect to database
surreal sql --conn ws://localhost:8000 --user root --pass root --ns railway --db intelligence
```

### Python Optimizer Setup
```bash
cd optimizer

# Setup virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies (when requirements.txt is created)
pip install -r requirements.txt
pip install ortools grpcio grpcio-tools pydantic numpy pandas

# Generate gRPC code
python -m grpc_tools.protoc -I./proto --python_out=. --grpc_python_out=. proto/optimization.proto
```

### Full System
```bash
# When docker-compose.yml is complete
docker-compose up -d

# Access services
# Backend: http://localhost:8000
# Frontend: http://localhost:3000  
# Database: ws://localhost:8001
```

## 🧠 Key Architectural Decisions

### Database Design
- **SurrealDB** chosen for its graph database capabilities (railway networks are graphs)
- Combined graph + time-series data in one system
- Real-time queries for section state and train positions
- Optimized for spatial queries with GeoPoint types

### Service Communication
- **gRPC** between Rust backend and Python optimizer for high-performance optimization calls
- **WebSockets** for real-time dashboard updates
- **REST APIs** for standard CRUD operations

### Domain Model Philosophy
- **Event Sourcing** pattern for train events and disruptions
- **Rich Domain Models** with business logic encapsulated in structs
- **Priority-based Train Management** with configurable precedence rules

### Performance Requirements
- Sub-5 second optimization response times
- Real-time train position updates
- Handle 1000+ concurrent train movements
- 99.9% uptime for critical operations

## 🚧 Current Development Status

Based on the development roadmap (`docs/development-roadmap.md`), the project is in **Phase 1** with foundation complete:

### ✅ Completed
- Rust backend structure with comprehensive models
- SurrealDB integration with schema initialization
- TrainService implementation with event tracking
- Core API structure

### 🔄 In Progress (Missing Implementation Files)
The following service files are declared in `src/services/mod.rs` but not yet implemented:
- `src/services/optimization_service.rs` - Interface to Python optimizer
- `src/services/ingestion_service.rs` - Real-time data processing
- `src/services/conflict_detection.rs` - Train conflict detection logic

### 📋 Next Implementation Priority
1. **Complete missing services** (optimization, ingestion, conflict detection)
2. **API endpoint implementations** in `src/api/` modules
3. **Python OR-Tools integration** with gRPC server
4. **Frontend React dashboard** with real-time updates

## 🔧 Common Development Patterns

### Error Handling
Uses `ServiceResult<T>` and `ServiceError` enum for consistent error handling across services. All database operations are wrapped in anyhow::Result.

### Validation
Business logic validation in service layer (`validate_train`, precedence rules, capacity checks).

### Event-Driven Updates
All train state changes create corresponding TrainEvents for audit trail and downstream processing.

### Real-time State Management
Train positions, section occupancy, and conflicts are tracked in real-time with timestamp-based state updates.

## 🐛 Known Issues

### Windows Development
- **rdkafka build issues**: Disable kafka feature for Windows development:
  ```toml
  # In Cargo.toml, use:
  default = []  # Remove "kafka" 
  ```

### Database Connection
- SurrealDB connection hardcoded to `127.0.0.1:8000` in database module
- Schema initialization happens on every startup (consider migration strategy)

### Missing gRPC Integration
- Protocol buffer definitions not yet created
- Rust gRPC client not implemented for Python optimizer communication

## 🎯 Hackathon Success Metrics

The system aims to demonstrate:
- **Real-time optimization** of train crossings with OR-Tools
- **Conflict detection and resolution** with 95%+ accuracy  
- **What-if scenario simulation** for disruption planning
- **10%+ improvement** in punctuality metrics
- **Scalable architecture** ready for national deployment

## 🧪 Testing Strategy

### Unit Tests
- Model validation logic
- Service business rules
- Database operations (with test database)

### Integration Tests
- Complete optimization pipeline (Rust ↔ Python)
- WebSocket real-time updates
- API endpoint functionality

### Performance Tests
- 1000+ concurrent train events
- Optimization response time < 5 seconds
- Database query performance under load

## 📚 Key Domain Knowledge

### Railway Operations
- **Train Precedence**: Emergency > Mail > Express > Passenger > Freight > Maintenance
- **Block Sections**: Single train occupancy for safety
- **Signal Spacing**: Minimum 5-minute headway between trains
- **Section Capacity**: Single track (1), Double track (2), Multiple (4+)

### Optimization Objectives
- **Primary**: Minimize total delay across all trains
- **Secondary**: Maximize section throughput
- **Constraints**: Safety rules, platform capacity, maintenance windows
- **Trade-offs**: High-priority trains vs. overall system efficiency

This system represents a comprehensive approach to solving one of India's most critical infrastructure optimization challenges using modern software engineering practices and advanced operations research techniques.
