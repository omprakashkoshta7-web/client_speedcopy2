# Backend Admin Action Checklist

## 🚨 Critical Issue: CORS Error Blocking All API Calls

**Frontend:** ✅ Ready and deployed at `https://vendor4-n8ah.vercel.app`  
**Backend:** ❌ Not configured for CORS - blocking all requests  
**Status:** 🔴 Application is completely non-functional

---

## ✅ Required Actions (In Order)

### **1. Fix CORS Configuration** 🔴 **CRITICAL - DO THIS FIRST**

Add CORS middleware to your Express.js backend:

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'https://vendor4-n8ah.vercel.app',  // Production
    'http://localhost:5173',             // Local dev
    'http://localhost:3000'              // Local dev
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200
}));
```

**Test after deployment:**
```bash
curl -X OPTIONS \
  -H "Origin: https://vendor4-n8ah.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  -v \
  https://gateway-202671058278.asia-south1.run.app/api/vendor/orders/assigned
```

Expected: Response headers should include `Access-Control-Allow-Origin: https://vendor4-n8ah.vercel.app`

---

### **2. Create Database Tables**

```sql
-- Wallet table
CREATE TABLE vendor_wallets (
  _id VARCHAR(255) PRIMARY KEY,
  userId VARCHAR(255) NOT NULL,
  userType VARCHAR(50),
  balance DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'INR',
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_userId (userId)
);

-- Earnings table
CREATE TABLE vendor_earnings (
  _id VARCHAR(255) PRIMARY KEY,
  vendorId VARCHAR(255) NOT NULL,
  storeId VARCHAR(255) NOT NULL,
  orderId VARCHAR(255),
  amount DECIMAL(10,2),
  status VARCHAR(50),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vendorId (vendorId),
  INDEX idx_storeId (storeId)
);

-- Deductions table
CREATE TABLE vendor_deductions (
  _id VARCHAR(255) PRIMARY KEY,
  walletId VARCHAR(255),
  userId VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  category VARCHAR(100),
  amount DECIMAL(10,2),
  balanceBefore DECIMAL(10,2),
  balanceAfter DECIMAL(10,2),
  referenceId VARCHAR(255),
  referenceType VARCHAR(50),
  description TEXT,
  metadata JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_userId (userId)
);

-- Closures table
CREATE TABLE vendor_closures (
  _id VARCHAR(255) PRIMARY KEY,
  vendorId VARCHAR(255) NOT NULL,
  period VARCHAR(50),
  date DATE,
  earnings DECIMAL(10,2),
  orderCount INT,
  breakdown JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vendorId_date (vendorId, date)
);

-- Payouts table
CREATE TABLE vendor_payouts (
  _id VARCHAR(255) PRIMARY KEY,
  vendorId VARCHAR(255) NOT NULL,
  payoutDate TIMESTAMP,
  amount DECIMAL(10,2),
  status VARCHAR(50),
  transactionId VARCHAR(255),
  bankAccount VARCHAR(255),
  ordersIncluded INT,
  periodStart TIMESTAMP,
  periodEnd TIMESTAMP,
  breakdown JSON,
  paidAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vendorId (vendorId),
  INDEX idx_status (status)
);
```

---

### **3. Implement API Endpoints**

All endpoints must:
- ✅ Validate JWT token from `Authorization: Bearer <token>` header
- ✅ Extract `vendorId` from token
- ✅ Query database for that vendor's data only
- ✅ Return data in exact format specified below

#### **Earnings Endpoints:**

```javascript
// GET /api/vendor/finance/wallet/summary
app.get('/api/vendor/finance/wallet/summary', authenticateToken, async (req, res) => {
  const vendorId = req.user.id;
  const wallet = await db.query(
    'SELECT * FROM vendor_wallets WHERE userId = ?',
    [vendorId]
  );
  res.json({
    success: true,
    data: wallet[0] || { balance: 0, currency: 'INR', isActive: false }
  });
});

// GET /api/vendor/finance/wallet/store-wise
app.get('/api/vendor/finance/wallet/store-wise', authenticateToken, async (req, res) => {
  const vendorId = req.user.id;
  const storeWise = await db.query(
    'SELECT storeId as _id, SUM(amount) as earnings, COUNT(*) as orderCount FROM vendor_earnings WHERE vendorId = ? GROUP BY storeId',
    [vendorId]
  );
  res.json({
    success: true,
    data: storeWise
  });
});

// GET /api/vendor/finance/wallet/deductions
app.get('/api/vendor/finance/wallet/deductions', authenticateToken, async (req, res) => {
  const vendorId = req.user.id;
  const deductions = await db.query(
    'SELECT * FROM vendor_deductions WHERE userId = ? ORDER BY createdAt DESC LIMIT 20',
    [vendorId]
  );
  res.json({
    success: true,
    data: { deductions }
  });
});
```

