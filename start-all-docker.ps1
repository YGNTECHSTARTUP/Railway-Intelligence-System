# Railway Intelligence System - Docker Startup Script
# This script starts all services using Docker Compose

param(
    [switch]$Build,           # Force rebuild of images
    [switch]$Clean,           # Clean start (remove volumes)
    [switch]$Dev,             # Development mode with volume mounts
    [switch]$Logs,            # Show logs after starting
    [switch]$Monitor          # Enable monitoring stack (Grafana/Prometheus)
)

# Set error handling
$ErrorActionPreference = "Stop"

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Blue = "Blue"
$Cyan = "Cyan"

Write-Host "🚆 Railway Intelligence System - Docker Startup" -ForegroundColor $Blue
Write-Host "=================================================" -ForegroundColor $Blue

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor $Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor $Red
    exit 1
}

# Check if docker-compose is available
try {
    docker-compose version | Out-Null
    Write-Host "✅ Docker Compose is available" -ForegroundColor $Green
} catch {
    Write-Host "❌ Docker Compose is not available." -ForegroundColor $Red
    exit 1
}

# Clean start if requested
if ($Clean) {
    Write-Host "🧹 Cleaning up existing containers and volumes..." -ForegroundColor $Yellow
    docker-compose down -v
    docker system prune -f
    Write-Host "✅ Cleanup completed" -ForegroundColor $Green
}

# Build images if requested
if ($Build) {
    Write-Host "🔨 Building Docker images..." -ForegroundColor $Yellow
    docker-compose build --no-cache
    Write-Host "✅ Build completed" -ForegroundColor $Green
}

# Create override file for development mode
if ($Dev) {
    Write-Host "💻 Setting up development mode..." -ForegroundColor $Yellow
    
    $overrideContent = @"
version: '3.8'
services:
  frontend:
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    environment:
      - WATCHPACK_POLLING=true
      - NEXT_PUBLIC_DEBUG=true
    command: npm run dev
    
  backend:
    volumes:
      - ./backend:/app
      - /app/target
    environment:
      - RUST_LOG=debug
      - DEVELOPMENT_MODE=true
    
  optimizer:
    volumes:
      - ./optimizer/python_service:/app
      - /app/venv
    environment:
      - LOG_LEVEL=DEBUG
      - DEVELOPMENT_MODE=true
"@
    
    $overrideContent | Out-File -FilePath "docker-compose.override.yml" -Encoding UTF8
    Write-Host "✅ Development override created" -ForegroundColor $Green
}

# Determine which services to start
$services = @("postgres", "redis", "optimizer", "backend", "frontend")

if ($Monitor) {
    $services += @("prometheus", "grafana")
    Write-Host "📊 Including monitoring stack" -ForegroundColor $Cyan
}

Write-Host "🚀 Starting services in order..." -ForegroundColor $Yellow

# Start databases first
Write-Host "📊 Starting databases..." -ForegroundColor $Cyan
docker-compose up -d postgres redis

# Wait for databases to be healthy
Write-Host "⏳ Waiting for databases to be ready..." -ForegroundColor $Yellow
$timeout = 60
$elapsed = 0
$interval = 5

do {
    Start-Sleep -Seconds $interval
    $elapsed += $interval
    
    $pgStatus = docker-compose ps -q postgres | ForEach-Object { docker inspect --format='{{.State.Health.Status}}' $_ }
    $redisStatus = docker-compose ps -q redis | ForEach-Object { docker inspect --format='{{.State.Health.Status}}' $_ }
    
    Write-Host "  PostgreSQL: $pgStatus, Redis: $redisStatus" -ForegroundColor $Yellow
    
    if ($pgStatus -eq "healthy" -and $redisStatus -eq "healthy") {
        Write-Host "✅ Databases are ready!" -ForegroundColor $Green
        break
    }
    
    if ($elapsed -ge $timeout) {
        Write-Host "⚠️  Databases taking longer than expected, continuing anyway..." -ForegroundColor $Yellow
        break
    }
} while ($true)

# Start optimizer service
Write-Host "🔧 Starting optimizer service..." -ForegroundColor $Cyan
docker-compose up -d optimizer

# Wait a bit for optimizer
Start-Sleep -Seconds 10

# Start backend service
Write-Host "🦀 Starting backend service..." -ForegroundColor $Cyan
docker-compose up -d backend

# Wait a bit for backend
Start-Sleep -Seconds 10

# Start frontend service
Write-Host "⚛️ Starting frontend service..." -ForegroundColor $Cyan
docker-compose up -d frontend

# Start monitoring if requested
if ($Monitor) {
    Write-Host "📊 Starting monitoring services..." -ForegroundColor $Cyan
    docker-compose up -d prometheus grafana
}

# Final status check
Write-Host "🔍 Checking service status..." -ForegroundColor $Yellow
Start-Sleep -Seconds 5

$runningServices = docker-compose ps --services --filter="status=running"
Write-Host "✅ Running services: $($runningServices -join ', ')" -ForegroundColor $Green

# Display access URLs
Write-Host ""
Write-Host "🌐 Service URLs:" -ForegroundColor $Blue
Write-Host "================" -ForegroundColor $Blue
Write-Host "Frontend Dashboard:  http://localhost:3000" -ForegroundColor $Cyan
Write-Host "Backend API:         http://localhost:8080" -ForegroundColor $Cyan
Write-Host "API Health Check:    http://localhost:8080/health" -ForegroundColor $Cyan
Write-Host "PostgreSQL:          localhost:5432" -ForegroundColor $Cyan
Write-Host "Redis:               localhost:6379" -ForegroundColor $Cyan

if ($Monitor) {
    Write-Host "Grafana Dashboard:   http://localhost:3001 (admin/admin123)" -ForegroundColor $Cyan
    Write-Host "Prometheus:          http://localhost:9090" -ForegroundColor $Cyan
}

Write-Host ""
Write-Host "📝 Useful Commands:" -ForegroundColor $Blue
Write-Host "==================" -ForegroundColor $Blue
Write-Host "View logs:           docker-compose logs -f [service]" -ForegroundColor $Yellow
Write-Host "Stop all:            docker-compose down" -ForegroundColor $Yellow
Write-Host "Stop with cleanup:   docker-compose down -v" -ForegroundColor $Yellow
Write-Host "Restart service:     docker-compose restart [service]" -ForegroundColor $Yellow

# Show logs if requested
if ($Logs) {
    Write-Host ""
    Write-Host "📋 Showing logs (Ctrl+C to exit)..." -ForegroundColor $Yellow
    docker-compose logs -f
}

Write-Host ""
Write-Host "🎉 Railway Intelligence System is starting up!" -ForegroundColor $Green
Write-Host "   Check the URLs above to access the services." -ForegroundColor $Green
