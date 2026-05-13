# 🚀 Finance APIs - Quick Reference

## 📋 Complete API List

### Base URL
```
https://gateway-202671058278.asia-south1.run.app/api
```

---

## 1️⃣ Wallet APIs (3 APIs)

| # | API Name | Method | Endpoint | Used In |
|---|----------|--------|----------|---------|
| 1 | Wallet Summary | `GET` | `/vendor/finance/wallet/summary` | EarningsPage |
| 2 | Store-wise Earnings | `GET` | `/vendor/finance/wallet/store-wise` | EarningsPage |
| 3 | Wallet Deductions | `GET` | `/vendor/finance/wallet/deductions` | EarningsPage |

---

## 2️⃣ Closure APIs (3 APIs)

| # | API Name | Method | Endpoint | Query Params | Used In |
|---|----------|--------|----------|--------------|---------|
| 4 | Daily Closure | `GET` | `/vendor/finance/closure/daily` | `?date=YYYY-MM-DD` | ClosurePage |
| 5 | Weekly Closure | `GET` | `/vendor/finance/closure/weekly` | `?date=YYYY-MM-DD` | ClosurePage |
| 6 | Monthly Closure | `GET` | `/vendor/finance/closure/monthly` | `?date=YYYY-MM-DD` | ClosurePage |

---

## 3️⃣ Payout APIs (2 APIs)

| # | API Name | Method | Endpoint | Used In |
|---|----------|--------|----------|---------|
| 7 | Payout Schedule | `GET` | `/vendor/finance/payouts/schedule` | PayoutsPage |
| 8 | Payout History | `GET` | `/vendor/finance/payouts/history` | PayoutsPage |

---

## 🔑 Authentication Header

```http
Authorization: Bearer {your_auth_token}
```

Token is stored in `localStorage` as `auth_token`.

---

## 📊 Response Format

All APIs follow this structure:

```json
{
  "success": true,
  "message": "Success message",
  "data": { /* actual data */ }
}
```

---

## 🧪 Quick Test Commands

### Test All Wallet APIs
```bash
# 1. Wallet Summary
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://gateway-202671058278.asia-south1.run.app/api/vendor/finance/wallet/summary

# 2. Store-wise Earnings
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://gateway-202671058278.asia-south1.run.app/api/vendor/finance/wallet/store-wise

# 3. Deductions
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://gateway-202671058278.asia-south1.run.app/api/vendor/finance/wallet/deductions
```

### Test All Closure APIs
```bash
# 4. Daily Closure
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://gateway-202671058278.asia-south1.run.app/api/vendor/finance/closure/daily?date=2024-01-15"

# 5. Weekly Closure
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://gateway-202671058278.asia-south1.run.app/api/vendor/finance/closure/weekly?date=2024-01-15"

# 6. Monthly Closure
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://gateway-202671058278.asia-south1.run.app/api/vendor/finance/closure/monthly?date=2024-01-15"
```

### Test All Payout APIs
```bash
# 7. Payout Schedule
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://gateway-202671058278.asia-south1.run.app/api/vendor/finance/payouts/schedule

# 8. Payout History
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://gateway-202671058278.asia-south1.run.app/api/vendor/finance/payouts/history
```

---

## 📱 Frontend Integration

### Service Functions (Already Implemented ✅)

```typescript
// Wallet APIs
getVendorWalletSummary()      // API 1
getVendorWalletStoreWise()    // API 2
getVendorWalletDeductions()   // API 3

// Closure APIs
getVendorClosureDaily(date)   // API 4
getVendorClosureWeekly(date)  // API 5
getVendorClosureMonthly(date) // API 6

// Payout APIs
getVendorPayoutsSchedule()    // API 7
getVendorPayoutHistory()      // API 8
```

### Pages Using These APIs

```typescript
// EarningsPage.tsx
- getVendorWalletSummary()
- getVendorWalletStoreWise()
- getVendorWalletDeductions()

// ClosurePage.tsx
- getVendorClosureDaily()
- getVendorClosureWeekly()
- getVendorClosureMonthly()

// PayoutsPage.tsx
- getVendorPayoutsSchedule()
- getVendorPayoutHistory()
```

---

## ⚠️ Common Issues

### Issue 1: 404 Not Found
```
❌ API Error [404]: /vendor/finance/wallet/summary
```
**Solution**: Backend pe route implement karo

### Issue 2: 401 Unauthorized
```
❌ API Error [401]: Unauthorized
```
**Solution**: Login karke fresh token lo

### Issue 3: 200 OK but data: 0
```
✅ Response: { success: true, data: { balance: 0 } }
```
**Solution**: Database mein wallet/transactions create karo

---

## 🎯 Backend Implementation Priority

### High Priority (Core Features)
1. ✅ Wallet Summary - Shows balance
2. ✅ Store-wise Earnings - Revenue breakdown
3. ✅ Daily Closure - Daily reports

### Medium Priority (Analytics)
4. ✅ Weekly Closure - Week reports
5. ✅ Monthly Closure - Month reports
6. ✅ Deductions - Fee tracking

### Low Priority (Advanced)
7. ✅ Payout Schedule - Next payout info
8. ✅ Payout History - Past payouts

---

## 📦 Files Created

1. ✅ `VENDOR_FINANCE_API_ROUTES.md` - Detailed API documentation
2. ✅ `Vendor_Finance_APIs.postman_collection.json` - Postman collection
3. ✅ `FINANCE_APIS_QUICK_REFERENCE.md` - This file
4. ✅ `FINANCE_DATA_ZERO_DEBUG.md` - Debug guide

---

## 🚀 Next Steps

1. **Import Postman Collection**
   - Open Postman
   - Import `Vendor_Finance_APIs.postman_collection.json`
   - Update `token` variable with your auth token

2. **Test Each API**
   - Run all 8 APIs in Postman
   - Check which ones return 404
   - Note down missing APIs

3. **Share Results**
   - Tell me which APIs are working
   - Tell me which APIs return 404
   - I'll provide backend implementation

---

## 💡 Pro Tips

- Use browser DevTools Network tab to see actual API calls
- Check console logs for detailed error messages
- Test APIs in Postman before debugging frontend
- Verify auth token is valid (not expired)
