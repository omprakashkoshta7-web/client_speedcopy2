# 401 Authentication Error Fix Guide

## Problem Summary
All API calls were returning 401 Unauthorized errors because there was no valid authentication token stored in localStorage.

## Root Cause
The client application is configured to use the production gateway (`https://gateway-202671058278.asia-south1.run.app`), but the user has not logged in yet to obtain a valid JWT token from the backend.

## What Was Fixed

### 1. Enhanced Error Logging
- **File**: `client/src/services/api.service.ts`
- Added detailed console logging for authentication status
- Shows token presence/absence for each API request
- Logs detailed error information for 400 and 401 responses

### 2. Global Authentication Status Banner
- **File**: `client/src/components/AuthStatusBanner.tsx` (NEW)
- Shows a red banner at the top when user is not logged in
- Provides "Login Now" button to trigger login modal
- Automatically hides when user logs in

### 3. Session Expiration Handling
Updated these pages to show "Session Expired" UI with "Login Again" button:
- `client/src/pages/WalletPage.tsx` ✅
- `client/src/pages/WishlistPage.tsx` ✅
- `client/src/pages/CartPage.tsx` ✅
- `client/src/pages/OrdersPage.tsx` ✅

### 4. Authentication Debug Logger
- **File**: `client/src/App.tsx`
- Logs authentication status on app load
- Shows token presence, user data, and API base URL
- Helps diagnose authentication issues quickly

### 5. App-Level Login Modal
- **File**: `client/src/App.tsx`
- Added global login modal that can be triggered from banner
- Allows users to login from any page

## How to Fix the 401 Errors

### Step 1: Clear Existing Session
Open browser console and run:
```javascript
localStorage.clear();
location.reload();
```

### Step 2: Login with Phone OTP
1. You'll see a red banner at the top: "You are not logged in"
2. Click "Login Now" button
3. Enter your phone number (10 digits)
4. Click "Send OTP"
5. Enter the 6-digit OTP you receive
6. Click "Verify & Login"

### Step 3: Verify Token is Saved
After successful login, check console. You should see:
```
✅ auth_token present: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
✅ User data present: Your Name | +91XXXXXXXXXX
```

### Step 4: Test APIs
Navigate to different pages:
- `/wallet` - Should show your balance
- `/orders` - Should show your orders
- `/wishlist` - Should show your wishlist
- `/cart` - Should show your cart

All API calls should now work with 200 responses instead of 401.

## Console Output Guide

### When NOT Logged In:
```
═══════════════════════════════════════════════
🔐 AUTHENTICATION STATUS CHECK
═══════════════════════════════════════════════
❌ No auth_token found in localStorage
📝 Action Required: Login with phone OTP to get token
❌ No user data found in localStorage
🌐 API Base URL: https://gateway-202671058278.asia-south1.run.app
═══════════════════════════════════════════════

⚠️ No auth_token found in localStorage for request: /api/wallet
❌ API Error: { status: 401, url: '/api/wallet', method: 'GET', message: 'Unauthorized' }
🔒 Authentication failed (401) - clearing session
```

### When Logged In Successfully:
```
═══════════════════════════════════════════════
🔐 AUTHENTICATION STATUS CHECK
═══════════════════════════════════════════════
✅ auth_token present: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
✅ User data present: John Doe | +919876543210
🌐 API Base URL: https://gateway-202671058278.asia-south1.run.app
═══════════════════════════════════════════════

✅ Auth token present for request: /api/wallet | Token preview: eyJhbGciOiJIUzI1NiIsInR5...
```

## Backend Logs Explanation

Your backend logs showed:
```
[auth] GET /api/auth/me 401 1652.965 ms - 246
[gateway] GET /api/wallet 401 2597.373 ms - 67
[gateway] GET /api/order/my-orders 401 3485.728 ms - 67
```

This means:
- ❌ No valid token was sent in the `Authorization` header
- ❌ Backend rejected the requests as unauthorized
- ✅ Backend is working correctly (it's protecting the APIs)

## Testing Checklist

After logging in, verify these work:

- [ ] Wallet page shows balance (not "Session Expired")
- [ ] Orders page shows orders (not "Session Expired")
- [ ] Wishlist page shows items (not "Session Expired")
- [ ] Cart page shows items (not "Session Expired")
- [ ] No 401 errors in console
- [ ] No red authentication banner at top
- [ ] Console shows "✅ auth_token present" messages

## Important Notes

1. **Token Storage**: The JWT token is stored in `localStorage` with key `auth_token`
2. **Token Lifetime**: Tokens may expire after some time (check backend JWT_EXPIRES_IN setting)
3. **Production Gateway**: All requests go to `https://gateway-202671058278.asia-south1.run.app`
4. **Phone OTP**: Login uses Twilio phone OTP verification
5. **Auto-Logout**: On 401 errors, the app automatically clears session and shows login UI

## Troubleshooting

### Issue: "Login Again" button doesn't work
**Solution**: Hard refresh the page (Ctrl+Shift+R) or clear browser cache

### Issue: OTP not received
**Solution**: Check backend logs for Twilio errors, verify phone number format (+91XXXXXXXXXX)

### Issue: Token present but still getting 401
**Solution**: Token might be expired or invalid. Clear localStorage and login again

### Issue: APIs work in Postman but not in browser
**Solution**: Check CORS settings in backend gateway, verify token format matches

## Files Modified

1. ✅ `client/src/services/api.service.ts` - Enhanced error logging
2. ✅ `client/src/components/AuthStatusBanner.tsx` - NEW: Global auth banner
3. ✅ `client/src/App.tsx` - Added banner and debug logger
4. ✅ `client/src/pages/WalletPage.tsx` - Session expiration handling
5. ✅ `client/src/pages/WishlistPage.tsx` - Session expiration handling
6. ✅ `client/src/pages/CartPage.tsx` - Session expiration handling
7. ✅ `client/src/pages/OrdersPage.tsx` - Session expiration handling

## Next Steps

1. **Login**: Use phone OTP to get valid token
2. **Test**: Navigate through all pages and verify APIs work
3. **Monitor**: Check console for any remaining errors
4. **Report**: If issues persist, share console logs and backend logs
