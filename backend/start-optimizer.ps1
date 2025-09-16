#!/usr/bin/env pwsh
# Start Python Optimizer Service

Write-Host "🔧 Starting Python Optimizer..." -ForegroundColor Magenta
Write-Host "This window will show the gRPC optimizer logs." -ForegroundColor Yellow
Write-Host "Optimizer will be available at: localhost:50051" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the optimizer" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Magenta

# Change to optimizer directory
Set-Location "C:\Users\gagan\Desktop\personal\SOA\SIH\railway-intelligence-system\optimizer\python_service"

# Create virtual environment if it doesn't exist
if (!(Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Install dependencies
Write-Host "Installing/updating dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt
pip install -e .

# Start the gRPC server
Write-Host "Starting gRPC server on port 50051..." -ForegroundColor Green
python src\grpc_server.py