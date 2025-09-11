# 🚀 Railway Intelligence System - Script Usage Guide

This guide explains how to use the PowerShell scripts to easily manage your Railway Intelligence System services.

## 📋 Available Scripts

| Script | Purpose | Best For |
|--------|---------|----------|
| `start-all-docker.ps1` | Start all services using Docker Compose | **Production-like environment, easy setup** |
| `start-all-dev.ps1` | Start services manually for development | **Development with hot reload** |
| `check-status.ps1` | Check service health and status | **Monitoring and troubleshooting** |
| `stop-all.ps1` | Stop all running services | **Cleanup and shutdown** |

---

## 🐳 Docker Mode (Recommended for Quick Start)

**Best for**: Quick setup, testing, production-like environment

### Basic Usage
```powershell
# Start everything with Docker
.\start-all-docker.ps1

# Start with monitoring (Grafana + Prometheus)
.\start-all-docker.ps1 -Monitor

# Start in development mode (with volume mounts)
.\start-all-docker.ps1 -Dev

# Force rebuild all images
.\start-all-docker.ps1 -Build

# Clean start (remove all data)
.\start-all-docker.ps1 -Clean

# Start and show logs
.\start-all-docker.ps1 -Logs
```

### What It Does
- ✅ Starts PostgreSQL and Redis databases
- ✅ Starts Python optimizer service (gRPC)
- ✅ Starts Rust backend API
- ✅ Starts Next.js frontend
- ✅ Waits for services to be healthy
- ✅ Shows all access URLs

---

## 💻 Development Mode

**Best for**: Active development, debugging, code changes

### Basic Usage
```powershell
# Start all services for development
.\start-all-dev.ps1

# Start only databases
.\start-all-dev.ps1 -DBOnly

# Start only frontend (assumes backend is running)
.\start-all-dev.ps1 -FrontendOnly

# Start only backend (assumes DB and optimizer are running)
.\start-all-dev.ps1 -BackendOnly

# Start only optimizer (assumes DB is running)
.\start-all-dev.ps1 -OptimizerOnly

# Skip database startup (if already running)
.\start-all-dev.ps1 -SkipDB
```

### What It Does
- 🔧 Opens each service in its own PowerShell window
- 🔄 Enables hot reload for frontend and backend (if cargo-watch is installed)
- 📊 Uses Docker for databases (PostgreSQL + Redis)
- 🐍 Sets up Python virtual environment automatically
- 🦀 Compiles and runs Rust backend
- ⚛️ Installs npm dependencies and starts Next.js

---

## 🔍 Status Monitoring

### Basic Usage
```powershell
# Quick status check
.\check-status.ps1

# Detailed health checks
.\check-status.ps1 -Detailed

# Show Docker container status
.\check-status.ps1 -Docker

# Continuous monitoring (refreshes every 10 seconds)
.\check-status.ps1 -Continuous

# Show recent logs
.\check-status.ps1 -Logs
```

### What It Shows
- 🟢/🔴 Service status (running/stopped)
- 🌐 Access URLs with color coding
- 💻 System resources (CPU, memory)
- 🐳 Docker container status
- 📋 Recent service logs

---

## 🛑 Stopping Services

### Basic Usage
```powershell
# Interactive mode (asks what to stop)
.\stop-all.ps1

# Stop Docker containers only
.\stop-all.ps1 -Docker

# Stop local processes only
.\stop-all.ps1 -Processes

# Stop everything
.\stop-all.ps1 -All

# Force stop without confirmation
.\stop-all.ps1 -All -Force

# Stop and clean all data
.\stop-all.ps1 -Docker -Clean
```

### What It Does
- 🛑 Gracefully stops running services
- 🧹 Optionally cleans up Docker volumes
- 🔍 Verifies services are actually stopped
- ⚠️ Shows any services that may still be running

---

## 🎯 Common Usage Patterns

