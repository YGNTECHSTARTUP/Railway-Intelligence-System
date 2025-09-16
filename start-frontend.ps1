#!/usr/bin/env pwsh
# Start React/Next.js Frontend

Write-Host "⚛️  Starting Next.js Frontend..." -ForegroundColor Green
Write-Host "This window will show the frontend development server logs." -ForegroundColor Yellow
Write-Host "Frontend will be available at: http://localhost:3000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the frontend" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Green

# Change to frontend directory
Set-Location "C:\Users\gagan\Desktop\personal\SOA\SIH\railway-intelligence-system\frontend"

# Install dependencies
Write-Host "Installing/updating Node.js dependencies..." -ForegroundColor Yellow
npm install

# Start the development server
Write-Host "Starting Next.js development server..." -ForegroundColor Green
npm run dev