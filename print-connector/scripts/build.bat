@echo off
REM Quick build script for DDA Print Connector MSI
REM Run this as Administrator after running install-build-env.bat

echo Building DDA Print Connector MSI...
echo.

REM Run the PowerShell build script
PowerShell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-msi.ps1"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Build successful!
    echo MSI is in: print-connector\dist\msi\
) else (
    echo.
    echo Build failed. Check error messages above.
)

pause