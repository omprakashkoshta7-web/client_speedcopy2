@echo off
echo ========================================
echo Creating Clean Copy for GitHub Upload
echo ========================================
echo.

REM Create clean directory
if exist "client_for_github" rmdir /s /q "client_for_github"
mkdir "client_for_github"

echo Copying source files...

REM Copy important files and folders (excluding node_modules, dist, .git)
xcopy /E /I /Y "src" "client_for_github\src"
xcopy /E /I /Y "public" "client_for_github\public"

REM Copy config files
copy /Y ".gitignore" "client_for_github\"
copy /Y ".env.example" "client_for_github\"
copy /Y "package.json" "client_for_github\"
copy /Y "package-lock.json" "client_for_github\"
copy /Y "vite.config.ts" "client_for_github\"
copy /Y "tsconfig.json" "client_for_github\"
copy /Y "tsconfig.app.json" "client_for_github\"
copy /Y "tsconfig.node.json" "client_for_github\"
copy /Y "tailwind.config.js" "client_for_github\"
copy /Y "postcss.config.js" "client_for_github\"
copy /Y "eslint.config.js" "client_for_github\"
copy /Y "index.html" "client_for_github\"
copy /Y "README.md" "client_for_github\"

echo.
echo ========================================
echo Clean copy created in: client_for_github
echo ========================================
echo.
echo Files excluded:
echo - node_modules (too large)
echo - dist (build output)
echo - .git (git history)
echo - .env (sensitive data)
echo.
echo Next steps:
echo 1. Go to: https://github.com/snehakoshta/sneha_speedcopy
echo 2. Click "Add file" -^> "Upload files"
echo 3. Drag and drop ALL files from "client_for_github" folder
echo 4. Commit the files
echo.
echo Opening the folder...
explorer "client_for_github"
echo.
pause
