@echo off
echo ========================================
echo Push Client to GitHub
echo Repository: agu_speedcopy
echo ========================================
echo.
echo IMPORTANT: Make sure you have created the repository on GitHub:
echo https://github.com/snehakoshta/agu_speedcopy
echo.
echo If not created yet:
echo 1. Go to https://github.com/snehakoshta
echo 2. Click "New repository"
echo 3. Name: agu_speedcopy
echo 4. DO NOT initialize with README
echo 5. Click "Create repository"
echo.
pause
echo.
echo Pushing to GitHub...
echo.
git push -u origin main
echo.
if %errorlevel% equ 0 (
    echo ========================================
    echo SUCCESS! Code uploaded to GitHub
    echo ========================================
    echo.
    echo View your code at:
    echo https://github.com/snehakoshta/agu_speedcopy
) else (
    echo ========================================
    echo FAILED! 
    echo ========================================
    echo.
    echo If you see "Repository not found":
    echo - The repository is not created on GitHub yet
    echo - Go to https://github.com/snehakoshta and create it
    echo.
    echo If you see authentication error:
    echo - You may need to login to GitHub
    echo - Or setup GitHub credentials
)
echo.
pause
