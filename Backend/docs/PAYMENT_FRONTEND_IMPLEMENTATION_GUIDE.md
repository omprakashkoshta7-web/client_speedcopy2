# SpeedCopy Payment Frontend Implementation Guide

This guide is for frontend integration of the SpeedCopy payment flow.

The frontend should never hardcode Razorpay keys. Always request a payment order from backend first and use the `keyId` returned by the API response.

## Supported API Endpoints

The backend now supports both singular and plural base paths.

Create payment order:

```txt
POST /api/payments/create
POST /api/payment/create
POST /api/payments/initiate
POST /api/payment/initiate
```

Verify Razorpay payment:

```txt
POST /api/payments/verify
POST /api/payment/verify
POST /api/payments/razorpay/verify
POST /api/payment/razorpay/verify
```

UPI-style verification aliases in API layer:

```txt
POST /api/payments/upi/verify
POST /api/payment/upi/verify
POST /api/payments/verify-upi
POST /api/payment/verify-upi
```

All verify endpoints currently use the same backend verification logic and the same request payload.

## Razorpay Key Handling

Frontend key rule:

```txt
Use the `keyId` returned by backend create/initiate response.
Do not store live/test Razorpay keys in frontend source.
Do not switch keys in frontend manually based on environment.
```

Backend key resolution:

```txt
Development:
  RAZORPAY_KEY_ID_TEST
  RAZORPAY_KEY_SECRET_TEST

Production:
  RAZORPAY_KEY_ID
  RAZORPAY_KEY_SECRET
```

## Payment Flow

### 1. Create Payment Order

Request:

```http
POST /api/payments/create
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "orderId": "speedcopy_order_id",
  "amount": 1198,
  "currency": "INR"
}
```

Response shape:

```json
{
  "success": true,
  "message": "Payment initiated",
  "data": {
    "payment": {
      "_id": "payment_record_id",
      "orderId": "speedcopy_order_id",
      "status": "created"
    },
    "razorpayOrderId": "order_xxx",
    "amount": 119800,
    "currency": "INR",
    "keyId": "rzp_test_xxx"
  }
}
```

Important:

```txt
Request amount is in rupees.
Response amount is in paise.
Use response.amount in Razorpay checkout options.
```

### 2. Open Razorpay Checkout

Use:

```txt
key = response.data.keyId
amount = response.data.amount
currency = response.data.currency
order_id = response.data.razorpayOrderId
```

Example frontend shape:

```js
const payment = createResponse.data;

const options = {
  key: payment.keyId,
  amount: payment.amount,
  currency: payment.currency,
  order_id: payment.razorpayOrderId,
  name: 'SpeedCopy',
  handler: async function (rzpResponse) {
    await verifyPayment({
      razorpayOrderId: rzpResponse.razorpay_order_id,
      razorpayPaymentId: rzpResponse.razorpay_payment_id,
      razorpaySignature: rzpResponse.razorpay_signature,
    });
  },
};
```

### 3. Verify Payment

Request:

```http
POST /api/payments/verify
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "razorpayOrderId": "order_xxx",
  "razorpayPaymentId": "pay_xxx",
  "razorpaySignature": "signature_xxx"
}
```

You may also call any of the alias endpoints:

```txt
/api/payment/verify
/api/payments/razorpay/verify
/api/payment/razorpay/verify
/api/payments/upi/verify
/api/payment/upi/verify
/api/payments/verify-upi
/api/payment/verify-upi
```

Use the same payload for all of them.

## Recommended Frontend Integration

### Checkout Button Flow

```txt
1. Create SpeedCopy order first
2. Call payment create/initiate endpoint
3. Launch Razorpay modal with backend-returned keyId
4. On Razorpay success callback, call verify endpoint
5. On verify success, mark checkout complete in UI
6. Redirect to order success / order detail page
```

### Failure Handling

Frontend should handle:

```txt
User closes Razorpay modal
Payment verification fails
Network error during verify call
Order exists but payment stays in created state
```

Recommended UI behavior:

```txt
Keep order as pending
Allow retry payment
Do not mark payment success from client alone
Only trust backend verify success response
```

## Mock Mode

If backend has no Razorpay keys configured, payment service can run in mock mode.

Frontend behavior:

```txt
Still call create/initiate endpoint normally
Still use verify endpoint normally
Do not special-case frontend for mock mode unless your team explicitly wants a visible sandbox label
```

## Auth Requirement

Gateway payment routes are authenticated.

Use bearer token for:

```txt
POST /api/payments/create
POST /api/payment/create
POST /api/payments/initiate
POST /api/payment/initiate
POST /api/payments/verify
POST /api/payment/verify
POST /api/payments/razorpay/verify
POST /api/payment/razorpay/verify
POST /api/payments/upi/verify
POST /api/payment/upi/verify
POST /api/payments/verify-upi
POST /api/payment/verify-upi
```

## Frontend Checklist

```txt
Load Razorpay checkout script
Create payment from backend before opening modal
Use backend-returned keyId
Use backend-returned razorpayOrderId
Use paise amount from backend response
Verify payment through backend after checkout success
Show success only after backend verify succeeds
Allow retry if verify fails
```

## Current Backend Notes

Implemented:

```txt
Plural and singular payment base paths
Create and initiate aliases
Razorpay verify aliases
UPI verify aliases at API layer
Safe placeholder values in payment-service .env.example
```

Not changed:

```txt
UPI verification aliases currently map to the same Razorpay signature verification flow
If your product later needs a distinct UPI verification payload, backend will need a separate validator/controller path
```
