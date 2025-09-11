# Railway Intelligence System - Development Startup Script
# This script starts all services manually in separate terminals for development

param(
    [switch]$SkipDB,          # Skip starting databases (assume they're already running)
    [switch]$DBOnly,          # Start only databases
    [switch]$BackendOnly,     # Start only backend (assumes DB and optimizer are running)
    [switch]$FrontendOnly,    # Start only frontend (assumes backend is running)
    [switch]$OptimizerOnly,   # Start only optimizer (assumes DB is running)
    [switch]$Status           # Check status of running services
)

# Set error handling
$ErrorActionPreference = "Continue"

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Blue = "Blue"
$Cyan = "Cyan"

Write-Host "🚆 Railway Intelligence System - Development Mode" -ForegroundColor $Blue
Write-Host "===================================================" -ForegroundColor $Blue

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# Function to start a service in a new PowerShell window
function Start-ServiceWindow {
    param(
        [string]$Title,
        [string]$Command,
        [string]$WorkingDirectory = $PWD,
        [string]$Color = "Blue"
    )
    
    Write-Host "🚀 Starting $Title..." -ForegroundColor $Color
    
    $psCommand = @"
Set-Location '$WorkingDirectory'
`$Host.UI.RawUI.WindowTitle = '$Title'
Write-Host '🚆 $Title - Railway Intelligence System' -ForegroundColor $Color
Write-Host 'Working Directory: $WorkingDirectory' -ForegroundColor Gray
Write-Host 'Command: $Command' -ForegroundColor Gray
Write-Host '=====================================' -ForegroundColor $Color
Write-Host ''
try {
    $Command
} catch {
    Write-Host 'Error: ' `$_.Exception.Message -ForegroundColor Red
    Write-Host 'Press any key to exit...' -ForegroundColor Yellow
    `$null = Read-Host
}
"@
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $psCommand
}

# Check status if requested
if ($Status) {
    Write-Host "🔍 Checking service status..." -ForegroundColor $Yellow
    Write-Host ""
    
    $services = @(
        @{Name="Frontend (Next.js)"; Port=3000},
        @{Name="Backend (Rust)"; Port=8080},
        @{Name="Optimizer (Python gRPC)"; Port=50051},
        @{Name="PostgreSQL"; Port=5432},
        @{Name="Redis"; Port=6379}
    )
    
    foreach ($service in $services) {
        $status = if (Test-Port $service.Port) { "🟢 Running" } else { "🔴 Stopped" }
        Write-Host "$($service.Name.PadRight(25)) on port $($service.Port): $status" -ForegroundColor $(if (Test-Port $service.Port) { $Green } else { $Red })
    }
    
    Write-Host ""
    Write-Host "🌐 Service URLs (if running):" -ForegroundColor $Blue
    Write-Host "  Frontend:     http://localhost:3000" -ForegroundColor $Cyan
    Write-Host "  Backend API:  http://localhost:8080" -ForegroundColor $Cyan
    Write-Host "  Health Check: http://localhost:8080/health" -ForegroundColor $Cyan
    exit 0
}

# Check for required tools
$missingTools = @()

if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    $missingTools += "Node.js"
}

if (!(Get-Command cargo -ErrorAction SilentlyContinue)) {
    $missingTools += "Rust/Cargo"
}

if (!(Get-Command python -ErrorAction SilentlyContinue)) {
    $missingTools += "Python"
}

if ($missingTools.Count -gt 0) {
    Write-Host "❌ Missing required tools: $($missingTools -join ', ')" -ForegroundColor $Red
    Write-Host "Please install them before running this script." -ForegroundColor $Red
    exit 1
}

Write-Host "✅ Required tools found: Node.js, Rust, Python" -ForegroundColor $Green

# Database only mode
if ($DBOnly) {
    Write-Host "📊 Starting databases only..." -ForegroundColor $Yellow
    
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        Write-Host "Using Docker for databases..." -ForegroundColor $Cyan
        Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
`$Host.UI.RawUI.WindowTitle = 'Railway DB - PostgreSQL & Redis'
Write-Host '📊 Starting PostgreSQL and Redis via Docker...' -ForegroundColor Cyan
docker-compose up postgres redis
"@
    } else {
        Write-Host "⚠️ Docker not found. You'll need to start PostgreSQL and Redis manually." -ForegroundColor $Yellow
        Write-Host "Expected connections:" -ForegroundColor $Yellow
        Write-Host "  PostgreSQL: localhost:5432 (DB: railway_intelligence, User: railway, Pass: railway123)" -ForegroundColor $Cyan
        Write-Host "  Redis: localhost:6379" -ForegroundColor $Cyan
    }
    exit 0
}

