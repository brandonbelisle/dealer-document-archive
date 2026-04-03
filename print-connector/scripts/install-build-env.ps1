<#
.SYNOPSIS
    Complete installation script for DDA Print Connector MSI build environment
.DESCRIPTION
    Installs all dependencies required to build the DDA Print Connector MSI:
    - Node.js 18+ LTS
    - WiX Toolset v3
    - npm dependencies
    - Builds the MSI installer
    
    Run this script as Administrator.
.EXAMPLE
    .\install-build-env.ps1
#>

param(
    [switch]$SkipNode,
    [switch]$SkipWix,
    [switch]$Build
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Get-Item $scriptDir).Parent.FullName

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "DDA Print Connector - Build Environment Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check for Administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator." -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Node.js installation
if (-not $SkipNode) {
    Write-Host "[1/4] Checking Node.js installation..." -ForegroundColor Yellow
    
    $nodeInstalled = $false
    try {
        $nodeVersion = node --version 2>$null
        if ($nodeVersion -match "v(\d+)\.") {
            $majorVersion = [int]$Matches[1]
            if ($majorVersion -ge 18) {
                $nodeInstalled = $true
                Write-Host "  Found Node.js $nodeVersion" -ForegroundColor Green
            } else {
                Write-Host "  Node.js $nodeVersion found, but version 18+ required" -ForegroundColor Yellow
            }
        }
    } catch {
        # Node not found
    }

    if (-not $nodeInstalled) {
        Write-Host "  Installing Node.js 20 LTS..." -ForegroundColor Yellow
        
        # Download Node.js installer
        $nodeUrl = "https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi"
        $nodeMsi = Join-Path $env:TEMP "node-installer.msi"
        
        Write-Host "  Downloading Node.js..." -ForegroundColor Gray
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeMsi -UseBasicParsing
        
        Write-Host "  Installing Node.js..." -ForegroundColor Gray
        Start-Process msiexec.exe -ArgumentList "/i `"$nodeMsi`" /qn ADDLOCAL=ALL" -Wait -NoNewWindow
        
        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        # Verify installation
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
        $npmPath = Join-Path $env:ProgramFiles "nodejs"
        if (Test-Path $npmPath) {
            $env:Path = "$npmPath;$env:Path"
        }
        
        Remove-Item $nodeMsi -Force -ErrorAction SilentlyContinue
        Write-Host "  Node.js installed successfully" -ForegroundColor Green
    }
} else {
    Write-Host "[1/4] Skipping Node.js installation" -ForegroundColor Gray
}

# WiX Toolset installation
if (-not $SkipWix) {
    Write-Host ""
    Write-Host "[2/4] Checking WiX Toolset installation..." -ForegroundColor Yellow
    
    $wixInstalled = $false
    $wixPath = $env:WIX
    $wixBinPath = $null
    
    # Check common WiX installation locations
    $wixLocations = @(
        "C:\Program Files (x86)\WiX Toolset v3.14",
        "C:\Program Files (x86)\WiX Toolset v3.11",
        "C:\Program Files\WiX Toolset v3.14",
        "C:\Program Files\WiX Toolset v3.11",
        $wixPath
    )
    
    foreach ($loc in $wixLocations) {
        if ($loc) {
            $binPath = Join-Path $loc "bin"
            if (Test-Path (Join-Path $binPath "candle.exe")) {
                $wixInstalled = $true
                $wixBinPath = $binPath
                $wixPath = $loc
                Write-Host "  Found WiX at $loc" -ForegroundColor Green
                break
            }
        }
    }
    
    # Also check PATH
    if (-not $wixInstalled) {
        try {
            $candlePath = (Get-Command candle.exe -ErrorAction SilentlyContinue).Source
            if ($candlePath) {
                $wixBinPath = Split-Path $candlePath
                $wixInstalled = $true
                Write-Host "  Found WiX in PATH: $wixBinPath" -ForegroundColor Green
            }
        } catch {}
    }
    
    if (-not $wixInstalled) {
        Write-Host "  Installing WiX Toolset v3.14..." -ForegroundColor Yellow
        
        # Download WiX
        $wixUrl = "https://github.com/wixtoolset/wix3/releases/download/wix3141rtm/wix314.exe"
        $wixExe = Join-Path $env:TEMP "wix-installer.exe"
        
        Write-Host "  Downloading WiX Toolset..." -ForegroundColor Gray
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $wixUrl -OutFile $wixExe -UseBasicParsing
        
        Write-Host "  Installing WiX Toolset..." -ForegroundColor Gray
        Start-Process $wixExe -ArgumentList "/install", "/quiet", "/norestart" -Wait -NoNewWindow
        
        # Set WIX environment variable and add to PATH
        $wixPath = "C:\Program Files (x86)\WiX Toolset v3.14"
        $wixBinPath = Join-Path $wixPath "bin"
        
        [Environment]::SetEnvironmentVariable("WIX", $wixPath, "Machine")
        $currentPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
        if ($currentPath -notlike "*$wixBinPath*") {
            [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$wixBinPath", "Machine")
        }
        
        # Refresh current session
        $env:WIX = $wixPath
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        Remove-Item $wixExe -Force -ErrorAction SilentlyContinue
        Write-Host "  WiX Toolset installed successfully" -ForegroundColor Green
    }
    
    # Set WIX environment for this session
    if ($wixPath) {
        $env:WIX = $wixPath
    }
    if ($wixBinPath) {
        $env:Path = "$wixBinPath;$env:Path"
    }
} else {
    Write-Host "[2/4] Skipping WiX installation" -ForegroundColor Gray
}

# Install npm dependencies
Write-Host ""
Write-Host "[3/4] Installing npm dependencies..." -ForegroundColor Yellow

Set-Location $projectRoot

# Install all dependencies including devDependencies
Write-Host "  Running npm install..." -ForegroundColor Gray
npm install --include=dev
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: npm install failed" -ForegroundColor Red
    exit 1
}
Write-Host "  npm dependencies installed" -ForegroundColor Green

# Build the MSI if requested or by default
if ($Build -or (-not $SkipNode -and -not $SkipWix)) {
    Write-Host ""
    Write-Host "[4/4] Building MSI..." -ForegroundColor Yellow
    
    # Run the MSI build script
    & "$projectRoot\scripts\build-msi.ps1"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "================================================" -ForegroundColor Red
        Write-Host "MSI build failed. Check the error messages above." -ForegroundColor Red
        Write-Host "================================================" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host ""
    Write-Host "[4/4] Skipping MSI build (use -Build flag to build)" -ForegroundColor Gray
}

# Final summary
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# Verify installations
Write-Host "Installed components:" -ForegroundColor Cyan
try {
    $nodeVer = node --version
    Write-Host "  Node.js:    $nodeVer" -ForegroundColor White
} catch {
    Write-Host "  Node.js:    NOT FOUND (restart terminal)" -ForegroundColor Red
}

try {
    $npmVer = npm --version
    Write-Host "  npm:        $npmVer" -ForegroundColor White
} catch {
    Write-Host "  npm:        NOT FOUND" -ForegroundColor Red
}

try {
    $candleOut = & candle.exe -? 2>&1
    if ($candleOut -match "Windows Installer XML") {
        Write-Host "  WiX:        Installed" -ForegroundColor White
    } else {
        Write-Host "  WiX:        NOT FOUND (restart terminal)" -ForegroundColor Red
    }
} catch {
    Write-Host "  WiX:        NOT FOUND (restart terminal)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. If this is a new terminal, restart it to refresh PATH" -ForegroundColor White
Write-Host "  2. Configure: edit print-connector\config\local.json" -ForegroundColor White
Write-Host "  3. Build MSI:  .\scripts\build-msi.ps1" -ForegroundColor White
Write-Host "  4. Install MSI: Right-click .msi file -> Install" -ForegroundColor White
Write-Host ""