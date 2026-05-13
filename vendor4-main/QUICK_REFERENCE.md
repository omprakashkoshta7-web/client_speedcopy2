# Quick Reference Card - Finance APIs

## 🚨 Current Issue
**CORS Error** - Backend must allow `https://vendor4-n8ah.vercel.app`

---

## 📊 API Endpoints & Data Mapping

### **EARNINGS PAGE** (`/earnings`)

| API Endpoint | Response Field | Displays In | Example Value |
|--------------|----------------|-------------|---------------|
| `GET /api/vendor/finance/wallet/summary` | `balance` | Total Balance Card | ₹15,000 |
| `GET /api/vendor/finance/wallet/summary` | `pendingSettlement` | Pending Settlement Card | ₹0 |
| `GET /api/vendor/finance/wallet/summary` | `availableForWithdrawal` | Available Card | ₹0 |
| `GET /api/vendor/finance/wallet/store-wise` | Sum of `orderCount` | Total Orders Card | 83 |
| `GET /api/vendor/finance/wallet/store-wise` | Array of stores | Store-wise Chart | Area chart |
| `GET /api/vendor/finance/wallet/store-wise` | `_id`, `earnings`, `orderCount` | Store Breakdown Table | List with % |
| `GET /api/vendor/finance/wallet/deductions` | `deductions` array | Deductions List | Platform fees, refunds |

---

### **CLOSURE PAGE** (`/closure`)

| API Endpoint | Response Field | Displays In | Example Value |
|--------------|----------------|-------------|---------------|
| `GET /api/vendor/finance/closure/daily` | `earnings` or `totalEarnings` | Total Earnings Card | ₹1,200 |
| `GET /api/vendor/finance/closure/daily` | `count` or `totalOrders` | Total Orders Card | 8 |
| `GET /api/vendor/finance/closure/daily` | Calculated: earnings/count | Avg Order Value Card | ₹150 |
| `GET /api/vendor/finance/closure/weekly` | `totalEarnings`, `totalOrders` | Weekly Stats | ₹7,500, 42 orders |
| `GET /api/vendor/finance/closure/weekly` | `dailyBreakdown` array | Daily Breakdown Table | 7 days data |
| `GET /api/vendor/finance/closure/monthly` | `totalEarnings`, `totalOrders` | Monthly Stats | ₹32,000, 180 orders |
| `GET /api/vendor/finance/closure/monthly` | `weeklyBreakdown` array | Weekly Breakdown Table | 4 weeks data |
| `GET /api/vendor/finance/closure/monthly` | `categoryWise` object | Category Chart | Printing, Gifting, Shopping |

---

### **PAYOUTS PAGE** (`/payouts`)

| API Endpoint | Response Field | Displays In | Example Value |
|--------------|----------------|-------------|---------------|
| `GET /api/vendor/finance/payouts/schedule` | `nextPayoutDate` | Next Payout Card | 1 May 2026 |
| `GET /api/vendor/finance/payouts/schedule` | `estimatedAmount` | Next Payout Card | ₹12,000 est. |
| `GET /api/vendor/finance/payouts/schedule` | Full object | Next Payout Schedule Card | Bank details, frequency |
| `GET /api/vendor/finance/payouts/history` | `payouts` array | Payout History List | All past payouts |
| `GET /api/vendor/finance/payouts/history` | Filter by `status` | Filter Buttons | paid/pending/processing/failed |
| `GET /api/vendor/finance/payouts/history` | `breakdown.grossAmount` | Payout Card - Gross | ₹9,078 |
| `GET /api/vendor/finance/payouts/history` | `breakdown.platformFee` | Payout Card - Fee | ₹454 |
| `GET /api/vendor/finance/payouts/history` | `breakdown.gst` | Payout Card - GST | ₹124 |
| `GET /api/vendor/finance/payouts/history` | `breakdown.netAmount` | Payout Card - Net | ₹8,500 |
| `GET /api/vendor/finance/payouts/history` | `summary` object | Stats Cards | Total paid, pending, avg |

---

## 🔧 Backend Requirements

### **1. CORS Configuration**
```javascript
app.use(cors({
  origin: 'https://vendor4-n8ah.vercel.app',
  credentials: true
}));
```

### **2. Database Tables**
- `vendor_wallets` - Wallet balance and currency
- `vendor_earnings` - Store-wise earnings and order counts
- `vendor_deductions` - Platform fees, refunds, deductions
- `vendor_closures` - Daily/weekly/monthly closure reports
- `vendor_payouts` - Payout history and schedules

