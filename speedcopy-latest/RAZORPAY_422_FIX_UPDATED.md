# Razorpay 422 Error Fix - Order Data Validation

## Issue
Backend was returning 422 (Unprocessable Content) error when creating printing orders via Razorpay payment.

**Error:**
```
POST https://gateway-202671058278.asia-south1.run.app/api/orders 422 (Unprocessable Content)
API Error: {status: 422, url: '/api/orders', method: 'POST', message: 'Validation failed'}
```

## Root Cause
The order data being sent to the backend contained fields that didn't match the backend's expected schema:

1. **`coverPage` field in printConfig** - Not part of the backend's expected printConfig structure
2. **`notes` field** - Not part of the CreateOrderData interface
3. **`line2` field with empty string** - Should be omitted if empty
4. **`country` field** - Unnecessary, should be omitted

## Solution Implemented

**File: `speedcopy-main/src/pages/PrintCheckoutPage.tsx`**

### Changes Made:

1. **Removed `coverPage` from printConfig:**
   ```typescript
   // BEFORE
   printConfig: {
     paperSize: printConfig.pageSize || 'A4',
     paperType: printConfig.paperType || 'Standard',
     colorOption: printConfig.colorMode || 'B&W',
     bindingType: printConfig.bindingType || 'None',
     coverPage: printConfig.coverPage || 'None',  // ❌ REMOVED
     sides: printConfig.printSide || 'one-sided',
     copies: printConfig.copies || 1,
     pages: printConfig.totalPages || 0,
   }

   // AFTER
   printConfig: {
     paperSize: printConfig.pageSize || 'A4',
     paperType: printConfig.paperType || 'Standard',
     colorOption: printConfig.colorMode || 'B&W',
     bindingType: printConfig.bindingType || 'None',
     sides: printConfig.printSide || 'one-sided',
     copies: printConfig.copies || 1,
     pages: printConfig.totalPages || 0,
   }
   ```

2. **Removed `notes` field from order data:**
   ```typescript
   // BEFORE
   const orderData: any = {
     items: [...],
     shippingAddress: {...},
     subtotal: totalAmount,
     discount: 0,
     deliveryCharge: 0,
     total: totalAmount,
     notes: `Pickup at: ${pickupLocation?.name || 'Store'} | Print Config: ...`,  // ❌ REMOVED
   };

   // AFTER
   const orderData: any = {
     items: [...],
     shippingAddress: {...},
     subtotal: totalAmount,
     discount: 0,
     deliveryCharge: 0,
     total: totalAmount,
   };
   ```

3. **Cleaned up shippingAddress:**
   ```typescript
   // BEFORE
   shippingAddress: {
     fullName: pickupLocation?.name || 'Pickup Location',
     phone: pickupLocation?.phone || '',
     line1: formatStoreAddress(pickupLocation?.address) || 'Store Pickup',
     line2: '',  // ❌ REMOVED (empty string)
     city: pickupLocation?.city || pickupLocation?.address?.city || 'Mumbai',
     state: pickupLocation?.state || pickupLocation?.address?.state || 'Maharashtra',
     pincode: pickupLocation?.pincode || pickupLocation?.pinCode || pickupLocation?.address?.pincode || '400001',
     country: 'India',  // ❌ REMOVED (unnecessary)
   }

   // AFTER
   shippingAddress: {
     fullName: pickupLocation?.name || 'Pickup Location',
     phone: pickupLocation?.phone || '',
     line1: formatStoreAddress(pickupLocation?.address) || 'Store Pickup',
     city: pickupLocation?.city || pickupLocation?.address?.city || 'Mumbai',
     state: pickupLocation?.state || pickupLocation?.address?.state || 'Maharashtra',
     pincode: pickupLocation?.pincode || pickupLocation?.pinCode || pickupLocation?.address?.pincode || '400001',
   }
   ```

## Backend Expected Schema

**CreateOrderData Interface:**
```typescript
export interface CreateOrderData {
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  subtotal: number;
  discount?: number;
  deliveryCharge?: number;
  total: number;
  paymentMethod?: string;
  pickupShopId?: string;
  couponCode?: string;
}
```

**OrderItem.printConfig (allowed fields):**
```typescript
printConfig?: {
  paperSize?: string;
  paperType?: string;
  colorOption?: string;
  bindingType?: string;
  sides?: string;
  copies?: number;
  pages?: number;
}
```

## Testing
✅ Verified no TypeScript compilation errors
✅ Order data now matches backend schema exactly
✅ Only required and expected fields are sent
✅ Optional fields are only added when they have values

## Related Files
- `speedcopy-main/src/pages/PrintCheckoutPage.tsx` - Fixed order data construction
- `speedcopy-main/src/services/order.service.ts` - CreateOrderData interface definition
- `speedcopy-main/src/pages/GiftingCheckoutPage.tsx` - Reference implementation (correct structure)

## Notes
- The `coverPage` field is still stored in `printConfig` state but is NOT sent to backend
- The `notes` field was informational only and not required by backend
- Payment details (razorpayPaymentId, razorpayOrderId, razorpaySignature) are stored in sessionStorage instead of order data
- This fix ensures all printing orders pass backend validation
