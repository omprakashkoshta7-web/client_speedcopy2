# 🔍 Finance Data Zero - Backend Debug Guide

## Problem
Finance pages mein data 0 aa raha hai (wallet balance, earnings, payouts sab 0).

## Frontend Changes (Already Done ✅)
- Added detailed console logging in `EarningsPage.tsx`
- Added API request/response logging in `api.ts`

## How to Debug

### Step 1: Open Browser Console
1. Finance page kholo (Earnings/Payouts/Closure)
2. Browser DevTools kholo (F12)
3. Console tab mein dekho

### Step 2: Check Console Logs
Aapko ye logs dikhenge:

```
🔍 [Finance Debug] Starting API calls...
🌐 API Request: GET https://gateway-202671058278.asia-south1.run.app/api/vendor/finance/wallet/summary
📡 API Response [200]: /vendor/finance/wallet/summary { success: true, data: {...} }
✅ Wallet Summary Response: { success: true, data: {...} }
```

### Step 3: Identify Backend Issue

#### ❌ Case 1: 404 Not Found
```
❌ API Error [404]: /vendor/finance/wallet/summary HTTP 404: Not Found
```
**Problem**: Backend pe ye route implement hi nahi hai
**Solution**: Backend mein finance routes banana padega

---

#### ❌ Case 2: 500 Internal Server Error
```
❌ API Error [500]: /vendor/finance/wallet/summary Internal Server Error
```
**Problem**: Backend code mein error hai
**Solution**: Backend logs check karo, database connection check karo

---

#### ❌ Case 3: 200 OK But Empty Data
```
✅ Wallet Summary Response: { success: true, data: { balance: 0, pendingSettlement: 0 } }
📊 [Finance Debug] Wallet Data: { balance: 0, pendingSettlement: 0 }
```
**Problem**: API work kar rahi hai but database mein data nahi hai
**Solution**: 
- Check if wallet document exists in database
- Check if orders are creating transactions
- Check if earnings calculation logic is working

---

#### ❌ Case 4: 401 Unauthorized
```
❌ API Error [401]: /vendor/finance/wallet/summary Unauthorized
```
**Problem**: Auth token invalid hai ya vendor access nahi hai
**Solution**: Login again, check backend auth middleware

---

## Backend Implementation Checklist

### Required Backend Routes

```javascript
// ✅ Check if these routes exist in backend

// Wallet APIs
GET  /api/vendor/finance/wallet/summary
GET  /api/vendor/finance/wallet/store-wise
GET  /api/vendor/finance/wallet/deductions

// Closure APIs
GET  /api/vendor/finance/closure/daily?date=YYYY-MM-DD
GET  /api/vendor/finance/closure/weekly?date=YYYY-MM-DD
GET  /api/vendor/finance/closure/monthly?date=YYYY-MM-DD

// Payout APIs
GET  /api/vendor/finance/payouts/schedule
GET  /api/vendor/finance/payouts/history
```

### Required Database Collections

```javascript
// ✅ Check if these collections exist and have data

// 1. Wallets Collection
{
  _id: ObjectId,
  userId: vendorId,
  userType: "vendor",
  balance: 5000,
  pendingSettlement: 2000,
  availableForWithdrawal: 3000,
  currency: "INR",
  isActive: true
}

// 2. Transactions Collection
{
  _id: ObjectId,
  walletId: walletId,
  vendorId: vendorId,
  orderId: orderId,
  type: "credit" | "debit",
  amount: 500,
  category: "order_earning",
  status: "completed"
}

// 3. Payouts Collection
{
  _id: ObjectId,
  vendorId: vendorId,
  amount: 10000,
  status: "paid" | "pending",
  payoutDate: Date,
  breakdown: {
    grossAmount: 12000,
    platformFee: 1500,
    gst: 500,
    netAmount: 10000
  }
}
```

### Backend Controller Example

```javascript
// Example: Wallet Summary Controller
export async function getWalletSummary(req, res) {
  try {
    const vendorId = req.user.vendorId || req.user.organizationId;
    
    // Find wallet
    const wallet = await Wallet.findOne({ 
      userId: vendorId, 
      userType: 'vendor' 
    });
    
    if (!wallet) {
      // Create wallet if doesn't exist
      const newWallet = await Wallet.create({
        userId: vendorId,
        userType: 'vendor',
        balance: 0,
        currency: 'INR',
        isActive: true
      });
      
      return res.json({
        success: true,
        data: newWallet
      });
    }
    
    return res.json({
      success: true,
      data: wallet
    });
    
  } catch (error) {
    console.error('Wallet Summary Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}
```

## Common Backend Issues

### Issue 1: Wallet Not Created on Vendor Registration
**Problem**: Jab vendor register hota hai, wallet automatically create nahi hota
**Solution**: 
```javascript
// In vendor registration/onboarding
await Wallet.create({
  userId: vendor._id,
  userType: 'vendor',
  balance: 0,
  currency: 'INR',
  isActive: true
});
```

### Issue 2: Earnings Not Calculated on Order Completion
**Problem**: Order complete hone pe wallet update nahi hota
**Solution**:
```javascript
// In order completion handler
const order = await Order.findById(orderId);
const vendorEarning = order.vendorAmount || order.totalAmount * 0.7;

// Create transaction
await Transaction.create({
  walletId: vendor.walletId,
  vendorId: vendor._id,
  orderId: order._id,
  type: 'credit',
  amount: vendorEarning,
  category: 'order_earning',
  status: 'completed'
});

// Update wallet balance
await Wallet.findByIdAndUpdate(vendor.walletId, {
  $inc: { balance: vendorEarning }
});
```

### Issue 3: Store-wise Earnings Not Aggregated
**Problem**: Store-wise breakdown nahi mil raha
**Solution**:
```javascript
// Aggregate transactions by store
const storeWise = await Transaction.aggregate([
  { $match: { vendorId: vendorId, type: 'credit' } },
  { 
    $lookup: {
      from: 'orders',
      localField: 'orderId',
      foreignField: '_id',
      as: 'order'
    }
  },
  { $unwind: '$order' },
  {
    $group: {
      _id: '$order.storeId',
      earnings: { $sum: '$amount' },
      orderCount: { $sum: 1 }
    }
  }
]);
```

## Next Steps

1. **Run the app** and open Finance page
2. **Check browser console** for detailed logs
3. **Identify the exact error** from logs above
4. **Fix backend** based on the error type
5. **Test again** after backend fix

## Need Backend Code?

Agar backend code banana hai toh batao, main complete backend implementation de dunga for:
- Finance routes
- Controllers
- Database models
- Wallet management
- Transaction handling
- Payout scheduling
