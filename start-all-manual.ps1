#!/usr/bin/env pwsh
# Railway Intelligence System - Manual Startup (All Services)

Write-Host "🚆 Railway Intelligence System - Manual Startup" -ForegroundColor Blue
Write-Host "===============================================" -ForegroundColor Blue
Write-Host ""
Write-Host "Starting all services in separate PowerShell windows..." -ForegroundColor Yellow
Write-Host ""

# Function to start a service in a new PowerShell window
function Start-Service {
    param(
        [string]$ScriptPath,
        [string]$Title
    )
    
    Write-Host "🚀 Starting $Title..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $ScriptPath
    Start-Sleep -Seconds 2
}

# Get the current directory
$currentDir = Get-Location

# Start Database (Terminal 1)
Start-Service -ScriptPath "$currentDir\backend\start-database.ps1" -Title "SurrealDB Database"

Write-Host "⏳ Waiting 10 seconds for database to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Start Python Optimizer (Terminal 2)  
Start-Service -ScriptPath "$currentDir\backend\start-optimizer.ps1" -Title "Python Optimizer"

Write-Host "⏳ Waiting 15 seconds for optimizer to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Start Rust Backend (Terminal 3)
Start-Service -ScriptPath "$currentDir\backend\start-backend.ps1" -Title "Rust Backend"

Write-Host "⏳ Waiting 15 seconds for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Start Frontend (Terminal 4)
Start-Service -ScriptPath "$currentDir\start-frontend.ps1" -Title "Next.js Frontend"

Write-Host ""
Write-Host "🎉 All services are starting!" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Service URLs:" -ForegroundColor Blue
Write-Host "  Database:     127.0.0.1:8000 (SurrealDB)" -ForegroundColor Cyan
Write-Host "  Optimizer:    localhost:50051 (gRPC)" -ForegroundColor Cyan  
Write-Host "  Backend API:  http://localhost:8080" -ForegroundColor Cyan
Write-Host "  Health Check: http://localhost:8080/health" -ForegroundColor Cyan
Write-Host "  Frontend:     http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Each service runs in its own terminal window" -ForegroundColor Yellow
Write-Host "   Close each window individually to stop services" -ForegroundColor Yellow
Write-Host ""
Write-Host "⏳ Give services 2-3 minutes to fully start up..." -ForegroundColor Yellow
Write-Host "   Then test the health endpoint: http://localhost:8080/health" -ForegroundColor Green