# Individual service modes
if ($OptimizerOnly) {
    Write-Host "🔧 Starting Optimizer only..." -ForegroundColor $Yellow
    $optimizerPath = Join-Path $PWD "optimizer\python_service"
    Start-ServiceWindow -Title "Railway Optimizer (Python gRPC)" -Command @"
Write-Host 'Setting up Python virtual environment...' -ForegroundColor Yellow
if (!(Test-Path 'venv')) {
    python -m venv venv
    Write-Host 'Virtual environment created' -ForegroundColor Green
}
Write-Host 'Activating virtual environment...' -ForegroundColor Yellow
.\venv\Scripts\Activate.ps1
Write-Host 'Installing dependencies...' -ForegroundColor Yellow
pip install -r requirements.txt
pip install -e .
Write-Host 'Starting gRPC server on port 50051...' -ForegroundColor Green
python src\grpc_server.py
"@ -WorkingDirectory $optimizerPath -Color "Magenta"
    exit 0
}

if ($BackendOnly) {
    Write-Host "🦀 Starting Backend only..." -ForegroundColor $Yellow
    $backendPath = Join-Path $PWD "backend"
    Start-ServiceWindow -Title "Railway Backend (Rust)" -Command @"
Write-Host 'Checking Rust dependencies...' -ForegroundColor Yellow
cargo check
Write-Host 'Starting Rust backend with hot reload...' -ForegroundColor Green
if (Get-Command cargo-watch -ErrorAction SilentlyContinue) {
    cargo watch -x run
} else {
    Write-Host 'cargo-watch not found, running normally (install with: cargo install cargo-watch)' -ForegroundColor Yellow
    cargo run
}
"@ -WorkingDirectory $backendPath -Color "DarkYellow"
    exit 0
}

if ($FrontendOnly) {
    Write-Host "⚛️ Starting Frontend only..." -ForegroundColor $Yellow
    $frontendPath = Join-Path $PWD "frontend"
    Start-ServiceWindow -Title "Railway Frontend (Next.js)" -Command @"
Write-Host 'Installing Node.js dependencies...' -ForegroundColor Yellow
npm install
Write-Host 'Starting Next.js development server...' -ForegroundColor Green
npm run dev
"@ -WorkingDirectory $frontendPath -Color "Green"
    exit 0
}

# Full startup sequence
Write-Host "🚀 Starting all services in development mode..." -ForegroundColor $Yellow
Write-Host ""

# Step 1: Start databases (if not skipped)
if (!$SkipDB) {
    Write-Host "📊 Step 1/4: Starting databases..." -ForegroundColor $Cyan
    
    if (Test-Port 5432) {
        Write-Host "⚠️ PostgreSQL port 5432 is already in use" -ForegroundColor $Yellow
    }
    if (Test-Port 6379) {
        Write-Host "⚠️ Redis port 6379 is already in use" -ForegroundColor $Yellow
    }
    
    if (Get-Command docker -ErrorAction SilentlyContinue) {
        Write-Host "Using Docker for databases..." -ForegroundColor $Cyan
        Start-ServiceWindow -Title "Railway DB - PostgreSQL & Redis" -Command @"
Write-Host 'Starting PostgreSQL and Redis via Docker...' -ForegroundColor Cyan
Write-Host 'This window will show database logs.' -ForegroundColor Gray
docker-compose up postgres redis
"@ -Color "DarkCyan"
        
        Write-Host "⏳ Waiting 15 seconds for databases to start..." -ForegroundColor $Yellow
        Start-Sleep -Seconds 15
    } else {
        Write-Host "⚠️ Docker not found. Please start PostgreSQL and Redis manually before continuing." -ForegroundColor $Red
        Write-Host "Press any key when databases are ready..." -ForegroundColor $Yellow
        $null = Read-Host
    }
} else {
    Write-Host "⏭️ Skipping database startup (SkipDB flag set)" -ForegroundColor $Yellow
}

# Step 2: Start Python Optimizer
Write-Host "🔧 Step 2/4: Starting Python Optimizer..." -ForegroundColor $Cyan

