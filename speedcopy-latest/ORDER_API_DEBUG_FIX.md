# Order API Failure - Debug & Fix

## Issue
Order API is failing when creating orders. Need to add better error logging and debugging to identify the root cause.

## Changes Made

### 1. Enhanced Error Logging in order.service.ts

**File:** `speedcopy-main/src/services/order.service.ts`

**Before:**
```typescript
async createOrder(data: CreateOrderData): Promise<{ success: boolean; data: Order; message: string }> {
  try {
    console.log('📦 Creating order:', { ...data, items: `${data.items.length} items` });
    const response = await apiClient.post(API_CONFIG.ENDPOINTS.ORDERS.CREATE, data);
    console.log('✅ Order created:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Create order failed:', error);
    throw error;
  }
}
```

**After:**
```typescript
async createOrder(data: CreateOrderData): Promise<{ success: boolean; data: Order; message: string }> {
  try {
    console.log('📦 Creating order:', { ...data, items: `${data.items.length} items` });
    console.log('📦 Full order data:', JSON.stringify(data, null, 2));
    const response = await apiClient.post(API_CONFIG.ENDPOINTS.ORDERS.CREATE, data);
    console.log('✅ Order created:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Create order failed:', error);
    console.error('❌ Error response:', error?.response?.data);
    console.error('❌ Error status:', error?.response?.status);
    console.error('❌ Error message:', error?.message);
    throw error;
  }
}
```

**Improvements:**
- ✅ Added full order data logging (JSON formatted)
- ✅ Added error response data logging
- ✅ Added error status code logging
- ✅ Added error message logging
- ✅ Typed error as `any` to access response properties

---

### 2. Enhanced Debug Logging in PrintCheckoutPage.tsx

**File:** `speedcopy-main/src/pages/PrintCheckoutPage.tsx`

**Added logging before order creation:**
```typescript
console.log('🔍 Order data before sending:', JSON.stringify(orderData, null, 2));
console.log('🔍 Print config:', printConfig);
console.log('🔍 Pickup location:', pickupLocation);
console.log('🔍 Total amount:', totalAmount);
```

**Location:** Right before `orderService.createOrder(orderData)` call

**What this logs:**
- Complete order data structure (formatted JSON)
- Print configuration details
- Pickup location details
- Total amount being charged

---

## How to Debug

### Step 1: Open Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Clear console
4. Try to create an order

### Step 2: Check the Logs

**Look for these log entries:**

1. **Order Data Preparation:**
   ```
   🔍 Order data before sending: {...}
   🔍 Print config: {...}
   🔍 Pickup location: {...}
   🔍 Total amount: 50
   ```

2. **Order Creation Attempt:**
   ```
   📦 Creating order: {items: "1 items"}
   📦 Full order data: {...}
   ```

3. **Success or Failure:**
   - **Success:** `✅ Order created: {...}`
   - **Failure:** 
     ```
     ❌ Create order failed: AxiosError {...}
     ❌ Error response: {message: "...", errors: [...]}
     ❌ Error status: 422
     ❌ Error message: Request failed with status code 422
     ```

### Step 3: Analyze the Error

**Common Error Codes:**

| Status | Meaning | Likely Cause |
|--------|---------|--------------|
| 400 | Bad Request | Invalid data format |
| 401 | Unauthorized | Not logged in or token expired |
| 422 | Unprocessable Entity | Validation failed - check error response for details |
| 500 | Internal Server Error | Backend issue |

**Check Error Response:**
```javascript
// Look for this in console:
❌ Error response: {
  message: "Validation failed",
  errors: [
    { field: "shippingAddress.phone", message: "Phone is required" }
  ]
}
```

---

## Common Issues & Solutions

### Issue 1: Missing Required Fields
**Error:** `422 - Validation failed`
**Solution:** Check error response for which field is missing
```typescript
// Example fix:
shippingAddress: {
  fullName: pickupLocation?.name || 'Pickup Location',
  phone: pickupLocation?.phone || '0000000000',  // Add default
  line1: formatStoreAddress(pickupLocation?.address) || 'Store Pickup',
  city: pickupLocation?.city || 'Mumbai',
  state: pickupLocation?.state || 'Maharashtra',
  pincode: pickupLocation?.pincode || '400001',
}
```

### Issue 2: Invalid Data Types
**Error:** `422 - Validation failed`
**Solution:** Ensure numbers are numbers, strings are strings
```typescript
// BAD:
quantity: "1",  // String
unitPrice: "50",  // String

// GOOD:
quantity: 1,  // Number
unitPrice: 50,  // Number
```

### Issue 3: Authentication Issues
**Error:** `401 - Unauthorized`
**Solution:** Check if user is logged in
```typescript
// Check auth status
console.log('Is authenticated:', isAuthenticated);
console.log('Auth token:', localStorage.getItem('token'));
```

### Issue 4: Empty or Invalid Pickup Location
**Error:** Order data has invalid address
**Solution:** Validate pickup location before creating order
```typescript
if (!pickupLocation || !locationId) {
  alert('Please select a pickup location before proceeding with payment.');
  setProcessing(false);
  return;
}
```

---

## Debugging Checklist

- [ ] Check browser console for error logs
- [ ] Verify order data structure matches backend schema
- [ ] Confirm all required fields are present
- [ ] Verify data types are correct (numbers vs strings)
- [ ] Check authentication status
- [ ] Verify pickup location is selected
- [ ] Check print config is loaded
- [ ] Verify total amount is calculated correctly
- [ ] Check network tab for actual request/response
- [ ] Look for CORS errors
- [ ] Verify API endpoint is correct

---

## Network Tab Debugging

### How to Check Network Request:

1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Try to create order
4. Look for POST request to `/api/orders`
5. Click on the request
6. Check:
   - **Headers:** Verify Authorization header is present
   - **Payload:** Check request body matches expected format
   - **Response:** Check error message from backend

### Example Network Request:
```
POST https://gateway-202671058278.asia-south1.run.app/api/orders
Headers:
  Authorization: Bearer eyJhbGc...
  Content-Type: application/json
Payload:
  {
    "items": [{...}],
    "shippingAddress": {...},
    "subtotal": 50,
    "discount": 0,
    "deliveryCharge": 0,
    "total": 50
  }
Response:
  Status: 422
  Body: {
    "message": "Validation failed",
    "errors": [...]
  }
```

---

## Next Steps

1. **Run the application** and try to create an order
2. **Check console logs** for detailed error information
3. **Identify the specific error** from the logs
4. **Apply the appropriate fix** based on the error type
5. **Test again** to verify the fix works

---

## Additional Logging

If you need even more detailed logging, you can add:

### In api.service.ts (if needed):
```typescript
// Add request interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.log('🌐 API Request:', {
      method: config.method,
      url: config.url,
      data: config.data,
      headers: config.headers
    });
    return config;
  },
  (error) => {
    console.error('🌐 API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log('🌐 API Response:', {
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('🌐 API Response Error:', {
      status: error?.response?.status,
      data: error?.response?.data,
      message: error?.message
    });
    return Promise.reject(error);
  }
);
```

---

## Summary

✅ Enhanced error logging in order service
✅ Added debug logging in PrintCheckoutPage
✅ Provided debugging guide
✅ Listed common issues and solutions
✅ Added network debugging instructions

**Status:** Ready for debugging - run the app and check console logs for detailed error information.
