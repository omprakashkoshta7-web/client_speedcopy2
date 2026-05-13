# 400 and 404 Error Fixes

## Issues Fixed

### 1. 400 Bad Request on `/api/users/addresses`
**Problem**: CheckoutPage was failing when trying to fetch user addresses, causing the entire checkout data fetch to fail.

**Root Cause**: The `/api/users/addresses` endpoint might not be properly implemented in the backend gateway, or it expects different parameters.

**Solution**:
- Separated address fetching from critical cart/wallet fetching in CheckoutPage
- Added try-catch around address fetch so it doesn't break checkout
- Added fallback to alternative endpoint `/api/user/addresses` (singular)
- Returns empty array if both endpoints fail, allowing user to add address manually

**Files Modified**:
- `client/src/pages/CheckoutPage.tsx` - Separated address fetch with error handling
- `client/src/services/user.service.ts` - Added fallback endpoint and graceful failure

### 2. 404 Not Found Errors
**Problem**: Some endpoints returning 404, but errors weren't clear about which endpoints.

**Solution**:
- Enhanced error logging in `api.service.ts` to show detailed 404 information
- Added helpful tip message pointing to backend gateway check
- Shows requested URL clearly in console

**Files Modified**:
- `client/src/services/api.service.ts` - Added 404 error handling with detailed logging

## Error Handling Flow

### Before Fix:
```
CheckoutPage loads
  ↓
Fetches cart, wallet, addresses in parallel
  ↓
Addresses endpoint returns 400
  ↓
❌ Entire Promise.all fails
  ↓
❌ No cart data shown
  ↓
❌ User can't proceed to checkout
```

### After Fix:
```
CheckoutPage loads
  ↓
Fetches cart and wallet (critical data)
  ↓
✅ Cart and wallet data loaded
  ↓
Separately fetches addresses with try-catch
  ↓
Primary endpoint fails (400)
  ↓
Tries alternative endpoint /api/user/addresses
  ↓
If that fails too, returns empty array
  ↓
✅ Checkout page still works
  ↓
✅ User can add address manually
```

## Console Output Examples

### 400 Error (Before):
```
❌ API Error: { status: 400, url: '/api/users/addresses', method: 'GET' }
🔴 Bad Request (400): Bad request
CheckoutPage.tsx:117 Failed to fetch checkout data: AxiosError
```

### 400 Error (After):
```
❌ API Error: { status: 400, url: '/api/users/addresses', method: 'GET', message: 'Bad request' }
🔴 Bad Request (400): Bad request
Request details: { url: '/api/users/addresses', method: 'get', data: undefined }
⚠️ Primary addresses endpoint failed, trying alternative...
❌ Alternative addresses endpoint also failed
✅ Checkout page loaded with empty addresses array
```

### 404 Error (After):
```
❌ API Error: { status: 404, url: '/api/some/endpoint', method: 'GET' }
🔍 Not Found (404): Endpoint not found
Requested URL: /api/some/endpoint
💡 Tip: Check if this endpoint exists in the backend gateway
```

## Backend Investigation Needed

The 400 error on `/api/users/addresses` suggests one of these issues:

1. **Endpoint doesn't exist** in backend gateway
   - Check `backend/gateway/src/routes/` for user routes
   - Verify the endpoint is registered in gateway

2. **Endpoint expects different format**
   - Check if it should be `/api/user/addresses` (singular)
   - Check if it requires query parameters

3. **Authentication issue**
   - Endpoint might require specific user role
   - Token might not have necessary permissions

4. **Service not running**
   - User service might not be running
   - Gateway might not be routing to user service correctly

## Recommended Backend Checks

1. Check gateway routes:
```bash
# Look for user/address routes
grep -r "addresses" backend/gateway/src/routes/
```

2. Check if user service is running:
```bash
# Check user service logs
tail -f backend/services/user-service/logs/*.log
```

3. Test endpoint directly:
```bash
# Test with curl
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://gateway-202671058278.asia-south1.run.app/api/users/addresses
```

4. Check gateway service mapping:
```javascript
// backend/gateway/src/services/app.service.js
// Verify user service is registered and routing correctly
```

## Testing Checklist

After these fixes, verify:

- [ ] CheckoutPage loads even if addresses fail
- [ ] Cart items are shown in checkout
- [ ] Wallet balance is shown
- [ ] "Add Address" button works
- [ ] User can manually add address
- [ ] Checkout can proceed with manually added address
- [ ] Console shows clear error messages for 400/404
- [ ] No unhandled promise rejections

## Temporary Workaround

Until backend addresses endpoint is fixed, users can:

1. Navigate to checkout page
2. Click "Add New Address" button
3. Fill in address details manually
4. Proceed with checkout

The checkout flow will work normally once address is added.

## Files Modified

1. ✅ `client/src/pages/CheckoutPage.tsx` - Separated address fetch with error handling
2. ✅ `client/src/services/user.service.ts` - Added fallback endpoint
3. ✅ `client/src/services/api.service.ts` - Enhanced 404 error logging

## Next Steps

1. **Immediate**: Test checkout page - should work even with address errors
2. **Short-term**: Investigate backend addresses endpoint
3. **Long-term**: Implement proper address management service
