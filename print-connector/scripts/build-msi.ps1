# DDA Print Connector MSI Build Script
# Requires: Node.js, WiX Toolset

param(
    [string]$Configuration = "Release"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DDA Print Connector MSI Build" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Get-Item $scriptDir).Parent.FullName
$distDir = Join-Path $projectRoot "dist"
$msiDir = Join-Path $distDir "msi"

# Read version from package.json
$packageJson = Get-Content (Join-Path $projectRoot "package.json") | ConvertFrom-Json
$version = $packageJson.version

Write-Host "Building version: $version" -ForegroundColor Gray
Write-Host ""

# Step 1: Check prerequisites
Write-Host "[1/5] Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "  Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Node.js not found. Please run install-build-env.ps1 first." -ForegroundColor Red
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "  npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: npm not found." -ForegroundColor Red
    exit 1
}

# Check WiX
$wixPath = $env:WIX
$candidatePaths = @(
    $env:PATH -split ';',
    "C:\Program Files (x86)\WiX Toolset v3.14\bin",
    "C:\Program Files (x86)\WiX Toolset v3.11\bin",
    "C:\Program Files\WiX Toolset v3.14\bin",
    "C:\Program Files\WiX Toolset v3.11\bin"
)

$candleExe = $null
foreach ($p in $candidatePaths) {
    if ($p) {
        $candidate = Join-Path $p "candle.exe"
        if (Test-Path $candidate) {
            $candleExe = $candidate
            break
        }
    }
}

if (-not $candleExe) {
    Write-Host "  ERROR: WiX Toolset not found." -ForegroundColor Red
    Write-Host "  Please run .\scripts\install-build-env.ps1 to install WiX." -ForegroundColor Yellow
    exit 1
}

$wixBinPath = Split-Path $candleExe
Write-Host "  WiX: Found at $wixBinPath" -ForegroundColor Green

$lightExe = Join-Path $wixBinPath "light.exe"

# Step 2: Ensure dist directories exist
Write-Host ""
Write-Host "[2/5] Creating output directories..." -ForegroundColor Yellow

if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
}
if (-not (Test-Path $msiDir)) {
    New-Item -ItemType Directory -Path $msiDir -Force | Out-Null
}

Write-Host "  Output: $msiDir" -ForegroundColor Gray

# Step 3: Install npm dependencies
Write-Host ""
Write-Host "[3/5] Installing npm dependencies..." -ForegroundColor Yellow

Set-Location $projectRoot

# Check if node_modules exists or if package.json changed
$nodeModulesPath = Join-Path $projectRoot "node_modules"
$needInstall = -not (Test-Path $nodeModulesPath)

if (-not $needInstall) {
    # Check if @yao-pkg/pkg is installed
    $pkgPath = Join-Path $nodeModulesPath "@yao-pkg"
    if (-not (Test-Path $pkgPath)) {
        $needInstall = $true
    }
}

if ($needInstall) {
    Write-Host "  Running npm install --include=dev..." -ForegroundColor Gray
    & npm install --include=dev 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: npm install failed" -ForegroundColor Red
        Set-Location $scriptDir
        exit 1
    }
} else {
    Write-Host "  Dependencies already installed" -ForegroundColor Gray
}

Write-Host "  Dependencies OK" -ForegroundColor Green

# Step 4: Build executable with pkg
Write-Host ""
Write-Host "[4/5] Building executable..." -ForegroundColor Yellow

$exePath = Join-Path $distDir "dda-print-connector.exe"

# Check if pkg is available via npx
Write-Host "  Running pkg build..." -ForegroundColor Gray
& npx @yao-pkg/pkg . --targets node18-win-x64 --output "$exePath" 2>&1 | ForEach-Object {
    if ($_ -match "error" -or $_ -match "Error") {
        Write-Host "  $_" -ForegroundColor Red
    }
}

if (-not (Test-Path $exePath)) {
    Write-Host "  ERROR: Failed to build executable" -ForegroundColor Red
    Set-Location $scriptDir
    exit 1
}

Write-Host "  Created: $exePath" -ForegroundColor Green

# Step 5: Compile MSI
Write-Host ""
Write-Host "[5/5] Compiling MSI..." -ForegroundColor Yellow

$wixSource = Join-Path $projectRoot "installer\product.wxs"
$wixobjPath = Join-Path $msiDir "product.wixobj"
$msiPath = Join-Path $msiDir "DDAPrintConnector-$version.msi"

# Compile WiX source
Write-Host "  Compiling WiX source..." -ForegroundColor Gray
& $candleExe -ext WixUtilExtension -out "$wixobjPath" "$wixSource" 2>&1 | Out-Null

if (-not (Test-Path $wixobjPath)) {
    Write-Host "  ERROR: WiX compilation failed" -ForegroundColor Red
    Set-Location $scriptDir
    exit 1
}

# Link MSI
Write-Host "  Linking MSI..." -ForegroundColor Gray
& $lightExe -ext WixUtilExtension -out "$msiPath" "$wixobjPath" 2>&1 | Out-Null

if (-not (Test-Path $msiPath)) {
    Write-Host "  ERROR: MSI linking failed" -ForegroundColor Red
    Set-Location $scriptDir
    exit 1
}

# Create config template
$configTemplatePath = Join-Path $msiDir "config-template.json"
$configTemplate = @{
    dda = @{
        baseUrl = "http://your-dda-server:3000"
        username = "your-username"
        password = "your-password"
        defaultFolderId = $null
        locationId = $null
        departmentId = $null
        uploadTimeout = 120000
    }
    watcher = @{
        watchPath = "C:\DDA_Print_Output"
        processedPath = "C:\DDA_Print_Output\processed"
        failedPath = "C:\DDA_Print_Output\failed"
        fileExtensions = @(".pdf", ".png", ".jpg", ".jpeg")
        stabilityThreshold = 2000
        pollInterval = 1000
    }
    logging = @{
        level = "info"
        file = "logs/dda-connector.log"
        console = $true
    }
    notifications = @{
        enabled = $true
        showSuccess = $true
        showError = $true
    }
}

$configTemplate | ConvertTo-Json -Depth 10 | Set-Content $configTemplatePath

# Clean up intermediate files
Remove-Item $wixobjPath -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Build Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Output files:" -ForegroundColor Cyan
Write-Host "  MSI:     " -NoNewline; Write-Host $msiPath -ForegroundColor White
Write-Host "  Config:  " -NoNewline; Write-Host $configTemplatePath -ForegroundColor White
Write-Host ""
Write-Host "To install:" -ForegroundColor Cyan
Write-Host "  1. Copy MSI to target machine" -ForegroundColor White
Write-Host "  2. Right-click -> Install (as Administrator)" -ForegroundColor White
Write-Host "  3. Configure in C:\Program Files\DDA Print Connector\config\local.json" -ForegroundColor White
Write-Host "  4. Start service: sc start DDAPrintConnector" -ForegroundColor White
Write-Host ""

Set-Location $scriptDir