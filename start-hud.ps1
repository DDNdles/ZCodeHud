# Start ZCode TPS HUD Native Transparent Architecture
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "   Starting ZCode TPS Monitor Native Transparent HUD  " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# 1. Stop any old instance
Get-Process -Name "ZCodeHud" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# 2. Check if ZCodeHud.exe exists, if not compile it
if (-not (Test-Path (Join-Path $scriptDir "ZCodeHud.exe"))) {
    Write-Host "Compiling ZCodeHud.exe..." -ForegroundColor Yellow
    & (Join-Path $scriptDir "compile-hud.ps1")
}

# 3. Start Background Data Poller if not running
$pollerRunning = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*poll-metrics.mjs*" }
if (-not $pollerRunning) {
    Write-Host "[1/2] Starting Background Data Poller..." -ForegroundColor Green
    Start-Process -FilePath "node" -ArgumentList "poll-metrics.mjs" -WorkingDirectory $scriptDir -WindowStyle Hidden
} else {
    Write-Host "[1/2] Data Poller is already running in background." -ForegroundColor Gray
}

# 4. Launch Pure Native WPF Transparent Floating HUD
Write-Host "[2/2] Launching Native Transparent HUD (Zero White Background)..." -ForegroundColor Green
Start-Process -FilePath (Join-Path $scriptDir "ZCodeHud.exe") -WorkingDirectory $scriptDir

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "   HUD is running on your desktop with zero background!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan
