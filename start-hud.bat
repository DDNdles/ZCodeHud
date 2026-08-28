@echo off
setlocal
cd /d "%~dp0"

echo ======================================================
echo    Starting ZCode TPS Monitor Native Transparent HUD 
echo ======================================================

:: Kill any existing HUD instances
taskkill /F /IM ZCodeHud.exe 2>nul

:: 1. Start Background Data Poller
echo [1/2] Checking Background Data Poller...
start /b "" node poll-metrics.mjs

:: 2. Ensure ZCodeHud.exe exists
if not exist "%~dp0ZCodeHud.exe" (
    echo [Compiling ZCodeHud.exe...]
    node "%~dp0compile.mjs"
)

:: 3. Launch Native Pure Transparent Floating HUD
echo [2/2] Launching Pure Native Transparent Floating HUD...
start "" "%~dp0ZCodeHud.exe"

echo ======================================================
echo    HUD is running on your desktop with zero background!
echo ======================================================
