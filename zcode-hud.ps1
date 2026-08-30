# ZCode TPS Monitor - Native Transparent Floating HUD Launcher
$src = Join-Path $PSScriptRoot "ZCodeHud.cs"
$exe = Join-Path $PSScriptRoot "ZCodeHud.exe"

if (Test-Path $exe) {
    Start-Process -FilePath $exe
} else {
    & (Join-Path $PSScriptRoot "compile-hud.ps1")
    if (Test-Path $exe) {
        Start-Process -FilePath $exe
    }
}
