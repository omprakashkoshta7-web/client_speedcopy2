# Complete Data Flow - Login to Finance Display

## 🔄 Overview

This document explains **exactly how data flows** from user login through backend APIs to frontend display in the finance pages (Earnings, Closure, Payouts).

---

## 📊 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         1. USER LOGIN                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  User enters email/password at:                                          │
│  https://vendor4-n8ah.vercel.app/login                                  │
│                                                                          │
│  Frontend calls:                                                         │
│  POST /api/vendor/auth/login                                            │
│  Body: { email, password, role: "vendor" }                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    2. BACKEND AUTHENTICATION                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Backend validates credentials:                                          │
│  1. Checks email/password in database                                   │
│  2. Verifies user role is "vendor"                                      │
│  3. Generates JWT token with user info                                  │
│                                                                          │
│  Response:                                                               │
│  {                                                                       │
│    "success": true,                                                     │
│    "data": {                                                            │
│      "user": {                                                          │
│        "_id": "vendor_123",                                             │
│        "email": "vendor@example.com",                                   │
│        "role": "vendor",                                                │
│        "vendorOrgId": "org_456"                                         │
│      },                                                                 │
│      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."                │
│    }                                                                    │
│  }                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    3. FRONTEND STORES TOKEN                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Frontend saves token in:                                                │
│  - localStorage.setItem('auth_token', token)                            │
│  - sessionStorage (for session management)                              │
│                                                                          │
│  User is redirected to dashboard                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    4. USER NAVIGATES TO EARNINGS PAGE                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Frontend makes 3 parallel API calls with Authorization header:         │
│                                                                          │
│  API 1: GET /api/vendor/finance/wallet/summary                         │
│  Headers: { Authorization: "Bearer eyJhbGci..." }                       │
│                                                                          │
│  API 2: GET /api/vendor/finance/wallet/store-wise                      │
│  Headers: { Authorization: "Bearer eyJhbGci..." }                       │
│                                                                          │
│  API 3: GET /api/vendor/finance/wallet/deductions                      │
│  Headers: { Authorization: "Bearer eyJhbGci..." }                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    5. BACKEND PROCESSES REQUESTS                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  For each API call, backend:                                            │
│  1. Validates JWT token from Authorization header                       │
│  2. Extracts vendorId from token (e.g., "vendor_123")                  │
│  3. Queries database for vendor's data                                  │
│  4. Returns JSON response                                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    6. DATABASE QUERIES                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  API 1 - Wallet Summary:                                                │
│  SELECT * FROM vendor_wallets WHERE userId = 'vendor_123'              │
│                                                                          │
│  Returns:                                                                │
│  {                                                                       │
│    "_id": "507f1f77bcf86cd799439011",                                  │
│    "userId": "vendor_123",                                              │
│    "balance": 15000.00,                                                 │
│    "currency": "INR",                                                   │
│    "isActive": true                                                     │
│  }                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  API 2 - Store-wise Earnings:                                           │
│  SELECT storeId, SUM(amount) as earnings, COUNT(*) as orderCount        │
│  FROM vendor_earnings                                                    │
│  WHERE vendorId = 'vendor_123'                                          │
│  GROUP BY storeId                                                        │
│                                                                          │
│  Returns:                                                                │
│  [                                                                       │
│    { "_id": "store_cp_001", "earnings": 8000, "orderCount": 45 },     │
│    { "_id": "store_kb_002", "earnings": 7000, "orderCount": 38 }      │
│  ]                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  API 3 - Deductions:                                                    │
│  SELECT * FROM vendor_deductions                                         │
│  WHERE userId = 'vendor_123'                                            │
│  ORDER BY createdAt DESC                                                 │
│  LIMIT 20                                                                │
│                                                                          │
│  Returns:                                                                │
│  {                                                                       │
│    "deductions": [                                                      │
│      {                                                                  │
│        "_id": "507f1f77bcf86cd799439012",                              │
│        "amount": 425.00,                                                │
│        "category": "payout_deduction",                                  │
│        "description": "Platform fee (5%)"                               │
│      }                                                                  │
│    ]                                                                    │
│  }                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    7. FRONTEND RECEIVES DATA                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Frontend processes responses:                                           │
│  - setWallet(walletRes.data)                                            │
│  - setStoreWise(storeWiseRes.data)                                      │
│  - setDeductions(deductionsRes.data.deductions)                         │
│                                                                          │
│  React state updates trigger re-render                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    8. DATA DISPLAYED TO USER                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Earnings Page shows:                                                    │
│                                                                          │
│  ┌────────────────┬────────────────┬────────────────┬────────────────┐ │
│  │ Total Balance  │ Pending        │ Available      │ Total Orders   │ │
│  │ ₹15,000        │ ₹0             │ ₹0             │ 83             │ │
│  └────────────────┴────────────────┴────────────────┴────────────────┘ │
│                                                                          │
│  📊 Store-wise Earnings Chart (Area Chart)                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │     ╱╲                                                           │  │
│  │    ╱  ╲      ╱╲                                                 │  │
│  │   ╱    ╲    ╱  ╲                                                │  │
│  │  ╱      ╲  ╱    ╲                                               │  │
│  │ ╱        ╲╱      ╲                                              │  │
│  │──────────────────────────────────────────────────────────────  │  │
│  │ Store CP  Store KB  Store MG                                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  📋 Store Breakdown Table                                               │
│  - Store CP: ₹8,000 (45 orders) - 53%                                  │
│  - Store KB: ₹7,000 (38 orders) - 47%                                  │
│                                                                          │
│  💳 Deductions List                                                     │
│  - Platform fee (5%) - ₹425                                             │
│  - Refund for order SC-1001 - ₹200                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Points

