@echo off
echo ========================================
echo Push Client to GitHub
echo Repository: sneha_speedcopy
echo ========================================
echo.
echo Step 1: Verify repository exists
echo Open this URL in browser to confirm:
echo https://github.com/snehakoshta/sneha_speedcopy
echo.
pause
echo.
echo Step 2: Update remote URL
git remote set-url origin https://github.com/snehakoshta/sneha_speedcopy.git
echo Remote URL updated!
echo.
echo Step 3: Verify remote
git remote -v
echo.
echo Step 4: Push to GitHub
echo This may ask for GitHub credentials...
echo.
git push -u origin main
echo.
if %errorlevel% equ 0 (
    echo ========================================
    echo SUCCESS! Code uploaded to GitHub
    echo ========================================
    echo.
    echo View your code at:
    echo https://github.com/snehakoshta/sneha_speedcopy
) else (
    echo ========================================
    echo PUSH FAILED
    echo ========================================
    echo.
    echo Possible solutions:
    echo.
    echo 1. AUTHENTICATION ISSUE:
    echo    - You may need to login to GitHub
    echo    - Try: gh auth login
    echo    - Or setup Personal Access Token
    echo.
    echo 2. REPOSITORY NOT FOUND:
    echo    - Check if repository exists at:
    echo    - https://github.com/snehakoshta/sneha_speedcopy
    echo    - Make sure it's created and you have access
    echo.
    echo 3. MANUAL PUSH:
    echo    - Open GitHub Desktop
    echo    - Or use: git push origin main --verbose
)
echo.
pause
