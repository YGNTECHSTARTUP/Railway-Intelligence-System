# Railway Intelligence System - Service Shutdown Script
# This script cleanly shuts down all services and optionally cleans up resources

param(
    [switch]$Docker,          # Stop Docker containers
    [switch]$Processes,       # Stop local processes
    [switch]$Clean,           # Clean up volumes and data
    [switch]$Force,           # Force stop without confirmation
    [switch]$All              # Stop everything (Docker + Processes)
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

Write-Host "🚆 Railway Intelligence System - Service Shutdown" -ForegroundColor $Blue
Write-Host "===================================================" -ForegroundColor $Blue

# Function to check if a port is in use and get process info
function Get-ProcessOnPort {
    param([int]$Port)
    try {
        $netstat = netstat -ano | Select-String ":$Port "
        if ($netstat) {
            $line = $netstat.Line.Trim() -split '\s+'
            $pid = $line[-1]
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            return @{
                Port = $Port
                PID = $pid
                ProcessName = if ($process) { $process.ProcessName } else { "Unknown" }
                Found = $true
            }
        }
        return @{ Found = $false }
    } catch {
        return @{ Found = $false }
    }
}

# Function to stop Docker services
function Stop-DockerServices {
    param([bool]$CleanVolumes = $false)
    
    Write-Host "🐳 Stopping Docker services..." -ForegroundColor $Cyan
    
    if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Host "❌ Docker not found or not running" -ForegroundColor $Red
        return
    }
    
    try {
        # Check if any containers are running
        $runningContainers = docker ps -q --filter "label=com.docker.compose.project=railway-intelligence-system" 2>$null
        
        if ($runningContainers) {
            Write-Host "Found running containers, stopping them..." -ForegroundColor $Yellow
            
            # Stop services gracefully
            docker-compose stop 2>$null
            Write-Host "✅ Docker containers stopped" -ForegroundColor $Green
            
            # Remove containers
            docker-compose down 2>$null
            Write-Host "✅ Docker containers removed" -ForegroundColor $Green
            
            # Clean volumes if requested
            if ($CleanVolumes) {
                Write-Host "🧹 Cleaning up volumes and networks..." -ForegroundColor $Yellow
                docker-compose down -v 2>$null
                docker system prune -f 2>$null
                Write-Host "✅ Volumes and unused images cleaned" -ForegroundColor $Green
            }
        } else {
            Write-Host "ℹ️ No Railway Intelligence containers are currently running" -ForegroundColor $Gray
        }
        
        # Remove override file if it exists
        if (Test-Path "docker-compose.override.yml") {
            Remove-Item "docker-compose.override.yml" -Force
            Write-Host "✅ Development override file removed" -ForegroundColor $Green
        }
        
    } catch {
        Write-Host "❌ Error stopping Docker services: $($_.Exception.Message)" -ForegroundColor $Red
    }
}

# Function to stop local processes
function Stop-LocalProcesses {
    param([bool]$ForceKill = $false)
    
    Write-Host "💻 Stopping local processes..." -ForegroundColor $Cyan
    
    $ports = @(3000, 8080, 50051, 5432, 6379)
    $stoppedCount = 0
    
    foreach ($port in $ports) {
        $processInfo = Get-ProcessOnPort $port
        
        if ($processInfo.Found) {
            $serviceName = switch ($port) {
                3000 { "Frontend (Next.js)" }
                8080 { "Backend (Rust)" }
                50051 { "Optimizer (Python)" }
                5432 { "PostgreSQL" }
                6379 { "Redis" }
                default { "Unknown Service" }
            }
            
            Write-Host "🛑 Stopping $serviceName (PID: $($processInfo.PID), Port: $port)" -ForegroundColor $Yellow
            
            try {
                if ($ForceKill) {
                    Stop-Process -Id $processInfo.PID -Force -ErrorAction SilentlyContinue
                } else {
                    Stop-Process -Id $processInfo.PID -ErrorAction SilentlyContinue
                }
                
                # Wait a moment and check if it's really stopped
                Start-Sleep -Seconds 2
                $stillRunning = Get-ProcessOnPort $port
                
                if (!$stillRunning.Found) {
                    Write-Host "✅ $serviceName stopped successfully" -ForegroundColor $Green
                    $stoppedCount++
                } else {
                    Write-Host "⚠️ $serviceName may still be running" -ForegroundColor $Yellow
                }
            } catch {
                Write-Host "❌ Failed to stop $serviceName" -ForegroundColor $Red
            }
        }
    }
    
    if ($stoppedCount -eq 0) {
        Write-Host "ℹ️ No Railway Intelligence processes found running on expected ports" -ForegroundColor $Gray
    } else {
        Write-Host "✅ Stopped $stoppedCount local processes" -ForegroundColor $Green
    }
}

# Function to show confirmation dialog
function Show-Confirmation {
    param([string]$Message, [string]$Action)
    
    if ($Force) {
        return $true
    }
    
    Write-Host ""
    Write-Host $Message -ForegroundColor $Yellow
    $response = Read-Host "Do you want to continue? (y/N)"
    
    return ($response -match "^[yY]")
}

