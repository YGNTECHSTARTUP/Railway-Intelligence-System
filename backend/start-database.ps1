#!/usr/bin/env pwsh
# Start SurrealDB Database

Write-Host "🗄️  Starting SurrealDB Database..." -ForegroundColor Cyan
Write-Host "This window will show the database server logs." -ForegroundColor Yellow
Write-Host "Database will be available at: 127.0.0.1:8000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the database" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan

# Change to project root
Set-Location "C:\Users\gagan\Desktop\personal\SOA\SIH\railway-intelligence-system"

# Start SurrealDB
surreal start --bind 127.0.0.1:8000 --user root --pass root memory