#### **Closure Endpoints:**

```javascript
// GET /api/vendor/finance/closure/daily
app.get('/api/vendor/finance/closure/daily', authenticateToken, async (req, res) => {
  const vendorId = req.user.id;
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  
  const closure = await db.query(
    'SELECT * FROM vendor_closures WHERE vendorId = ? AND date = ? AND period = "daily"',
    [vendorId, date]
  );
  
  res.json({
    success: true,
    data: closure[0] || { period: 'daily', date, earnings: 0, count: 0 }
  });
});

// GET /api/vendor/finance/closure/weekly
app.get('/api/vendor/finance/closure/weekly', authenticateToken, async (req, res) => {
  const vendorId = req.user.id;
  // Calculate week start/end from date parameter
  // Query weekly closure data
  // Return with totalEarnings, totalOrders, dailyBreakdown, stats
});

// GET /api/vendor/finance/closure/monthly
app.get('/api/vendor/finance/closure/monthly', authenticateToken, async (req, res) => {
  const vendorId = req.user.id;
  // Calculate month from date parameter
  // Query monthly closure data
  // Return with totalEarnings, totalOrders, weeklyBreakdown, categoryWise, stats
});
```

#### **Payout Endpoints:**

```javascript
// GET /api/vendor/finance/payouts/schedule
app.get('/api/vendor/finance/payouts/schedule', authenticateToken, async (req, res) => {
  const vendorId = req.user.id;
  // Calculate next payout date based on your payout schedule
  // Get last payout info
  // Calculate estimated amount
  
  res.json({
    success: true,
    data: {
      nextPayoutDate: '2026-05-01T00:00:00.000Z',
      estimatedAmount: 12000.00,
      lastPayoutDate: '2026-04-15T00:00:00.000Z',
      lastPayoutAmount: 8500.00,
      payoutFrequency: 'bi-weekly',
      payoutMethod: 'bank_transfer',
      // ... other fields
    }
  });
});

// GET /api/vendor/finance/payouts/history
app.get('/api/vendor/finance/payouts/history', authenticateToken, async (req, res) => {
  const vendorId = req.user.id;
  const payouts = await db.query(
    'SELECT * FROM vendor_payouts WHERE vendorId = ? ORDER BY payoutDate DESC',
    [vendorId]
  );
  
  res.json({
    success: true,
    data: {
      payouts,
      summary: {
        totalPayouts: payouts.length,
        totalAmount: payouts.reduce((sum, p) => sum + p.amount, 0),
        avgPayoutAmount: payouts.length ? payouts.reduce((sum, p) => sum + p.amount, 0) / payouts.length : 0,
        lastPayoutDate: payouts[0]?.payoutDate
      }
    }
  });
});
```

---

### **4. Insert Sample Data for Testing**

```sql
-- Sample wallet for vendor_123
INSERT INTO vendor_wallets VALUES (
  '507f1f77bcf86cd799439011',
  'vendor_123',
  'vendor',
  15000.00,
  'INR',
  true,
  NOW(),
  NOW()
);

-- Sample store-wise earnings
INSERT INTO vendor_earnings VALUES
  ('earn_001', 'vendor_123', 'store_cp_001', 'order_001', 8000.00, 'completed', NOW()),
  ('earn_002', 'vendor_123', 'store_kb_002', 'order_002', 7000.00, 'completed', NOW()),
  ('earn_003', 'vendor_123', 'store_mg_003', 'order_003', 2500.00, 'completed', NOW());

-- Sample deductions
INSERT INTO vendor_deductions VALUES (
  'ded_001',
  '507f1f77bcf86cd799439011',
  'vendor_123',
  'debit',
  'payout_deduction',
  425.00,
  15425.00,
  15000.00,
  'payout_456',
  'payout',
  'Platform fee (5%) deducted from payout',
  '{"feePercentage": 5, "grossAmount": 8500.00}',
  NOW()
);

-- Sample daily closure
INSERT INTO vendor_closures VALUES (
  'closure_001',
  'vendor_123',
  'daily',
  CURDATE(),
  1200.00,
  8,
  '{"orders": []}',
  NOW()
);

-- Sample payout
INSERT INTO vendor_payouts VALUES (
  'payout_001',
  'vendor_123',
  '2026-04-15 00:00:00',
  8500.00,
  'paid',
  'TXN20260415001',
  '****7890',
  42,
  '2026-04-01 00:00:00',
  '2026-04-14 23:59:59',
  '{"grossAmount": 9078.00, "platformFee": 453.90, "gst": 124.10, "netAmount": 8500.00}',
  '2026-04-15 10:30:00',
  NOW()
);
```

