# Simple Railway Status Check
param([switch]$Detailed)

$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Blue = "Blue"
$Cyan = "Cyan"
$Gray = "Gray"

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

Write-Host "Railway Intelligence System - Status Check" -ForegroundColor $Blue
Write-Host "==========================================" -ForegroundColor $Blue
Write-Host ""

$services = @(
    @{Name="Frontend (Next.js)"; Port=3000},
    @{Name="Backend (Rust)"; Port=8080},
    @{Name="Optimizer (Python)"; Port=50051},
    @{Name="PostgreSQL"; Port=5432},
    @{Name="Redis"; Port=6379}
)

$runningCount = 0
foreach ($service in $services) {
    $status = Test-Port $service.Port
    $statusText = if ($status) { "RUNNING" } else { "STOPPED" }
    $color = if ($status) { $Green } else { $Red }
    
    if ($status) { $runningCount++ }
    
    Write-Host "$($service.Name.PadRight(25)) Port $($service.Port): $statusText" -ForegroundColor $color
}

Write-Host ""
Write-Host "Summary: $runningCount/5 services running" -ForegroundColor $(if ($runningCount -eq 5) { $Green } else { $Yellow })

Write-Host ""
Write-Host "Service URLs:" -ForegroundColor $Blue
Write-Host "Frontend:     http://localhost:3000" -ForegroundColor $(if (Test-Port 3000) { $Cyan } else { $Gray })
Write-Host "Backend API:  http://localhost:8080" -ForegroundColor $(if (Test-Port 8080) { $Cyan } else { $Gray })
Write-Host "Health Check: http://localhost:8080/health" -ForegroundColor $(if (Test-Port 8080) { $Cyan } else { $Gray })
Write-Host ""
