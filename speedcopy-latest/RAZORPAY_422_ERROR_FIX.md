# Razorpay 422 Error Fix - Order Creation Validation

## Problem
When attempting to create an order after Razorpay payment, the API was returning a 422 (Unprocessable Entity) error:
```
POST https://gateway-202671058278.asia-south1.run.app/api/orders 422 (Unprocessable Content)
Validation failed
```

## Root Cause
The backend was rejecting the order data because:

1. **Extra fields being sent**: The orderData was including fields that the backend doesn't expect:
   - `razorpayPaymentId`
   - `razorpayOrderId`
   - `razorpaySignature`
   - `paymentStatus`

2. **Incorrect field structure**: Some fields were being sent with incorrect values or types

3. **Backend validation**: The backend's CreateOrderData interface only expects specific fields, and any extra fields cause validation to fail

## Solution Implemented

### 1. Cleaned Up Order Data Structure (PrintCheckoutPage.tsx)

**Before:**
```typescript
const orderData = {
  items: [...],
  shippingAddress: {...},
  pickupShopId: locationId || undefined,  // ❌ undefined values
  subtotal: totalAmount,
  discount: 0,
  deliveryCharge: 0,
  total: totalAmount,
  paymentMethod: method,  // ❌ Always sent
  notes: '...',
};
```

**After:**
```typescript
const orderData: any = {
  items: [...],
  shippingAddress: {...},
  subtotal: totalAmount,
  discount: 0,
  deliveryCharge: 0,
  total: totalAmount,
  notes: '...',
};

// Add optional fields only if they have values
if (locationId) {
  orderData.pickupShopId = locationId;
}
if (method && method !== 'upi') {
  orderData.paymentMethod = method;
}
```

### 2. Removed Payment Fields from Order Data (handleRazorpayPayment)

**Before:**
```typescript
const finalOrderData = {
  ...orderData,
  razorpayPaymentId: checkoutResult.razorpayPaymentId,      // ❌ Extra field
  razorpayOrderId: checkoutResult.razorpayOrderId,          // ❌ Extra field
  razorpaySignature: checkoutResult.razorpaySignature,      // ❌ Extra field
  paymentStatus: 'completed',                                // ❌ Extra field
};

const response = await orderService.createOrder(finalOrderData);
```

**After:**
```typescript
// Create order WITHOUT adding payment fields
const response = await orderService.createOrder(orderData);

// Store payment details separately for reference
sessionStorage.setItem(`order_payment_${createdOrderId}`, JSON.stringify({
  razorpayPaymentId: checkoutResult.razorpayPaymentId,
  razorpayOrderId: checkoutResult.razorpayOrderId || paymentData.razorpayOrderId,
  razorpaySignature: checkoutResult.razorpaySignature,
  paymentStatus: 'completed',
}));
```

### 3. Fixed Shipping Address Handling

**Before:**
```typescript
shippingAddress: pickupLocation ? {
  fullName: pickupLocation.name || 'Pickup Location',
  phone: pickupLocation.phone || '',
  line1: formatStoreAddress(pickupLocation.address),  // ❌ Could be undefined
  // ...
} : {
  fullName: 'Pickup Location',
  phone: '',
  line1: 'Store Pickup',
  // ...
}
```

**After:**
```typescript
shippingAddress: {
  fullName: pickupLocation?.name || 'Pickup Location',
  phone: pickupLocation?.phone || '',
  line1: formatStoreAddress(pickupLocation?.address) || 'Store Pickup',  // ✅ Fallback
  // ...
}
```

## Expected Backend Validation

The backend expects the CreateOrderData interface:
```typescript
export interface CreateOrderData {
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  subtotal: number;
  discount?: number;
  deliveryCharge?: number;
  total: number;
  paymentMethod?: string;
  notes?: string;
  pickupShopId?: string;
  couponCode?: string;
}
```

**Key Points:**
- ✅ `items` - Required, array of OrderItem
- ✅ `shippingAddress` - Required, must have line1, city, pincode
- ✅ `subtotal` - Required, number
- ✅ `discount` - Optional, defaults to 0
- ✅ `deliveryCharge` - Optional, defaults to 0
- ✅ `total` - Required, number
- ✅ `paymentMethod` - Optional
- ✅ `notes` - Optional
- ✅ `pickupShopId` - Optional
- ✅ `couponCode` - Optional
- ❌ `razorpayPaymentId` - NOT expected
- ❌ `razorpayOrderId` - NOT expected
- ❌ `razorpaySignature` - NOT expected
- ❌ `paymentStatus` - NOT expected

## Files Modified

### speedcopy-main/src/pages/PrintCheckoutPage.tsx

1. **Updated handlePayment function** (lines 170-240):
   - Cleaned up orderData structure
   - Only add optional fields if they have values
   - Removed undefined values

2. **Updated handleRazorpayPayment function** (lines 280-330):
   - Removed payment fields from orderData
   - Store payment details in sessionStorage instead
   - Simplified order creation flow

## Testing Checklist

- [ ] Select print options and proceed to checkout
- [ ] Select a pickup location
- [ ] Choose Razorpay payment method
- [ ] Complete Razorpay payment
- [ ] Verify order is created successfully (no 422 error)
- [ ] Check that order appears in orders list
- [ ] Verify payment details are stored in sessionStorage
- [ ] Test with different payment methods (UPI, Card, Wallet)
- [ ] Test with different binding types and cover pages
- [ ] Verify order summary shows correct details

## Error Handling

If you still see 422 errors, check:

1. **Shipping Address**: Ensure all required fields are present
   - `line1` - Must not be empty
   - `city` - Must not be empty
   - `pincode` - Must be valid format

2. **Items Array**: Ensure items have all required fields
   - `productId` - Must not be empty
   - `quantity` - Must be > 0
   - `unitPrice` - Must be valid number
   - `totalPrice` - Must be valid number

3. **Totals**: Ensure calculations are correct
   - `subtotal` - Must equal sum of item prices
   - `total` - Must equal subtotal + discount + deliveryCharge

4. **Print Config**: Ensure all print options are valid
   - `bindingType` - Must be one of: None, Soft Binding, Spiral Binding, Thesis Binding
   - `coverPage` - Must be one of: None, Transparent, Colored, Leather-finish

## Payment Flow

```
1. User selects print options
   ↓
2. User selects pickup location
   ↓
3. User chooses payment method
   ↓
4. handlePayment() is called
   ↓
5. If Razorpay: handleRazorpayPayment()
   - Initiate Razorpay payment
   - User completes payment
   - Create order (WITHOUT payment fields)
   - Store payment details in sessionStorage
   - Navigate to success page
   ↓
6. If Wallet: Direct order creation
   - Create order
   - Navigate to success page
```

## Future Improvements

1. Add backend payment verification endpoint
2. Implement webhook for payment confirmation
3. Add retry logic for failed orders
4. Implement order status polling
5. Add payment receipt generation