# Main execution logic
$shouldStopDocker = $Docker -or $All
$shouldStopProcesses = $Processes -or $All

# If no specific flags are provided, ask what to stop
if (!$Docker -and !$Processes -and !$All) {
    Write-Host ""
    Write-Host "🤔 What would you like to stop?" -ForegroundColor $Yellow
    Write-Host "1. Docker containers only"
    Write-Host "2. Local processes only" 
    Write-Host "3. Both Docker and local processes"
    Write-Host "4. Exit without stopping anything"
    Write-Host ""
    
    $choice = Read-Host "Enter your choice (1-4)"
    
    switch ($choice) {
        "1" { $shouldStopDocker = $true }
        "2" { $shouldStopProcesses = $true }
        "3" { $shouldStopDocker = $true; $shouldStopProcesses = $true }
        "4" { 
            Write-Host "👋 Exiting without stopping services" -ForegroundColor $Gray
            exit 0 
        }
        default { 
            Write-Host "❌ Invalid choice. Exiting." -ForegroundColor $Red
            exit 1 
        }
    }
}

Write-Host ""
Write-Host "🔍 Checking current service status..." -ForegroundColor $Yellow

# Show what's currently running
$runningServices = @()
$ports = @(3000, 8080, 50051, 5432, 6379)

foreach ($port in $ports) {
    $processInfo = Get-ProcessOnPort $port
    if ($processInfo.Found) {
        $serviceName = switch ($port) {
            3000 { "Frontend" }
            8080 { "Backend" }
            50051 { "Optimizer" }
            5432 { "PostgreSQL" }
            6379 { "Redis" }
        }
        $runningServices += "$serviceName (Port $port, PID $($processInfo.PID))"
    }
}

if ($runningServices.Count -eq 0) {
    Write-Host "ℹ️ No Railway Intelligence services appear to be running" -ForegroundColor $Gray
    exit 0
}

Write-Host "Currently running services:" -ForegroundColor $Cyan
foreach ($service in $runningServices) {
    Write-Host "  • $service" -ForegroundColor $Gray
}

# Stop Docker services
if ($shouldStopDocker) {
    Write-Host ""
    if (Show-Confirmation "This will stop all Docker containers for the Railway Intelligence System." "stop Docker services") {
        Stop-DockerServices -CleanVolumes $Clean
    } else {
        Write-Host "⏭️ Skipping Docker service shutdown" -ForegroundColor $Yellow
    }
}

# Stop local processes
if ($shouldStopProcesses) {
    Write-Host ""
    $warningMessage = "This will terminate local processes running on ports 3000, 8080, 50051, 5432, and 6379."
    if ($Force) {
        $warningMessage += " Using FORCE mode - processes will be killed immediately."
    }
    
    if (Show-Confirmation $warningMessage "stop local processes") {
        Stop-LocalProcesses -ForceKill $Force
    } else {
        Write-Host "⏭️ Skipping local process shutdown" -ForegroundColor $Yellow
    }
}

# Final status check
Write-Host ""
Write-Host "🔍 Final status check..." -ForegroundColor $Yellow

Start-Sleep -Seconds 2
$stillRunning = @()

foreach ($port in $ports) {
    $processInfo = Get-ProcessOnPort $port
    if ($processInfo.Found) {
        $serviceName = switch ($port) {
            3000 { "Frontend" }
            8080 { "Backend" }
            50051 { "Optimizer" }
            5432 { "PostgreSQL" }
            6379 { "Redis" }
        }
        $stillRunning += "$serviceName (Port $port)"
    }
}

Write-Host ""
if ($stillRunning.Count -eq 0) {
    Write-Host "✅ All Railway Intelligence services have been stopped successfully!" -ForegroundColor $Green
} else {
    Write-Host "⚠️ Some services may still be running:" -ForegroundColor $Yellow
    foreach ($service in $stillRunning) {
        Write-Host "  • $service" -ForegroundColor $Red
    }
    Write-Host ""
    Write-Host "💡 Tips:" -ForegroundColor $Blue
    Write-Host "  • Use -Force flag for forceful termination" -ForegroundColor $Yellow
    Write-Host "  • Check Task Manager for any remaining processes" -ForegroundColor $Yellow
    Write-Host "  • Some services may take time to fully shut down" -ForegroundColor $Yellow
}

Write-Host ""
Write-Host "🔧 Next steps:" -ForegroundColor $Blue
Write-Host "  • Check status: .\check-status.ps1" -ForegroundColor $Cyan
Write-Host "  • Start services: .\start-all-docker.ps1 or .\start-all-dev.ps1" -ForegroundColor $Cyan

if ($Clean) {
    Write-Host ""
    Write-Host "🧹 Cleanup completed - all data volumes have been removed" -ForegroundColor $Yellow
    Write-Host "   Next startup will create fresh databases" -ForegroundColor $Yellow
}

Write-Host ""