### **1. Authentication Flow**
- User logs in → Backend validates → Returns JWT token
- Token is stored in localStorage
- Token is sent with **every API request** in Authorization header

### **2. API Request Flow**
```javascript
// Frontend code (src/services/api.ts)
const token = localStorage.getItem('auth_token');

fetch('https://gateway-202671058278.asia-south1.run.app/api/vendor/finance/wallet/summary', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`  // ← Token sent here
  }
})
```

### **3. Backend Processing**
```javascript
// Backend code (example)
app.get('/api/vendor/finance/wallet/summary', authenticateToken, async (req, res) => {
  // authenticateToken middleware extracts vendorId from JWT
  const vendorId = req.user.id; // e.g., "vendor_123"
  
  // Query database
  const wallet = await db.collection('vendor_wallets').findOne({ userId: vendorId });
  
  // Return response
  res.json({
    success: true,
    data: wallet
  });
});
```

### **4. Database Tables Required**

Backend admin must create these tables:

#### **vendor_wallets**
```sql
CREATE TABLE vendor_wallets (
  _id VARCHAR(255) PRIMARY KEY,
  userId VARCHAR(255) NOT NULL,
  userType VARCHAR(50),
  balance DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'INR',
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

#### **vendor_earnings**
```sql
CREATE TABLE vendor_earnings (
  _id VARCHAR(255) PRIMARY KEY,
  vendorId VARCHAR(255) NOT NULL,
  storeId VARCHAR(255) NOT NULL,
  orderId VARCHAR(255),
  amount DECIMAL(10,2),
  status VARCHAR(50),
  createdAt TIMESTAMP
);
```

#### **vendor_deductions**
```sql
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
  createdAt TIMESTAMP
);
```

#### **vendor_closures**
```sql
CREATE TABLE vendor_closures (
  _id VARCHAR(255) PRIMARY KEY,
  vendorId VARCHAR(255) NOT NULL,
  period VARCHAR(50),
  date DATE,
  earnings DECIMAL(10,2),
  orderCount INT,
  breakdown JSON,
  createdAt TIMESTAMP
);
```

#### **vendor_payouts**
```sql
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
  createdAt TIMESTAMP
);
```

---

## 📝 What Backend Admin Must Do

### **Step 1: Fix CORS** (See CORS_FIX_REQUIRED.md)
```javascript
app.use(cors({
  origin: 'https://vendor4-n8ah.vercel.app',
  credentials: true
}));
```

### **Step 2: Create Database Tables**
Run the SQL commands above to create all required tables.

### **Step 3: Implement API Endpoints**

All endpoints must:
1. ✅ Validate JWT token from Authorization header
2. ✅ Extract vendorId from token
3. ✅ Query database for vendor's data only
4. ✅ Return data in exact format shown in backend response documentation

### **Step 4: Insert Sample Data**

For testing, insert sample data:

```sql
-- Sample wallet
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

-- Sample earnings
INSERT INTO vendor_earnings VALUES
  ('earn_001', 'vendor_123', 'store_cp_001', 'order_001', 8000.00, 'completed', NOW()),
  ('earn_002', 'vendor_123', 'store_kb_002', 'order_002', 7000.00, 'completed', NOW());

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
```

### **Step 5: Test Endpoints**

```bash
# Test wallet summary
curl -X GET \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://gateway-202671058278.asia-south1.run.app/api/vendor/finance/wallet/summary

# Expected response:
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

---

## ❓ FAQ

### **Q: When will Total Balance show data?**
**A:** When backend admin:
1. Creates `vendor_wallets` table
2. Inserts wallet record for the logged-in vendor
3. Implements `/api/vendor/finance/wallet/summary` endpoint
4. Fixes CORS to allow frontend requests

### **Q: Why is data not showing now?**
**A:** Because:
1. ❌ CORS is blocking all API requests
2. ❌ Backend endpoints may not be implemented yet
3. ❌ Database tables may not exist yet
4. ❌ No sample/real data in database yet

### **Q: What can frontend do?**
**A:** Frontend is **100% ready**. All code is implemented correctly. Frontend cannot fix CORS or create backend endpoints. Only backend admin can fix this.

### **Q: How to verify it's working?**
**A:** After backend fixes:
1. Open https://vendor4-n8ah.vercel.app
2. Login with vendor credentials
3. Navigate to Earnings page
4. Check browser DevTools → Network tab
5. API calls should return 200 OK with data
6. Cards should display balance, earnings, deductions

---

## 🎯 Summary

```
USER LOGIN
    ↓
JWT TOKEN GENERATED
    ↓
TOKEN STORED IN FRONTEND
    ↓
FRONTEND MAKES API CALLS WITH TOKEN
    ↓
BACKEND VALIDATES TOKEN
    ↓
BACKEND QUERIES DATABASE
    ↓
BACKEND RETURNS DATA
    ↓
FRONTEND DISPLAYS DATA
```

**Current Blocker:** CORS error prevents step 4 (Frontend makes API calls)

**Solution:** Backend admin must configure CORS + implement endpoints + create database tables
