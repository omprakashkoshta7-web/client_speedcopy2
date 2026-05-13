@echo off
REM Environment Switcher Script for SpeedCopy Vendor Portal (Windows)
REM Usage: switch-env.bat [local|production]

setlocal

set ENV=%1
if "%ENV%"=="" set ENV=local

if /i "%ENV%"=="local" (
    echo 🔧 Switching to LOCAL development environment...
    copy /Y .env.local .env >nul
    echo ✅ Environment set to LOCAL
    echo 📍 API URL: http://localhost:4000
    echo.
    echo To start development server:
    echo   npm run dev
    goto :show_config
)

if /i "%ENV%"=="production" (
    echo 🚀 Switching to PRODUCTION environment...
    copy /Y .env .env >nul
    echo ✅ Environment set to PRODUCTION
    echo 📍 API URL: https://gateway-202671058278.asia-south1.run.app
    echo.
    echo To start development server:
    echo   npm run dev
    echo.
    echo To build for production:
    echo   npm run build
    goto :show_config
)

if /i "%ENV%"=="prod" (
    echo 🚀 Switching to PRODUCTION environment...
    copy /Y .env .env >nul
    echo ✅ Environment set to PRODUCTION
    echo 📍 API URL: https://gateway-202671058278.asia-south1.run.app
    echo.
    echo To start development server:
    echo   npm run dev
    echo.
    echo To build for production:
    echo   npm run build
    goto :show_config
)

echo ❌ Invalid environment: %ENV%
echo.
echo Usage: switch-env.bat [local^|production]
echo.
echo Available environments:
echo   local       - Use localhost backend (http://localhost:4000)
echo   production  - Use Cloud Run gateway (https://gateway-202671058278.asia-south1.run.app)
exit /b 1

:show_config
echo.
echo Current configuration:
findstr VITE_API_URL .env

endlocal
