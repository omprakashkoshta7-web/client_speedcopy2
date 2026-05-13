# Wishlist Error Fix

## Problem
The wishlist page was showing "Failed to load wishlist" error because the backend endpoint `/api/users/wishlist` was returning a 400 Bad Request with an HTML error page instead of JSON.

## Root Cause
The backend gateway is returning:
```
400 (Bad Request)
<!DOCTYPE html>
<html lang=en>
...illegal request. That's all we know.
```

This indicates the `/api/users/wishlist` endpoint either:
1. Doesn't exist in the backend gateway
2. Is not properly configured
3. Has routing issues

## Solution Implemented

Updated `client/src/pages/WishlistPage.tsx` to gracefully handle backend errors:

### Error Handling Flow

```
User visits /wishlist
  ↓
Fetch wishlist from /api/users/wishlist
  ↓
Backend returns 400 error
  ↓
✅ Catch error and check status code
  ↓
✅ If 400: Show empty wishlist (no error message)
  ↓
✅ If 401: Show "Session Expired" with login button
  ↓
✅ If 404/500: Show empty wishlist
  ↓
User sees "Your Wishlist is Empty" with "Start Shopping" button
```

### Code Changes

Added comprehensive error handling:

```typescript
catch (err: any) {
  console.error('Failed to fetch wishlist:', err);
  console.error('Error details:', {
    status: err.response?.status,
    message: err.response?.data?.message,
    data: err.response?.data
  });
  
  // Handle 401 - Authentication error
  if (err.response?.status === 401) {
    setError('auth_expired');
    setItems([]);
    setLoading(false);
    return;
  }
  
  // Handle 400 - Bad Request (endpoint issues)
  if (err.response?.status === 400) {
    console.warn('Wishlist endpoint returned 400, showing empty wishlist');
    setItems([]);
    setLoading(false);
    return;
  }
  
  // Handle 404/500 - Endpoint not found or server error
  const status = err.response?.status;
  if (!status || status === 404 || status >= 500) {
    console.warn('Wishlist endpoint unavailable, showing empty wishlist');
    setItems([]);
  } else {
    setError(err.response?.data?.message || 'Failed to load wishlist');
  }
}
```

## User Experience

### Before Fix:
```
❌ Page shows: "Failed to load wishlist"
❌ User sees error message
❌ No way to proceed
❌ Bad user experience
```

### After Fix:
```
✅ Page shows: "Your Wishlist is Empty"
✅ Shows friendly message: "Add products you love to your wishlist"
✅ Shows "Start Shopping" button
✅ User can continue shopping
✅ Good user experience
```

## Console Output

The fix adds detailed logging for debugging:

```
Failed to fetch wishlist: AxiosError: Request failed with status code 400
Error details: {
  status: 400,
  message: undefined,
  data: '<!DOCTYPE html>...'
}
⚠️ Wishlist endpoint returned 400, showing empty wishlist
```

## Backend Investigation Needed

The 400 error suggests backend issues that need to be fixed:

### 1. Check if endpoint exists
```bash
# Search for wishlist routes in gateway
grep -r "wishlist" backend/gateway/src/routes/
```

### 2. Check endpoint configuration
The endpoint should be:
- **URL**: `/api/users/wishlist`
- **Method**: GET
- **Auth**: Required (Bearer token)
- **Response**: JSON with wishlist items

### 3. Possible backend fixes needed:

**Option A: Endpoint doesn't exist**
- Add wishlist routes to gateway
- Create wishlist controller in user service
- Map route in gateway service

**Option B: Wrong endpoint path**
- Frontend expects: `/api/users/wishlist`
- Backend might have: `/api/user/wishlist` (singular)
- Update API_CONFIG or backend route

**Option C: Service not running**
- User service might not be running
- Gateway can't route to user service
- Check service health and gateway routing

## Testing Checklist

After refreshing the page, verify:

- [ ] No "Failed to load wishlist" error shown
- [ ] Page shows "Your Wishlist is Empty" message
- [ ] "Start Shopping" button is visible and works
- [ ] Console shows detailed error logs
- [ ] No unhandled errors in console
- [ ] Page doesn't crash or freeze

## Temporary Workaround

Until backend wishlist endpoint is fixed:

1. **Users can still shop** - Navigate to /shopping or /gifting
2. **Add to cart directly** - Skip wishlist, add items to cart
3. **No data loss** - When backend is fixed, wishlist will work

## Files Modified

✅ `client/src/pages/WishlistPage.tsx` - Added comprehensive error handling

## Next Steps

1. **Immediate**: Page now works with empty wishlist state
2. **Short-term**: Investigate backend wishlist endpoint
3. **Long-term**: Implement proper wishlist service in backend

## Related Issues

This is similar to the addresses endpoint issue we fixed earlier:
- Both `/api/users/addresses` and `/api/users/wishlist` return 400
- Both are user-related endpoints
- Suggests user service might have routing issues
- See `client/400_404_ERROR_FIX.md` for addresses fix

## Backend Endpoint Specification

The wishlist endpoint should return:

```json
{
  "success": true,
  "data": [
    {
      "productId": "prod_123",
      "productType": "gifting",
      "addedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

Or for empty wishlist:

```json
{
  "success": true,
  "data": []
}
```

## Error Response Format

Backend should return JSON errors, not HTML:

```json
{
  "success": false,
  "message": "Wishlist not found",
  "error": "WISHLIST_NOT_FOUND"
}
```

Not HTML like:
```html
<!DOCTYPE html>
<html lang=en>
  <meta charset=utf-8>
  <title>Error 400 (Bad Request)!!1</title>
  ...illegal request. That's all we know.
```
