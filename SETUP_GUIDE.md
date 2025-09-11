# 🚆 Railway Intelligence System - Complete Setup Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start (Docker)](#quick-start-docker)
3. [Manual Setup](#manual-setup)
4. [Development Setup](#development-setup)
5. [Troubleshooting](#troubleshooting)
6. [Port Configuration](#port-configuration)
7. [Environment Variables](#environment-variables)

---

## 🔧 Prerequisites

### Required Software
- **Node.js** 18+ and npm/yarn
- **Rust** 1.75+ (with Cargo)
- **Python** 3.8+ (3.11+ recommended)
- **Docker** & **Docker Compose** (recommended)
- **Git** for version control

### Optional (for manual setup)
- **PostgreSQL** 15+
- **Redis** 7+
- **SurrealDB** (or use embedded mode)

---

## 🚀 Quick Start (Docker)

### 1. Clone and Navigate
```bash
git clone <repository-url>
cd railway-intelligence-system
```

### 2. Start All Services
```bash
# Start the complete system
docker-compose up -d

# Or start individual services
docker-compose up -d postgres redis    # Databases first
docker-compose up -d optimizer         # Python optimization service
docker-compose up -d backend          # Rust backend API
docker-compose up -d frontend         # React frontend
```

### 3. Access the System
- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **API Health Check**: http://localhost:8080/health
- **Grafana Monitoring**: http://localhost:3001 (admin/admin123)
- **Prometheus Metrics**: http://localhost:9090

### 4. Default Login
```
Username: admin
Password: admin123
```

---

## 🛠️ Manual Setup

### 1. Setup Python Optimizer Service

```bash
# Navigate to optimizer directory
cd optimizer/python_service

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install the package in development mode
pip install -e .

# Run the gRPC server
python src/grpc_server.py
# OR
railway-optimizer
```
**Expected Output:**
```
🚀 Railway Optimization Service started on 0.0.0.0:50051
```

### 2. Setup Rust Backend

```bash
# Navigate to backend directory
cd backend

# Check Rust installation
rustc --version
cargo --version

# Install dependencies and compile
cargo check

# Run tests (optional)
cargo test

# Run in development mode
cargo run

# OR run with optimizations
cargo run --release
```

**Expected Output:**
```
🚆 Starting Railway Intelligence System Backend
📋 Configuration loaded successfully
📊 Metrics system initialized
✅ Database connected
🔐 Authentication service initialized
📈 Background metrics collection started
🔄 Background data ingestion started
🚀 Server starting on 0.0.0.0:8080
📊 Metrics available at: http://0.0.0.0:8080/metrics
🔌 WebSocket endpoint: ws://0.0.0.0:8080/ws
```

### 3. Setup Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
# OR
yarn install

# Start development server
npm run dev
# OR
yarn dev
```

**Expected Output:**
```
> frontend@0.1.0 dev
> next dev --turbopack

  ▲ Next.js 15.5.2 (Turbopack)
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Starting...
 ✓ Ready in 2.1s
```

---

## 💻 Development Setup

### Frontend Only Development

If you want to work on the frontend without the backend:

1. **Create `.env.local`:**
```bash
cd frontend
echo "NEXT_PUBLIC_DISABLE_WS=true" > .env.local
```

2. **Start frontend:**
```bash
npm run dev
```

The frontend will show mock data and disabled connection indicators.

### Backend Development

For backend development with hot reload:

```bash
cd backend

# Install cargo-watch for hot reload
cargo install cargo-watch

# Run with auto-reload
cargo watch -x run
```

### Python Optimizer Development

For Python service development:

```bash
cd optimizer/python_service

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# OR
venv\Scripts\activate     # Windows

# Install in development mode with dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Run with auto-reload (install watchdog first)
pip install watchdog
watchmedo auto-restart --patterns="*.py" --recursive python src/grpc_server.py
```

---

## 🐳 Docker Development

### Build and Run Individual Services

```bash
# Build all images
docker-compose build

# Run specific services
docker-compose up postgres redis     # Databases only
docker-compose up optimizer          # Python optimizer
docker-compose up backend           # Rust backend
docker-compose up frontend          # React frontend

# View logs
docker-compose logs -f backend
docker-compose logs -f optimizer
docker-compose logs -f frontend
```

### Development with Volume Mounts

For live code changes in Docker:

```bash
# Add this to your docker-compose.override.yml
version: '3.8'
services:
  frontend:
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - WATCHPACK_POLLING=true
  
  backend:
    volumes:
      - ./backend:/app
      - /app/target
```

---

## 🌐 Port Configuration

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **Frontend** | 3000 | http://localhost:3000 | React development server |
| **Backend API** | 8080 | http://localhost:8080 | REST API & WebSocket |
| **Backend Metrics** | 8081 | http://localhost:8081/metrics | Prometheus metrics |
| **Python Optimizer** | 50051 | grpc://localhost:50051 | gRPC optimization service |
| **PostgreSQL** | 5432 | localhost:5432 | Database |
| **Redis** | 6379 | localhost:6379 | Cache |
| **Grafana** | 3001 | http://localhost:3001 | Monitoring dashboard |
| **Prometheus** | 9090 | http://localhost:9090 | Metrics collection |

---

## 🔧 Environment Variables

### Frontend (`.env.local`)
```bash
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8080

# Authentication
NEXT_PUBLIC_JWT_STORAGE_KEY=railway_auth_token

# Development flags
NEXT_PUBLIC_DISABLE_WS=false
NEXT_PUBLIC_DEBUG=true

# Feature flags
NEXT_PUBLIC_ENABLE_REAL_TIME=true
NEXT_PUBLIC_ENABLE_SIMULATIONS=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
```

### Backend Environment Variables
```bash
# Server configuration
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
METRICS_PORT=8081

# Database
DATABASE_URL=postgresql://railway:railway123@localhost:5432/railway_intelligence

# Redis
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Logging
RUST_LOG=info
LOG_LEVEL=info

# Optimizer
OPTIMIZER_ENDPOINT=http://localhost:50051
OPTIMIZER_TIMEOUT_SECONDS=30
OPTIMIZER_MAX_RETRIES=3
```

### Python Optimizer Environment Variables
```bash
# gRPC configuration
GRPC_PORT=50051
GRPC_HOST=0.0.0.0

# Logging
LOG_LEVEL=INFO
PYTHONPATH=/app/src

# OR-Tools configuration
ORTOOLS_LOG_LEVEL=1
ORTOOLS_MAX_TIME_SECONDS=300
```

---

## 🚦 Running Order

### For Complete System:
1. **Start Databases** (PostgreSQL + Redis)
2. **Start Python Optimizer** (gRPC service on port 50051)
3. **Start Rust Backend** (API service on port 8080)
4. **Start Frontend** (React dev server on port 3000)

### Commands:
```bash
# Option 1: Docker (All at once)
docker-compose up -d

# Option 2: Manual (Step by step)
cd optimizer/python_service && python src/grpc_server.py &
cd backend && cargo run --release &
cd frontend && npm run dev
```

---

## 🧪 Testing the Setup

### 1. Health Checks
```bash
# Backend health
curl http://localhost:8080/health

# Expected response:
# {"status":"healthy","service":"railway-backend","timestamp":"2024-..."}

# Frontend health
curl http://localhost:3000

# Optimizer health (if gRPC tools available)
grpc_health_probe -addr=localhost:50051
```

### 2. API Testing
```bash
# Test authentication
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Test train status endpoint
curl http://localhost:8080/api/v1/trains/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. WebSocket Testing
```bash
# Using wscat (install with: npm install -g wscat)
wscat -c ws://localhost:8080/ws
```

---

## 🐛 Troubleshooting

### Common Issues and Solutions

#### 1. **Port Already in Use**
```bash
# Check what's using the port
netstat -ano | findstr :8080  # Windows
lsof -i :8080                 # Linux/Mac

# Kill the process
taskkill /PID <PID> /F        # Windows
kill -9 <PID>                 # Linux/Mac
```

#### 2. **Database Connection Failed**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Start database only
docker-compose up -d postgres

# Check database logs
docker-compose logs postgres
```

#### 3. **Rust Compilation Errors**
```bash
# Update Rust
rustup update

# Clean and rebuild
cargo clean
cargo build

# Check for missing dependencies
cargo check
```

#### 4. **Python Dependencies Issues**
```bash
# Recreate virtual environment
rm -rf venv
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Reinstall dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

#### 5. **Frontend Build Issues**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache
rm -rf .next
npm run build
```

#### 6. **WebSocket Connection Failed**
- Check if backend is running on port 8080
- Verify `.env.local` has correct WebSocket URL
- Check browser console for CORS issues

#### 7. **CORS Issues**
The backend has permissive CORS enabled, but if you encounter issues:
```bash
# Check backend CORS configuration in main.rs
# Line 140: .layer(CorsLayer::permissive())
```

---

## 🔍 System Status Check

### Quick System Status Script
```bash
# Create this script as check_system.sh
#!/bin/bash

echo "🔍 Railway Intelligence System Status Check"
echo "========================================="

# Check frontend
echo -n "Frontend (port 3000): "
curl -s http://localhost:3000 > /dev/null && echo "✅ Running" || echo "❌ Down"

# Check backend
echo -n "Backend (port 8080): "
curl -s http://localhost:8080/health > /dev/null && echo "✅ Running" || echo "❌ Down"

# Check optimizer
echo -n "Optimizer (port 50051): "
nc -z localhost 50051 && echo "✅ Running" || echo "❌ Down"

# Check databases
echo -n "PostgreSQL (port 5432): "
nc -z localhost 5432 && echo "✅ Running" || echo "❌ Down"

echo -n "Redis (port 6379): "
nc -z localhost 6379 && echo "✅ Running" || echo "❌ Down"

echo "========================================="
echo "🌐 Access URLs:"
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:8080"
echo "  Grafana: http://localhost:3001"
echo "  Prometheus: http://localhost:9090"
```

---

## 📊 Performance and Monitoring

### Monitoring URLs
- **Grafana**: http://localhost:3001 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **Backend Metrics**: http://localhost:8081/metrics

### Log Locations
- **Backend Logs**: `backend/logs/railway-backend.log`
- **Optimizer Logs**: `optimizer/python_service/logs/`
- **Frontend Logs**: Browser console
- **Docker Logs**: `docker-compose logs <service>`

---

## 🚀 Production Deployment

### Using Docker Compose (Production)
```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d

# With scaling
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

### Kubernetes Deployment
```bash
# Apply Kubernetes manifests
kubectl apply -f infrastructure/k8s/

# Check deployment status
kubectl get pods -n railway-system
```

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
cargo test                    # Unit tests
cargo test --test integration # Integration tests
```

### Frontend Tests
```bash
cd frontend
npm test                      # Jest tests
npm run test:e2e             # End-to-end tests
```

### Python Optimizer Tests
```bash
cd optimizer/python_service
pytest                       # All tests
pytest -v tests/test_optimization_engine.py  # Specific tests
```

### System Integration Tests
```bash
# From root directory
./scripts/run_integration_tests.sh
```

---

## 🔄 Development Workflow

### 1. Start Development Environment
```bash
# Terminal 1: Start databases
docker-compose up postgres redis

# Terminal 2: Start Python optimizer
cd optimizer/python_service
source venv/bin/activate
python src/grpc_server.py

# Terminal 3: Start Rust backend
cd backend
cargo watch -x run

# Terminal 4: Start frontend
cd frontend
npm run dev
```

### 2. Make Changes
- **Frontend**: Changes auto-reload via Next.js
- **Backend**: Changes auto-reload via cargo-watch
- **Optimizer**: Restart manually or use watchdog

### 3. Test Changes
```bash
# Quick smoke test
curl http://localhost:8080/health
curl http://localhost:3000
```

---

## 🆘 Emergency Procedures

### Reset Everything
```bash
# Stop all services
docker-compose down

# Remove all data (⚠️ DESTRUCTIVE)
docker-compose down -v

# Rebuild everything
docker-compose build --no-cache
docker-compose up -d
```

### Backend Only Reset
```bash
cd backend
cargo clean
cargo build
cargo run
```

### Frontend Only Reset
```bash
cd frontend
rm -rf node_modules .next package-lock.json
npm install
npm run dev
```

---

## 📱 Mobile Development

The frontend is responsive and works on mobile devices. For mobile-specific testing:

```bash
# Find your IP address
ipconfig  # Windows
ifconfig  # Linux/Mac

# Access from mobile device
http://YOUR_IP:3000
```

---

## 🔐 Security Notes

### Development
- Default JWT secret is insecure (change for production)
- CORS is permissive (restrict for production)
- Default database credentials (change for production)

### Production
- Set strong JWT secret via `JWT_SECRET` environment variable
- Configure proper CORS origins
- Use secure database credentials
- Enable HTTPS/TLS

---

## 📞 Support and Contact

### Getting Help
1. Check this documentation first
2. Review error logs
3. Check GitHub issues
4. Contact the development team

### Useful Commands
```bash
# View all running containers
docker ps

# Check container logs
docker logs <container_name>

# Execute command in container
docker exec -it <container_name> /bin/bash

# Check system resources
docker stats
```

---

**Last Updated**: August 31, 2025  
**Version**: 1.0.0  
**Compatibility**: Windows, Linux, macOS
