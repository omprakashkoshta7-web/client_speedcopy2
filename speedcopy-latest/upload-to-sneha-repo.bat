@echo off
echo ========================================
echo Upload Client to Sneha's GitHub Repo
echo ========================================
echo.
echo Repository: https://github.com/snehakoshta/speedcopy_agu.git
echo.

REM Run the PowerShell script
powershell -ExecutionPolicy Bypass -File "%~dp0upload-to-sneha-repo.ps1"