---

### **5. Deploy and Test**

#### **Deploy to Google Cloud Run:**
```bash
gcloud run deploy gateway \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

#### **Test CORS:**
```bash
curl -X OPTIONS \
  -H "Origin: https://vendor4-n8ah.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -v \
  https://gateway-202671058278.asia-south1.run.app/api/vendor/finance/wallet/summary
```

Should return headers:
```
Access-Control-Allow-Origin: https://vendor4-n8ah.vercel.app
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Credentials: true
```

#### **Test API with Token:**
```bash
# First login to get token
TOKEN=$(curl -X POST \
  https://gateway-202671058278.asia-south1.run.app/api/vendor/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"vendor@example.com","password":"password","role":"vendor"}' \
  | jq -r '.data.token')

# Test wallet summary
curl -X GET \
  -H "Authorization: Bearer $TOKEN" \
  https://gateway-202671058278.asia-south1.run.app/api/vendor/finance/wallet/summary
```

Expected response:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "vendor_123",
    "balance": 15000.00,
    "currency": "INR",
    "isActive": true
  }
}
```

#### **Test in Browser:**
1. Open https://vendor4-n8ah.vercel.app
2. Login with vendor credentials
3. Navigate to Earnings page
4. Open DevTools → Network tab
5. Verify API calls return 200 OK
6. Verify data displays in cards and charts

---

## 📋 Completion Checklist

- [ ] **CORS configured** with `https://vendor4-n8ah.vercel.app` in allowed origins
- [ ] **Database tables created** (vendor_wallets, vendor_earnings, vendor_deductions, vendor_closures, vendor_payouts)
- [ ] **API endpoints implemented** (8 finance endpoints)
- [ ] **Sample data inserted** for testing
- [ ] **Backend deployed** to Google Cloud Run
- [ ] **CORS tested** with curl command
- [ ] **API endpoints tested** with curl + JWT token
- [ ] **Frontend tested** in browser at https://vendor4-n8ah.vercel.app
- [ ] **Login works** without CORS errors
- [ ] **Earnings page loads** and displays data
- [ ] **Closure page loads** and displays data
- [ ] **Payouts page loads** and displays data

---

## 🎯 Expected Result After Completion

### **Earnings Page:**
- ✅ Total Balance card shows: ₹15,000
- ✅ Pending Settlement card shows: ₹0
- ✅ Available card shows: ₹0
- ✅ Total Orders card shows: 83 (sum of all store orders)
- ✅ Store-wise chart displays area chart with earnings
- ✅ Store breakdown table shows each store with earnings and percentage
- ✅ Deductions list shows platform fees and refunds

### **Closure Page:**
- ✅ Period selector works (daily/weekly/monthly)
- ✅ Date picker works
- ✅ Stats cards show: Total Orders, Total Earnings, Avg Order Value, Period
- ✅ Summary card shows closure data for selected period

### **Payouts Page:**
- ✅ Stats cards show: Total Paid Out, Pending Amount, Avg Payout, Next Payout
- ✅ Next payout schedule card shows upcoming payout info
- ✅ Payout history list shows all past payouts with breakdown
- ✅ Filter buttons work (all/paid/pending/processing/failed)
- ✅ Export button downloads CSV

---

## 📞 Support

**Frontend Status:** ✅ Complete and deployed  
**Backend Status:** ❌ Waiting for CORS fix + API implementation  
**Priority:** 🔴 **CRITICAL** - Application is non-functional without backend changes

**Questions?** Refer to:
- `CORS_FIX_REQUIRED.md` - Detailed CORS configuration guide
- `DATA_FLOW_EXPLANATION.md` - Complete data flow from login to display
- `VENDOR_FINANCE_BACKEND_RESPONSES.md` - Exact API response formats required

---

## ⏱️ Estimated Time

- CORS configuration: **10 minutes**
- Database table creation: **15 minutes**
- API endpoint implementation: **2-3 hours**
- Sample data insertion: **10 minutes**
- Testing and deployment: **30 minutes**

**Total:** ~3-4 hours to complete all tasks
