@echo off
echo ========================================
echo Uploading Client to GitHub
echo Repository: https://github.com/snehakoshta/speedcopy_agu.git
echo ========================================
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0upload-to-sneha-repo.ps1"
pause
