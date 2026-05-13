@echo off
echo ========================================
echo Change GitHub Repository
echo ========================================
echo.
set /p REPO_URL="Enter your GitHub repository URL: "
echo.
echo Removing old remote...
git remote remove origin
echo.
echo Adding new remote: %REPO_URL%
git remote add origin %REPO_URL%
echo.
echo Pushing to new repository...
git push -u origin main
echo.
if %errorlevel% equ 0 (
    echo ========================================
    echo SUCCESS! Code uploaded to: %REPO_URL%
    echo ========================================
) else (
    echo ========================================
    echo FAILED! Check the error above
    echo ========================================
)
echo.
pause
