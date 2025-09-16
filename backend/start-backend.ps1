#!/usr/bin/env pwsh
# Start Rust Backend Service

Write-Host "🦀 Starting Rust Backend..." -ForegroundColor DarkYellow
Write-Host "This window will show the backend API logs." -ForegroundColor Yellow
Write-Host "Backend API will be available at: http://localhost:8080" -ForegroundColor Green
Write-Host "Health endpoint: http://localhost:8080/health" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the backend" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor DarkYellow

# Change to backend directory
Set-Location "C:\Users\gagan\Desktop\personal\SOA\SIH\railway-intelligence-system\backend"

# Check dependencies
Write-Host "Checking Rust dependencies..." -ForegroundColor Yellow
cargo check

# Start the backend
Write-Host "Starting Rust backend server..." -ForegroundColor Green
if (Get-Command cargo-watch -ErrorAction SilentlyContinue) {
    Write-Host "Using cargo-watch for hot reload" -ForegroundColor Cyan
    cargo watch -x run
} else {
    Write-Host "cargo-watch not found, running normally" -ForegroundColor Yellow
    Write-Host "Install cargo-watch for hot reload: cargo install cargo-watch" -ForegroundColor Gray
    cargo run
}