# Finance API Issue - Complete Solution

## समस्या की पहचान:
आपके Finance pages (Earnings, Closure, Payouts) में data show नहीं हो रहा क्योंकि API calls fail हो रही हैं।

## Debug करने के Steps:

### 1. Browser Console में Debug करें:

```javascript
// Step 1: Basic health check
fetch("https://gateway-202671058278.asia-south1.run.app/api/health")
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Step 2: Check auth token
console.log("Auth Token:", localStorage.getItem("auth_token"));

// Step 3: Test finance API manually
fetch("https://gateway-202671058278.asia-south1.run.app/api/vendor/finance/wallet/summary", {
  headers: {
    "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
    "Content-Type": "application/json"
  }
}).then(r => r.json()).then(console.log).catch(console.error);
```

### 2. Common Issues और Solutions:

#### Issue A: 401 Unauthorized
**Cause:** Token expired या invalid
**Solution:** 
```javascript
// Clear storage and re-login
localStorage.clear();
window.location.href = "/login";
```

#### Issue B: 404 Not Found  
**Cause:** Finance API endpoints exist नहीं करते backend में
**Solution:** Backend team को बताना होगा कि finance module implement करें

#### Issue C: 500 Internal Server Error
**Cause:** Backend server में error
**Solution:** Backend logs check करें

#### Issue D: CORS Error
**Cause:** Frontend और backend के बीच CORS issue
**Solution:** Backend में CORS headers add करें

### 3. Backend Requirements:

Finance APIs जो implement होने चाहिए:

```
GET /api/vendor/finance/wallet/summary
GET /api/vendor/finance/wallet/store-wise  
GET /api/vendor/finance/wallet/deductions
GET /api/vendor/finance/closure/daily
GET /api/vendor/finance/closure/weekly
GET /api/vendor/finance/closure/monthly
GET /api/vendor/finance/payouts/schedule
GET /api/vendor/finance/payouts/history
```

### 4. Expected API Responses:

#### Wallet Summary:
```json
{
  "success": true,
  "data": {
    "balance": 50000,
    "pendingSettlement": 15000, 
    "availableForWithdrawal": 35000
  }
}
```

#### Store-wise Earnings:
```json
{
  "success": true,
  "data": [
    {
      "_id": "store123",
      "earnings": 25000,
      "orderCount": 45
    }
  ]
}
```

### 5. Database Schema Requirements:

Backend में ये tables होने चाहिए:

```sql
-- Vendor wallet table
CREATE TABLE vendor_wallets (
  id VARCHAR PRIMARY KEY,
  vendor_id VARCHAR NOT NULL,
  balance DECIMAL(10,2) DEFAULT 0,
  pending_settlement DECIMAL(10,2) DEFAULT 0,
  available_for_withdrawal DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Vendor earnings table  
CREATE TABLE vendor_earnings (
  id VARCHAR PRIMARY KEY,
  vendor_id VARCHAR NOT NULL,
  store_id VARCHAR,
  amount DECIMAL(10,2) NOT NULL,
  order_count INT DEFAULT 0,
  period_type ENUM('daily', 'weekly', 'monthly'),
  period_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vendor payouts table
CREATE TABLE vendor_payouts (
  id VARCHAR PRIMARY KEY,
  vendor_id VARCHAR NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'processing', 'paid', 'failed'),
  transfer_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 6. Immediate Action Items:

1. **Frontend Developer (आप):**
   - Console में debug commands run करें
   - Network tab में exact error codes check करें
   - Screenshots share करें

2. **Backend Developer:**
   - Finance API endpoints implement करें
   - Database tables create करें  
   - Sample data add करें
   - CORS headers add करें

3. **DevOps/Admin:**
   - Server logs check करें
   - Database connectivity verify करें

### 7. Testing Commands:

Page पर जाकर ये buttons use करें:
- **Debug Button**: Console में detailed logs देखने के लिए
- **Debug Info Button**: Real-time data status देखने के लिए

### 8. Next Steps:

1. Console में debug commands run करें
2. Exact error messages note करें  
3. Backend team को inform करें
4. Database schema implement करवाएं
5. Test data add करवाएं

यह comprehensive solution है। सबसे पहले console में debug करके exact issue identify करें, फिर backend team के साथ coordinate करें।