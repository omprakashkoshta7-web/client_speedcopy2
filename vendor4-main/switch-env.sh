#!/bin/bash

# Environment Switcher Script for SpeedCopy Vendor Portal
# Usage: ./switch-env.sh [local|production]

set -e

ENV=${1:-local}

case $ENV in
  local)
    echo "🔧 Switching to LOCAL development environment..."
    cp .env.local .env
    echo "✅ Environment set to LOCAL"
    echo "📍 API URL: http://localhost:4000"
    echo ""
    echo "To start development server:"
    echo "  npm run dev"
    ;;
    
  production|prod)
    echo "🚀 Switching to PRODUCTION environment..."
    cp .env.production .env 2>/dev/null || cp .env .env
    echo "✅ Environment set to PRODUCTION"
    echo "📍 API URL: https://gateway-202671058278.asia-south1.run.app"
    echo ""
    echo "To start development server:"
    echo "  npm run dev"
    echo ""
    echo "To build for production:"
    echo "  npm run build"
    ;;
    
  *)
    echo "❌ Invalid environment: $ENV"
    echo ""
    echo "Usage: ./switch-env.sh [local|production]"
    echo ""
    echo "Available environments:"
    echo "  local       - Use localhost backend (http://localhost:4000)"
    echo "  production  - Use Cloud Run gateway (https://gateway-202671058278.asia-south1.run.app)"
    exit 1
    ;;
esac

echo ""
echo "Current configuration:"
cat .env | grep VITE_API_URL
