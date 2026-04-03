# DDA Print Connector MSI Build Script
# Requires: Node.js, WiX Toolset

$ErrorActionPreference = "Stop"

Write-Host "========================================"
Write-Host "DDA Print Connector MSI Build Script"
Write-Host "========================================"
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Get-Item $scriptDir).Parent.FullName
$distDir = Join-Path $projectRoot "dist"
$msiDir = Join-Path $distDir "msi"

# Read version from package.json
$packageJson = Get-Content (Join-Path $projectRoot "package.json") | ConvertFrom-Json
$version = $packageJson.version

# Ensure dist directories exist
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
}
if (-not (Test-Path $msiDir)) {
    New-Item -ItemType Directory -Path $msiDir -Force | Out-Null
}

# Step 1: Build executable
Write-Host "[1/5] Building executable..."
Set-Location $projectRoot
& npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to build executable" -ForegroundColor Red
    exit 1
}

# Step 2: Find WiX
Write-Host "`n[2/5] Checking for WiX Toolset..."
$wixPath = $env:WIX
if ($wixPath) {
    $candle = Join-Path $wixPath "bin\candle.exe"
    $light = Join-Path $wixPath "bin\light.exe"
} else {
    $candle = "candle.exe"
    $light = "light.exe"
}

try {
    & $candle -? | Out-Null
    Write-Host "WiX Toolset found."
} catch {
    Write-Host "`nERROR: WiX Toolset not found." -ForegroundColor Red
    Write-Host "Please install from https://wixtoolset.org/releases/"
    Write-Host "Add WiX bin folder to PATH or set WIX environment variable."
    exit 1
}

# Step 3: Compile WiX source
Write-Host "`n[3/5] Compiling WiX source..."
$wixobjPath = Join-Path $msiDir "product.wixobj"
& $candle -ext WixUtilExtension -out $wixobjPath (Join-Path $projectRoot "installer\product.wxs")
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: WiX compilation failed" -ForegroundColor Red
    exit 1
}

# Step 4: Link MSI
Write-Host "`n[4/5] Linking MSI..."
$msiPath = Join-Path $msiDir "DDAPrintConnector-$version.msi"
& $light -ext WixUtilExtension -out $msiPath $wixobjPath
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: MSI linking failed" -ForegroundColor Red
    exit 1
}

# Step 5: Create config template
Write-Host "`n[5/5] Creating config template..."
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

Write-Host "`n========================================"
Write-Host "Build complete!"
Write-Host "========================================"
Write-Host "MSI: " -NoNewline
Write-Host $msiPath -ForegroundColor Green
Write-Host "Config template: " -NoNewline
Write-Host $configTemplatePath -ForegroundColor Green
Write-Host "`nTo install:"
Write-Host "1. Run the MSI as Administrator"
Write-Host "2. Edit config in 'C:\Program Files\DDA Print Connector\config\local.json'"
Write-Host "3. Start the service: sc start DDAPrintConnector`n"