### First Time Setup
```powershell
# Quick start with Docker (easiest)
.\start-all-docker.ps1 -Build

# Wait for services to start, then check
.\check-status.ps1

# Access the frontend
# Open browser to: http://localhost:3000
```

### Development Workflow
```powershell
# Start development environment
.\start-all-dev.ps1

# Make code changes...
# Frontend and backend auto-reload

# Check status anytime
.\check-status.ps1

# Stop when done
.\stop-all.ps1 -All
```

### Troubleshooting
```powershell
# Check what's running
.\check-status.ps1 -Detailed -Docker -Logs

# Stop everything and clean up
.\stop-all.ps1 -All -Clean

# Fresh start
.\start-all-docker.ps1 -Build
```

---

## 🌐 Service URLs

When services are running, you can access:

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3000 | Main dashboard |
| **Backend API** | http://localhost:8080 | REST API |
| **Health Check** | http://localhost:8080/health | Service health |
| **Grafana** | http://localhost:3001 | Monitoring (admin/admin123) |
| **Prometheus** | http://localhost:9090 | Metrics |

---

## 🔧 Prerequisites

### Required Software
- **PowerShell 5.1+** (comes with Windows)
- **Docker Desktop** (for Docker mode)
- **Node.js 18+** (for development mode)
- **Rust 1.75+** (for development mode)
- **Python 3.8+** (for development mode)

### PowerShell Execution Policy
If you get execution policy errors:
```powershell
# Allow running scripts in current session
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 🚨 Troubleshooting

### Port Already in Use
```powershell
# Check what's using ports
.\check-status.ps1

# Stop conflicting services
.\stop-all.ps1 -Processes -Force
```

### Docker Issues
```powershell
# Make sure Docker is running
docker --version
docker info

# Rebuild if needed
.\start-all-docker.ps1 -Build -Clean
```

### Service Won't Start
```powershell
# Check detailed status
.\check-status.ps1 -Detailed -Logs

# Try individual service
.\start-all-dev.ps1 -FrontendOnly
```

### Permission Errors
```powershell
# Run PowerShell as Administrator if needed
# Right-click PowerShell → "Run as Administrator"
```

---

## 💡 Pro Tips

### Development Efficiency
```powershell
# Keep status monitoring open in one terminal
.\check-status.ps1 -Continuous

# Use individual service flags for faster iteration
.\start-all-dev.ps1 -FrontendOnly
```

### Docker Optimization
```powershell
# Development mode with volume mounts
.\start-all-docker.ps1 -Dev

# Production-like with monitoring
.\start-all-docker.ps1 -Monitor
```

### Quick Commands
```powershell
# Create aliases in your PowerShell profile
Set-Alias rstart ".\start-all-docker.ps1"
Set-Alias rstatus ".\check-status.ps1"
Set-Alias rstop ".\stop-all.ps1"
```

---

## 🔄 Script Options Summary

### start-all-docker.ps1
- `-Build` - Rebuild Docker images
- `-Clean` - Remove volumes and clean start
- `-Dev` - Development mode with volume mounts
- `-Logs` - Show logs after starting
- `-Monitor` - Include Grafana/Prometheus

### start-all-dev.ps1
- `-SkipDB` - Skip database startup
- `-DBOnly` - Start only databases
- `-BackendOnly` - Start only backend
- `-FrontendOnly` - Start only frontend
- `-OptimizerOnly` - Start only optimizer
- `-Status` - Check service status

### check-status.ps1
- `-Detailed` - Show detailed health information
- `-Continuous` - Continuous monitoring
- `-Docker` - Show Docker container status
- `-Logs` - Show recent service logs

### stop-all.ps1
- `-Docker` - Stop Docker containers
- `-Processes` - Stop local processes
- `-Clean` - Clean up volumes and data
- `-Force` - Force stop without confirmation
- `-All` - Stop everything

---

**Happy coding! 🚆✨**
