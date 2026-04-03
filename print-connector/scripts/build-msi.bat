@echo off
REM Build script for DDA Print Connector MSI
REM Requires: Node.js, WiX Toolset (in PATH)

echo ========================================
echo DDA Print Connector MSI Build Script
echo ========================================
echo.

REM Check for WiX
where candle >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: WiX Toolset not found in PATH.
    echo Please install WiX Toolset from https://wixtoolset.org/releases/
    echo and add it to your PATH environment variable.
    pause
    exit /b 1
)

REM Check for pkg
call npm list @yao-pkg/pkg >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Installing build dependencies...
    call npm install --include=dev
)

REM Build the executable
echo.
echo [1/4] Building executable...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to build executable
    pause
    exit /b 1
)

REM Create output directory
if not exist "dist\msi" mkdir dist\msi

REM Compile WiX source
echo.
echo [2/4] Compiling WiX source...
candle.exe -ext WixUtilExtension -ext WixFirewallExtension -out dist\msi\product.wixobj installer\product.wxs
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: WiX compilation failed
    pause
    exit /b 1
)

REM Link MSI
echo.
echo [3/4] Linking MSI...
light.exe -ext WixUtilExtension -ext WixFirewallExtension -out dist\msi\DDAPrintConnector-%~n1.msi dist\msi\product.wixobj
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: MSI linking failed
    pause
    exit /b 1
)

echo.
echo [4/4] Build complete!
echo MSI created: dist\msi\DDAPrintConnector-1.0.0.msi
echo.
pause