if (Test-Port 50051) {
    Write-Host "⚠️ Optimizer port 50051 is already in use" -ForegroundColor $Yellow
} else {
    $optimizerPath = Join-Path $PWD "optimizer\python_service"
    Start-ServiceWindow -Title "Railway Optimizer (Python gRPC)" -Command @"
Write-Host 'Setting up Python virtual environment...' -ForegroundColor Yellow
if (!(Test-Path 'venv')) {
    python -m venv venv
    Write-Host 'Virtual environment created' -ForegroundColor Green
}
Write-Host 'Activating virtual environment...' -ForegroundColor Yellow
.\venv\Scripts\Activate.ps1
Write-Host 'Installing dependencies...' -ForegroundColor Yellow
pip install -r requirements.txt
pip install -e .
Write-Host 'Starting gRPC server on port 50051...' -ForegroundColor Green
python src\grpc_server.py
"@ -WorkingDirectory $optimizerPath -Color "Magenta"
}

Write-Host "⏳ Waiting 10 seconds for optimizer to start..." -ForegroundColor $Yellow
Start-Sleep -Seconds 10

# Step 3: Start Rust Backend
Write-Host "🦀 Step 3/4: Starting Rust Backend..." -ForegroundColor $Cyan

if (Test-Port 8080) {
    Write-Host "⚠️ Backend port 8080 is already in use" -ForegroundColor $Yellow
} else {
    $backendPath = Join-Path $PWD "backend"
    Start-ServiceWindow -Title "Railway Backend (Rust)" -Command @"
Write-Host 'Checking Rust dependencies...' -ForegroundColor Yellow
cargo check
Write-Host 'Starting Rust backend with hot reload...' -ForegroundColor Green
if (Get-Command cargo-watch -ErrorAction SilentlyContinue) {
    Write-Host 'Using cargo-watch for hot reload' -ForegroundColor Cyan
    cargo watch -x run
} else {
    Write-Host 'cargo-watch not found, running normally' -ForegroundColor Yellow
    Write-Host 'Install cargo-watch for hot reload: cargo install cargo-watch' -ForegroundColor Gray
    cargo run
}
"@ -WorkingDirectory $backendPath -Color "DarkYellow"
}

Write-Host "⏳ Waiting 10 seconds for backend to start..." -ForegroundColor $Yellow
Start-Sleep -Seconds 10

# Step 4: Start React Frontend
Write-Host "⚛️ Step 4/4: Starting React Frontend..." -ForegroundColor $Cyan

if (Test-Port 3000) {
    Write-Host "⚠️ Frontend port 3000 is already in use" -ForegroundColor $Yellow
} else {
    $frontendPath = Join-Path $PWD "frontend"
    Start-ServiceWindow -Title "Railway Frontend (Next.js)" -Command @"
Write-Host 'Installing Node.js dependencies...' -ForegroundColor Yellow
npm install
Write-Host 'Starting Next.js development server...' -ForegroundColor Green
npm run dev
"@ -WorkingDirectory $frontendPath -Color "Green"
}

# Final instructions
Write-Host ""
Write-Host "🎉 All services are starting!" -ForegroundColor $Green
Write-Host "================================" -ForegroundColor $Green
Write-Host ""
Write-Host "🌐 Service URLs:" -ForegroundColor $Blue
Write-Host "  Frontend:     http://localhost:3000" -ForegroundColor $Cyan
Write-Host "  Backend API:  http://localhost:8080" -ForegroundColor $Cyan
Write-Host "  Health Check: http://localhost:8080/health" -ForegroundColor $Cyan
Write-Host "  Optimizer:    gRPC on localhost:50051" -ForegroundColor $Cyan
Write-Host ""
Write-Host "📋 Development Tips:" -ForegroundColor $Blue
Write-Host "  • Each service runs in its own terminal window" -ForegroundColor $Yellow
Write-Host "  • Frontend auto-reloads on file changes" -ForegroundColor $Yellow
Write-Host "  • Backend auto-reloads if cargo-watch is installed" -ForegroundColor $Yellow
Write-Host "  • Optimizer needs manual restart after Python changes" -ForegroundColor $Yellow
Write-Host ""
Write-Host "🔍 Check status with: .\start-all-dev.ps1 -Status" -ForegroundColor $Yellow
Write-Host "🛑 Stop services with: .\stop-all.ps1" -ForegroundColor $Yellow
Write-Host ""
Write-Host "⏳ Give services 30-60 seconds to fully start up..." -ForegroundColor $Yellow
