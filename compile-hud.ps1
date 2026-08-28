# Compile ZCodeHud.cs into standalone native ZCodeHud.exe
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$src = Join-Path $PSScriptRoot "ZCodeHud.cs"
$out = Join-Path $PSScriptRoot "ZCodeHud.exe"

$gacMsil = "C:\Windows\Microsoft.Net\assembly\GAC_MSIL"
$gac64 = "C:\Windows\Microsoft.Net\assembly\GAC_64"

function Find-Dll($baseDir, $name) {
    if (Test-Path $baseDir) {
        $found = Get-ChildItem -Path (Join-Path $baseDir $name) -Filter "$name.dll" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) { return $found.FullName }
    }
    return $null
}

$pf = Find-Dll $gacMsil "PresentationFramework"
$pc = Find-Dll $gac64 "PresentationCore"
if (-not $pc) { $pc = Find-Dll $gacMsil "PresentationCore" }
$wb = Find-Dll $gacMsil "WindowsBase"
$sx = Find-Dll $gacMsil "System.Xaml"

$refs = @(
    $pf,
    $pc,
    $wb,
    $sx,
    "System.dll"
)

$refArgs = ($refs | ForEach-Object { "/r:`"$_`"" }) -join " "
$cmd = "& `"$csc`" /target:winexe /nologo /optimize+ $refArgs /out:`"$out`" `"$src`""

Write-Host "Compiling Native Pure Transparent ZCodeHud.exe..."
Invoke-Expression $cmd

if (Test-Path $out) {
    Write-Host "✅ SUCCESS: Compiled ZCodeHud.exe successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ FAILED to compile ZCodeHud.exe" -ForegroundColor Red
}
