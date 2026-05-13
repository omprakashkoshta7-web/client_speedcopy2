@echo off
echo ========================================
echo Simple GitHub Upload
echo Repository: https://github.com/snehakoshta/speedcopy_agu.git
echo ========================================
echo.

REM Initialize git if needed
if not exist ".git" (
    echo Initializing Git...
    git init
    git checkout -b main
)

REM Add remote
git remote remove origin 2>nul
git remote add origin https://github.com/snehakoshta/speedcopy_agu.git

echo.
echo Adding all files...
git add .

echo.
echo Committing...
git commit -m "Upload client code"

echo.
echo Pushing to GitHub...
git push -u origin main --force

echo.
echo ========================================
echo Upload Complete!
echo ========================================
echo.
pause
