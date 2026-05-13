# eshop-delivery-mobile

Expo delivery console for rider operations with:
- secure rider login
- atomic task acceptance
- pickup verification
- live route map
- realtime location sync through the eShop realtime service

## Run
```bash
npm install
npm run start
```

## Env
Copy `.env.example` to `.env` and set:
```bash
# Render defaults
EXPO_PUBLIC_API_URL=https://eshop-gateway-zcms.onrender.com
EXPO_PUBLIC_REALTIME_URL=https://eshop-realtime.onrender.com
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
# or, for Google Maps demo-project testing on the app side only
EXPO_PUBLIC_GOOGLE_MAPS_DEMO_KEY=your_maps_demo_key

# Local testing
# EXPO_PUBLIC_API_URL=http://YOUR_MACHINE_IP:8080
# EXPO_PUBLIC_REALTIME_URL=http://YOUR_MACHINE_IP:8087
```

`app.config.ts` reads `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` first, then falls back to `EXPO_PUBLIC_GOOGLE_MAPS_DEMO_KEY`.

The backend `delivery-service` still needs `GOOGLE_MAPS_API_KEY` for route and geocode enrichment.
