# 🚆 Railway Intelligence System - Manual Running Guide

This guide provides step-by-step instructions to manually run all services in separate terminals on Windows.

## 📋 Prerequisites

Before starting, ensure you have:
- **Node.js** 18+ and npm
- **Rust** 1.75+ with Cargo
- **Python** 3.8+ (3.11+ recommended)
- **SurrealDB** installed
- **Git** for version control

## 🎯 Quick Start (4 Terminals)

### Terminal 1: Start SurrealDB Database

Open **PowerShell Terminal 1** and run:

```powershell
# Navigate to project directory
cd "C:\Users\gagan\Desktop\personal\SOA\SIH\railway-intelligence-system"

# Start SurrealDB server
Write-Host "🗄️  Starting SurrealDB Database..." -ForegroundColor Cyan
surreal start --bind 127.0.0.1:8000 --user root --pass root memory
```

**Expected Output:**
```
2025-09-16T16:22:49Z [INFO ] surrealdb::server: Starting web server on 127.0.0.1:8000
2025-09-16T16:22:49Z [INFO ] surrealdb::server: Started web server on 127.0.0.1:8000
```

**Status:** Database running on `127.0.0.1:8000`

---

### Terminal 2: Start Python Optimizer

Open **PowerShell Terminal 2** and run:

```powershell
# Navigate to optimizer directory
cd "C:\Users\gagan\Desktop\personal\SOA\SIH\railway-intelligence-system\optimizer\python_service"

# Create virtual environment (if not exists)
if (!(Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
.\venv\Scripts\Activate.ps1

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt
pip install -e .

# Start gRPC server
Write-Host "🔧 Starting Python Optimizer on port 50051..." -ForegroundColor Magenta
python src\grpc_server.py
```

**Expected Output:**
```
🚀 Railway Optimization Service started on 0.0.0.0:50051
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     gRPC server listening on [::]:50051
```

**Status:** Optimizer running on `localhost:50051`

---

### Terminal 3: Start Rust Backend

Open **PowerShell Terminal 3** and run:

```powershell
# Navigate to backend directory
cd "C:\Users\gagan\Desktop\personal\SOA\SIH\railway-intelligence-system\backend"

# Check Rust dependencies
Write-Host "Checking Rust dependencies..." -ForegroundColor Yellow
cargo check

# Start backend server
Write-Host "🦀 Starting Rust Backend..." -ForegroundColor DarkYellow
cargo run
```

**Expected Output:**
```
🚆 Starting Railway Intelligence System Backend
📋 Configuration loaded successfully
📊 Metrics system initialized
✅ Database connected
📈 Background metrics collection started
🔄 Background data ingestion started
🚀 Server starting on 0.0.0.0:8080
📊 Metrics available at: http://0.0.0.0:8080/metrics
```

**Status:** Backend API running on `http://localhost:8080`

---

### Terminal 4: Start Frontend

Open **PowerShell Terminal 4** and run:

```powershell
# Navigate to frontend directory
cd "C:\Users\gagan\Desktop\personal\SOA\SIH\railway-intelligence-system\frontend"

# Install dependencies
Write-Host "Installing Node.js dependencies..." -ForegroundColor Yellow
npm install

# Start development server
Write-Host "⚛️  Starting Next.js Frontend..." -ForegroundColor Green
npm run dev
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

**Status:** Frontend running on `http://localhost:3000`

---

## 🌐 Service URLs

Once all services are running:

| Service | URL | Status Check |
|---------|-----|--------------|
| **Frontend Dashboard** | http://localhost:3000 | Open in browser |
| **Backend API** | http://localhost:8080 | http://localhost:8080/health |
| **Backend Metrics** | http://localhost:8080/metrics | Prometheus metrics |
| **Python Optimizer** | localhost:50051 | gRPC service |
| **SurrealDB Database** | 127.0.0.1:8000 | Internal connection |

## 🧪 Testing Your Setup

### 1. Test Backend Health

Open a new PowerShell terminal and run:

```powershell
# Test health endpoint
curl http://localhost:8080/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "railway-backend", 
  "timestamp": "2025-09-16T16:22:49.123Z"
}
```

### 2. Test Frontend

Open your web browser and go to:
- http://localhost:3000

You should see the Railway Intelligence System dashboard.

### 3. Test API Endpoints

