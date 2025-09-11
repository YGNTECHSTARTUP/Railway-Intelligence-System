# Railway Intelligence System - Status Check Script
# This script checks the status of all services and performs health checks

param(
    [switch]$Detailed,        # Show detailed health information
    [switch]$Continuous,      # Continuous monitoring (refresh every 10 seconds)
    [switch]$Docker,          # Check Docker container status
    [switch]$Logs             # Show recent logs for running services
)

# Set error handling
$ErrorActionPreference = "Continue"

# Colors for output
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Blue = "Blue"
$Cyan = "Cyan"
$Gray = "Gray"

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

# Function to make HTTP health check
function Test-HttpHealth {
    param([string]$Url)
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -UseBasicParsing
        return @{
            Status = "✅ Healthy"
            StatusCode = $response.StatusCode
            ResponseTime = "< 5s"
            Color = $Green
        }
    } catch {
        return @{
            Status = "❌ Unhealthy"
            StatusCode = "N/A"
            ResponseTime = "Timeout"
            Color = $Red
        }
    }
}

# Function to check Docker container status
function Get-DockerStatus {
    if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
        return "Docker not available"
    }
    
    try {
        $containers = docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" --filter "label=com.docker.compose.project=railway-intelligence-system" 2>$null
        if ($LASTEXITCODE -eq 0 -and $containers) {
            return $containers
        } else {
            return "No containers running"
        }
    } catch {
        return "Docker error"
    }
}

