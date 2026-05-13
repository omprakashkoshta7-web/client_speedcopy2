@echo off
echo ========================================
echo Push to GitHub (After Repo Creation)
echo ========================================
echo.
echo Make sure you have created the repository on GitHub:
echo https://github.com/snehakoshta/speedcopy_agu
echo.
pause
echo.
echo Pushing to GitHub...
git push -u origin main
echo.
if %errorlevel% equ 0 (
    echo ========================================
    echo SUCCESS! Code uploaded to GitHub
    echo ========================================
) else (
    echo ========================================
    echo FAILED! Check the error above
    echo ========================================
    echo.
    echo Common issues:
    echo 1. Repository not created on GitHub
    echo 2. Wrong repository name
    echo 3. No access/authentication issue
)
echo.
pause