```powershell
# Test trains endpoint
curl http://localhost:8080/api/v1/trains

# Test train status endpoint  
curl http://localhost:8080/api/v1/trains/status

# Test analytics endpoint
curl http://localhost:8080/api/v1/analytics/kpis
```

## 🔧 Development Tips

### Hot Reload Setup

For better development experience:

**Backend Hot Reload:**
```powershell
# Install cargo-watch (one time)
cargo install cargo-watch

# Use cargo-watch instead of cargo run
cargo watch -x run
```

**Frontend Hot Reload:**
- Already enabled by default with Next.js
- Changes auto-reload in browser

### Environment Variables

Create `.env.local` in frontend directory:
```bash
# Frontend environment
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8080
NEXT_PUBLIC_DISABLE_WS=true
NEXT_PUBLIC_DEBUG=true
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```powershell
# Check what's using port 8080
netstat -ano | findstr :8080

# Kill process by PID
taskkill /PID <PID> /F
```

#### 2. SurrealDB Connection Failed
- Ensure SurrealDB is running on 127.0.0.1:8000
- Check if port 8000 is available
- Restart database terminal if needed

#### 3. Python Dependencies Issues
```powershell
# Recreate virtual environment
rm -rf venv
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
```

#### 4. Rust Compilation Errors
```powershell
# Update Rust
rustup update

# Clean and rebuild
cargo clean
cargo build
```

#### 5. Frontend Build Issues
```powershell
# Clear cache and reinstall
rm -rf node_modules package-lock.json .next
npm install
```

## 🚀 Automated Scripts

I've also created automated scripts for easier startup:

### Start All Services
```powershell
.\start-all-manual.ps1
```

### Individual Service Scripts
```powershell
# Start database only
.\backend\start-database.ps1

# Start optimizer only  
.\backend\start-optimizer.ps1

# Start backend only
.\backend\start-backend.ps1

# Start frontend only
.\start-frontend.ps1
```

## 📊 System Status Check

Create this quick status check script:

```powershell
# check-status.ps1
Write-Host "🔍 Railway System Status Check" -ForegroundColor Blue
Write-Host "=============================" -ForegroundColor Blue

$services = @(
    @{Name="SurrealDB"; Port=8000; URL="127.0.0.1:8000"},
    @{Name="Python Optimizer"; Port=50051; URL="localhost:50051"},
    @{Name="Backend API"; Port=8080; URL="http://localhost:8080/health"},
    @{Name="Frontend"; Port=3000; URL="http://localhost:3000"}
)

foreach ($service in $services) {
    $connection = New-Object System.Net.Sockets.TcpClient
    try {
        $connection.Connect("localhost", $service.Port)
        Write-Host "✅ $($service.Name) - Running on $($service.URL)" -ForegroundColor Green
        $connection.Close()
    } catch {
        Write-Host "❌ $($service.Name) - Not running on port $($service.Port)" -ForegroundColor Red
    }
}
```

## 🔄 Startup Order

**Important:** Start services in this order to avoid connection issues:

1. **SurrealDB Database** (Terminal 1) - Wait 10 seconds
2. **Python Optimizer** (Terminal 2) - Wait 15 seconds  
3. **Rust Backend** (Terminal 3) - Wait 15 seconds
4. **Frontend** (Terminal 4)

## 🛑 Stopping Services

To stop services:
1. Press `Ctrl+C` in each terminal window
2. Close the terminal windows
3. Or use the stop script:

```powershell
# stop-all.ps1
Get-Process | Where-Object {$_.ProcessName -match "surreal|cargo|node|python"} | Stop-Process -Force
Write-Host "All services stopped" -ForegroundColor Green
```

## 📱 Access Points

Once everything is running:

### Main Dashboard
- **URL**: http://localhost:3000
- **Features**: Complete railway management interface
- **Authentication**: None required (disabled)

### API Documentation
- **Health**: http://localhost:8080/health
- **Metrics**: http://localhost:8080/metrics
- **Trains**: http://localhost:8080/api/v1/trains
- **Analytics**: http://localhost:8080/api/v1/analytics/overview

## 🎉 Success Indicators

You know everything is working when:

1. ✅ All 4 terminals show "Running" or "Started" messages
2. ✅ Health check returns `{"status": "healthy"}`
3. ✅ Frontend loads at http://localhost:3000
4. ✅ No error messages in any terminal
5. ✅ All ports are responding (8000, 50051, 8080, 3000)

---

**Last Updated**: September 16, 2025  
**Tested On**: Windows 11, PowerShell 5.1