# Function to show system status
function Show-SystemStatus {
    Clear-Host
    Write-Host "🚆 Railway Intelligence System - Status Check" -ForegroundColor $Blue
    Write-Host "===============================================" -ForegroundColor $Blue
    Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor $Gray
    Write-Host ""
    
    # Service definitions
    $services = @(
        @{
            Name = "Frontend (Next.js)"
            Port = 3000
            HealthUrl = "http://localhost:3000"
            Type = "HTTP"
            Icon = "[WEB]"
        },
        @{
            Name = "Backend API (Rust)"
            Port = 8080
            HealthUrl = "http://localhost:8080/health"
            Type = "HTTP"
            Icon = "[API]"
        },
        @{
            Name = "Optimizer (Python gRPC)"
            Port = 50051
            HealthUrl = $null
            Type = "TCP"
            Icon = "[OPT]"
        },
        @{
            Name = "PostgreSQL Database"
            Port = 5432
            HealthUrl = $null
            Type = "TCP"
            Icon = "[DB]"
        },
        @{
            Name = "Redis Cache"
            Port = 6379
            HealthUrl = $null
            Type = "TCP"
            Icon = "[CACHE]"
        }
    )
    
    Write-Host "📊 Service Status:" -ForegroundColor $Blue
    Write-Host "==================" -ForegroundColor $Blue
    
    $runningCount = 0
    $totalCount = $services.Count
    
    foreach ($service in $services) {
        $portOpen = Test-Port $service.Port
        $healthStatus = "N/A"
        $healthColor = $Gray
        
        if ($portOpen) {
            $runningCount++
            if ($service.Type -eq "HTTP" -and $service.HealthUrl) {
                if ($Detailed) {
                    $health = Test-HttpHealth $service.HealthUrl
                    $healthStatus = $health.Status
                    $healthColor = $health.Color
                } else {
                    $healthStatus = "✅ Running"
                    $healthColor = $Green
                }
            } else {
                $healthStatus = "✅ Running"
                $healthColor = $Green
            }
        } else {
            $healthStatus = "❌ Stopped"
            $healthColor = $Red
        }
        
        $nameWithIcon = "$($service.Icon) $($service.Name)"
        Write-Host "$($nameWithIcon.PadRight(35)) Port $($service.Port): $healthStatus" -ForegroundColor $healthColor
        
        if ($Detailed -and $portOpen -and $service.Type -eq "HTTP") {
            Write-Host "    Health URL: $($service.HealthUrl)" -ForegroundColor $Gray
        }
    }
    
    Write-Host ""
    Write-Host "📈 Summary: $runningCount/$totalCount services running" -ForegroundColor $(if ($runningCount -eq $totalCount) { $Green } else { $Yellow })
    
    # Docker status if requested
    if ($Docker) {
        Write-Host ""
        Write-Host "🐳 Docker Container Status:" -ForegroundColor $Blue
        Write-Host "============================" -ForegroundColor $Blue
        $dockerStatus = Get-DockerStatus
        if ($dockerStatus -eq "Docker not available") {
            Write-Host "Docker is not installed or not running" -ForegroundColor $Yellow
        } elseif ($dockerStatus -eq "No containers running") {
            Write-Host "No Docker containers are currently running" -ForegroundColor $Yellow
        } else {
            Write-Host $dockerStatus -ForegroundColor $Cyan
        }
    }
    
    # System resources
    if ($Detailed) {
        Write-Host ""
        Write-Host "💻 System Resources:" -ForegroundColor $Blue
        Write-Host "====================" -ForegroundColor $Blue
        
        $cpu = Get-Counter '\Processor(_Total)\% Processor Time' -SampleInterval 1 -MaxSamples 1
        $cpuUsage = [math]::Round((100 - $cpu.CounterSamples.CookedValue), 1)
        
        $memory = Get-CimInstance -ClassName Win32_ComputerSystem
        $totalMemory = [math]::Round($memory.TotalPhysicalMemory / 1GB, 1)
        
        $freeMemory = Get-Counter '\Memory\Available MBytes' -SampleInterval 1 -MaxSamples 1
        $freeMemoryGB = [math]::Round($freeMemory.CounterSamples.CookedValue / 1024, 1)
        $usedMemory = $totalMemory - $freeMemoryGB
        $memoryUsage = [math]::Round(($usedMemory / $totalMemory) * 100, 1)
        
        Write-Host "CPU Usage:    $cpuUsage%" -ForegroundColor $(if ($cpuUsage -gt 80) { $Red } elseif ($cpuUsage -gt 60) { $Yellow } else { $Green })
        Write-Host "Memory Usage: $usedMemory GB / $totalMemory GB ($memoryUsage%)" -ForegroundColor $(if ($memoryUsage -gt 80) { $Red } elseif ($memoryUsage -gt 60) { $Yellow } else { $Green })
    }
    
    Write-Host ""
    Write-Host "🌐 Service URLs (if running):" -ForegroundColor $Blue
    Write-Host "==============================" -ForegroundColor $Blue
    Write-Host "Frontend Dashboard:  http://localhost:3000" -ForegroundColor $(if (Test-Port 3000) { $Cyan } else { $Gray })
    Write-Host "Backend API:         http://localhost:8080" -ForegroundColor $(if (Test-Port 8080) { $Cyan } else { $Gray })
    Write-Host "API Documentation:   http://localhost:8080/docs" -ForegroundColor $(if (Test-Port 8080) { $Cyan } else { $Gray })
    Write-Host "Health Check:        http://localhost:8080/health" -ForegroundColor $(if (Test-Port 8080) { $Cyan } else { $Gray })
    Write-Host "Grafana (if enabled): http://localhost:3001" -ForegroundColor $(if (Test-Port 3001) { $Cyan } else { $Gray })
    Write-Host "Prometheus (if enabled): http://localhost:9090" -ForegroundColor $(if (Test-Port 9090) { $Cyan } else { $Gray })
    
    # Show recent logs if requested
    if ($Logs) {
        Write-Host ""
        Write-Host "📋 Recent Logs:" -ForegroundColor $Blue
        Write-Host "===============" -ForegroundColor $Blue
        
        if (Get-Command docker -ErrorAction SilentlyContinue) {
            $runningServices = @("frontend", "backend", "optimizer", "postgres", "redis")
            foreach ($svc in $runningServices) {
                $containerId = docker ps -q -f "name=$svc" 2>$null
                if ($containerId) {
                    Write-Host ""
                    Write-Host "--- $svc logs (last 5 lines) ---" -ForegroundColor $Yellow
                    docker logs --tail 5 $containerId 2>$null | ForEach-Object { Write-Host $_ -ForegroundColor $Gray }
                }
            }
        } else {
            Write-Host "Docker not available for log viewing" -ForegroundColor $Yellow
        }
    }
    
    Write-Host ""
    Write-Host "🔧 Management Commands:" -ForegroundColor $Blue
    Write-Host "======================" -ForegroundColor $Blue
    Write-Host "Start all (Docker):     .\start-all-docker.ps1" -ForegroundColor $Yellow
    Write-Host "Start all (Dev mode):   .\start-all-dev.ps1" -ForegroundColor $Yellow
    Write-Host "Stop all services:      .\stop-all.ps1" -ForegroundColor $Yellow
    Write-Host "Detailed status:        .\check-status.ps1 -Detailed" -ForegroundColor $Yellow
    Write-Host "Continuous monitoring:  .\check-status.ps1 -Continuous" -ForegroundColor $Yellow
    
    if ($runningCount -lt $totalCount) {
        Write-Host ""
        Write-Host "⚠️  Some services are not running!" -ForegroundColor $Yellow
        Write-Host "   Use the start scripts to launch missing services." -ForegroundColor $Yellow
    } else {
        Write-Host ""
        Write-Host "✅ All services are running successfully!" -ForegroundColor $Green
    }
}

# Main execution
if ($Continuous) {
    Write-Host "🔄 Starting continuous monitoring (Press Ctrl+C to stop)..." -ForegroundColor $Yellow
    Write-Host ""
    
    try {
        while ($true) {
            Show-SystemStatus
            Write-Host ""
            Write-Host "⏳ Refreshing in 10 seconds... (Ctrl+C to stop)" -ForegroundColor $Gray
            Start-Sleep -Seconds 10
        }
    } catch {
        Write-Host ""
        Write-Host "🛑 Monitoring stopped by user" -ForegroundColor $Yellow
    }
} else {
    Show-SystemStatus
}

Write-Host ""
