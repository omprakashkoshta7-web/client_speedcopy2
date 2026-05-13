# Finance Data Debug Guide

## समस्या: Earnings, Closure और Payouts में Data Show नहीं हो रहा

### Debug Steps:

1. **Browser Console Check करें:**
   - F12 दबाकर Developer Tools खोलें
   - Console tab में जाएं
   - Earnings/Closure/Payouts page पर जाएं
   - "Debug" button दबाएं
   - Console में errors check करें

2. **Network Tab Check करें:**
   - Developer Tools में Network tab खोलें
   - Page refresh करें
   - Finance API calls check करें:
     - `/api/vendor/finance/wallet/summary`
     - `/api/vendor/finance/wallet/store-wise`
     - `/api/vendor/finance/wallet/deductions`
     - `/api/vendor/finance/closure/daily`
     - `/api/vendor/finance/payouts/schedule`
     - `/api/vendor/finance/payouts/history`
   - Response status codes check करें (200 = OK, 401 = Unauthorized, 500 = Server Error)

3. **Common Issues और Solutions:**

### Issue 1: 401 Unauthorized Error
**Symptoms:** API calls fail with 401 status
**Solution:**
- Login page पर जाकर फिर से login करें
- Token expire हो गया है

### Issue 2: 500 Internal Server Error
**Symptoms:** API calls fail with 500 status
**Solution:**
- Backend server में issue है
- Admin से contact करें

### Issue 3: Network Error / CORS Error
**Symptoms:** API calls fail to reach server
**Solution:**
- Internet connection check करें
- API URL check करें: `https://gateway-202671058278.asia-south1.run.app`

### Issue 4: Empty Data Response
**Symptoms:** API calls succeed but return empty data
**Solution:**
- Backend में actual data नहीं है
- Database में vendor के लिए finance records नहीं हैं

### Issue 5: Wrong API Base URL
**Symptoms:** API calls go to wrong server
**Solution:**
- `.env` file में `VITE_API_URL` check करें
- Should be: `https://gateway-202671058278.asia-south1.run.app`

## Debug Commands (Browser Console में run करें):

```javascript
// Check auth status
localStorage.getItem("auth_token")
localStorage.getItem("vendor_session")

// Check API URL
import.meta.env.VITE_API_URL

// Manual API test
fetch("https://gateway-202671058278.asia-south1.run.app/api/vendor/finance/wallet/summary", {
  headers: {
    "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
    "Content-Type": "application/json"
  }
}).then(r => r.json()).then(console.log)
```

## Expected API Responses:

### Wallet Summary:
```json
{
  "success": true,
  "message": "Wallet summary retrieved",
  "data": {
    "balance": 50000,
    "pendingSettlement": 15000,
    "availableForWithdrawal": 35000
  }
}
```

### Store-wise Earnings:
```json
{
  "success": true,
  "message": "Store-wise earnings retrieved",
  "data": [
    {
      "_id": "store123",
      "earnings": 25000,
      "orderCount": 45
    }
  ]
}
```

### Payouts History:
```json
{
  "success": true,
  "message": "Payout history retrieved",
  "data": {
    "payouts": [
      {
        "_id": "payout123",
        "amount": 10000,
        "platformFee": 500,
        "netAmount": 9500,
        "status": "paid",
        "createdAt": "2024-01-15T10:00:00Z"
      }
    ]
  }
}
```

## Next Steps:

1. Debug buttons use करें
2. Console errors screenshot लें
3. Network tab में API responses check करें
4. यदि 401 error आए तो re-login करें
5. यदि 500 error आए तो admin को inform करें
6. यदि empty data आए तो backend team को बताएं कि test data add करना है