@echo off
REM Complete installation script for DDA Print Connector MSI build environment
REM Run this script as Administrator

echo ================================================
echo DDA Print Connector - Build Environment Setup
echo ================================================
echo.

REM Check for Administrator privileges
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: This script must be run as Administrator.
    echo Right-click this file and select 'Run as Administrator'
    pause
    exit /b 1
)

REM Check for PowerShell
where powershell >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: PowerShell not found. Please install PowerShell.
    pause
    exit /b 1
)

REM Run the PowerShell installation script
echo Running PowerShell installation script...
echo.

PowerShell -NoProfile -ExecutionPolicy Bypass -Command "& '%~dp0install-build-env.ps1'"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ================================================
    echo Installation failed. Check the error messages above.
    echo ================================================
    pause
    exit /b 1
)

echo.
echo Installation complete!
pause