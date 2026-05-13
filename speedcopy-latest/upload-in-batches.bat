@echo off
echo ========================================
echo Client GitHub Upload - Batch Mode
echo ========================================
echo.

REM Run the PowerShell script
powershell -ExecutionPolicy Bypass -File "%~dp0upload-in-batches.ps1"

echo.
echo Press any key to exit...
pause >nul