### **3. Authentication**
All endpoints require JWT token in header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **4. Response Format**
```json
{
  "success": true,
  "message": "Optional message",
  "data": { /* actual data */ }
}
```

---

## 🎯 Data Flow

```
User Login
    ↓
JWT Token Generated
    ↓
Token Stored in Frontend (localStorage)
    ↓
Frontend Makes API Call with Token
    ↓
Backend Validates Token → Extracts vendorId
    ↓
Backend Queries Database (WHERE vendorId = ?)
    ↓
Backend Returns JSON Response
    ↓
Frontend Displays Data in Cards/Charts/Tables
```

---

## ✅ Testing Checklist

### **After Backend Deployment:**

1. **Test CORS:**
   ```bash
   curl -X OPTIONS -H "Origin: https://vendor4-n8ah.vercel.app" \
     https://gateway-202671058278.asia-south1.run.app/api/vendor/finance/wallet/summary
   ```
   Expected: `Access-Control-Allow-Origin: https://vendor4-n8ah.vercel.app`

2. **Test API with Token:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://gateway-202671058278.asia-south1.run.app/api/vendor/finance/wallet/summary
   ```
   Expected: `{"success": true, "data": {...}}`

3. **Test in Browser:**
   - Open https://vendor4-n8ah.vercel.app
   - Login with vendor credentials
   - Navigate to Earnings page
   - Check DevTools → Network tab
   - Verify API calls return 200 OK
   - Verify data displays correctly

---

## 📋 Sample Data for Testing

```sql
-- Wallet
INSERT INTO vendor_wallets VALUES ('w1', 'vendor_123', 15000.00, 'INR', true, NOW(), NOW());

-- Earnings
INSERT INTO vendor_earnings VALUES 
  ('e1', 'vendor_123', 'store_cp_001', 8000.00, 45, NOW()),
  ('e2', 'vendor_123', 'store_kb_002', 7000.00, 38, NOW());

-- Deductions
INSERT INTO vendor_deductions VALUES 
  ('d1', 'w1', 'vendor_123', 'debit', 'payout_deduction', 425.00, 15425.00, 15000.00, 
   'payout_456', 'payout', 'Platform fee (5%)', '{"feePercentage": 5}', NOW());

-- Closure
INSERT INTO vendor_closures VALUES 
  ('c1', 'vendor_123', 'daily', CURDATE(), 1200.00, 8, '{}', NOW());

-- Payout
INSERT INTO vendor_payouts VALUES 
  ('p1', 'vendor_123', '2026-04-15', 8500.00, 'paid', 'TXN001', '****7890', 42,
   '2026-04-01', '2026-04-14', '{"grossAmount": 9078, "platformFee": 454, "gst": 124, "netAmount": 8500}',
   '2026-04-15 10:30:00', NOW());
```

---

## 🔍 Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| CORS error in browser | Backend not allowing Vercel domain | Add CORS middleware with correct origin |
| 401 Unauthorized | Token missing or invalid | Check Authorization header format |
| Empty data in cards | No data in database | Insert sample data for testing |
| API returns 404 | Endpoint not implemented | Implement the API endpoint |
| Wrong data displayed | Response format mismatch | Check response matches expected format |

---

## 📞 Support Documents

- **CORS_FIX_REQUIRED.md** - Detailed CORS configuration
- **DATA_FLOW_EXPLANATION.md** - Complete data flow diagram
- **BACKEND_ADMIN_CHECKLIST.md** - Step-by-step implementation guide
- **HINDI_SUMMARY.md** - Hindi explanation of data flow
- **VENDOR_FINANCE_BACKEND_RESPONSES.md** - Exact API response formats

---

## ⏱️ Implementation Time

| Task | Time |
|------|------|
| CORS configuration | 10 min |
| Database tables | 15 min |
| API endpoints | 2-3 hours |
| Sample data | 10 min |
| Testing | 30 min |
| **Total** | **~3-4 hours** |

---

## 🎯 Success Criteria

✅ No CORS errors in browser console  
✅ API calls return 200 OK status  
✅ Total Balance card shows ₹15,000  
✅ Store-wise chart displays correctly  
✅ Deductions list shows platform fees  
✅ Closure page shows daily/weekly/monthly data  
✅ Payouts page shows history with breakdown  
✅ All filters and export buttons work  

---

**Priority:** 🔴 **CRITICAL** - Application is non-functional until backend is configured
