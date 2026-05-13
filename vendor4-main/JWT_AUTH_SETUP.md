# Vendor Portal - JWT Authentication Setup

## Overview

The vendor portal now implements the proper JWT authentication flow:

1. **Firebase Login** - User signs in with Firebase credentials
2. **Token Exchange** - Firebase ID token is exchanged for a backend JWT at `POST /api/auth/verify`
3. **JWT Storage** - Backend JWT is stored in localStorage
4. **API Calls** - All API requests use the stored backend JWT

## Key Changes

### ✅ What Was Fixed

1. **`src/services/api.ts`**
   - Removed Firebase token auto-refresh from every API call
   - Now uses only the stored backend JWT
   - Synchronous token retrieval (no async needed)

2. **`src/services/firebase-auth.ts`**
   - Proper JWT exchange implementation
   - Firebase token sent in `Authorization: Bearer` header (not body)
   - Stores backend JWT (not Firebase token)
   - Optimized session sync to avoid unnecessary re-verification

3. **Environment Configuration**
   - `.env` - Production (Cloud Run gateway)
   - `.env.local` - Local development (localhost)
   - Environment switcher scripts for easy switching

## Authentication Flow

```
┌─────────────────────────────────────────────────────────┐
│                    LOGIN FLOW                            │
└─────────────────────────────────────────────────────────┘

1. User enters email/password
   ↓
2. Firebase sign-in
   ↓
3. Get Firebase ID token (ONCE)
   ↓
4. POST /api/auth/verify with Firebase token
   Authorization: Bearer <firebase_id_token>
   ↓
5. Backend verifies and returns backend JWT
   ↓
6. Store backend JWT in localStorage
   ↓
7. All API calls use backend JWT
   Authorization: Bearer <backend_jwt>
```

## Setup Instructions

### Production (Cloud Run)

```bash
# Default .env already configured for production
npm install
npm run dev

# Open http://localhost:5173
```

### Local Development

```bash
# Switch to local environment
./switch-env.sh local
# or on Windows: switch-env.bat local

# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:5173
```

## Environment Variables

### Production (.env)
```env
VITE_API_URL=https://gateway-202671058278.asia-south1.run.app
```

### Local (.env.local)
```env
VITE_API_URL=http://localhost:4000
```

## Testing

### Test Login Flow

1. Start the app: `npm run dev`
2. Open http://localhost:5173
3. Enter vendor credentials
4. Check browser DevTools → Network tab
5. Verify:
   - POST to `/api/auth/verify` with Firebase token
   - Response contains `data.token` (backend JWT)
   - Subsequent API calls use backend JWT

### Verify JWT Storage

```javascript
// In browser console after login
console.log('JWT:', localStorage.getItem('auth_token'));
// Should show: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Verify API Calls

```javascript
// In browser console
// Check Network tab for any API call
// Should see Authorization header:
// Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Important Rules

✅ **DO:**
- Use stored backend JWT for all API calls
- Exchange Firebase token only once at login
- Store backend JWT in localStorage
- Clear JWT on logout

❌ **DON'T:**
- Send Firebase token to API endpoints
- Refresh Firebase token on every API call
- Mix Firebase token and backend JWT
- Store Firebase token in localStorage

## Troubleshooting

### Issue: API calls return 401

**Check:**
```javascript
console.log(localStorage.getItem('auth_token'));
```

**Solution:**
- Verify JWT is stored
- Check if JWT has expired
- Re-login if needed

### Issue: "Cannot connect to backend"

**Check:**
```bash
cat .env | grep VITE_API_URL
```

**Solution:**
- Verify correct environment is set
- For local: ensure backend is running on port 4000
- For production: verify gateway is accessible

### Issue: Environment not switching

**Solution:**
```bash
# Stop dev server (Ctrl+C)
./switch-env.sh local
npm run dev
# Hard refresh browser (Ctrl+Shift+R)
```

## Files Modified

- ✅ `src/services/api.ts` - JWT-only API client
- ✅ `src/services/firebase-auth.ts` - Proper token exchange
- ✅ `.env` - Production configuration
- ✅ `.env.local` - Local development configuration
- ✅ `switch-env.sh` / `switch-env.bat` - Environment switcher

## Next Steps

1. Test login flow thoroughly
2. Verify all API calls work
3. Test logout functionality
4. Test token expiration handling
5. Deploy to production

## References

- [Backend JWT Guide](../backend/docs/JWT_AUTH_GUIDE.md)
- [Admin Portal Setup](../admin/AUTH_IMPLEMENTATION.md)
- [Staff Portal Setup](../staff/JWT_AUTH_SETUP.md)
