# 🏦 Vendor Finance API Routes

## Base URL
```
https://gateway-202671058278.asia-south1.run.app/api
```

---

## 📊 Wallet APIs

### 1. Get Wallet Summary
```http
GET /vendor/finance/wallet/summary
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Wallet summary retrieved",
  "data": {
    "_id": "wallet_id",
    "userId": "vendor_id",
    "userType": "vendor",
    "balance": 15000,
    "currency": "INR",
    "isActive": true,
    "pendingSettlement": 5000,
    "availableForWithdrawal": 10000,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T00:00:00.000Z"
  }
}
```

---

### 2. Get Store-wise Earnings
```http
GET /vendor/finance/wallet/store-wise
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Store-wise earnings retrieved",
  "data": [
    {
      "_id": "store_id_1",
      "earnings": 25000,
      "orderCount": 45
    },
    {
      "_id": "store_id_2",
      "earnings": 18000,
      "orderCount": 32
    }
  ]
}
```

---

### 3. Get Wallet Deductions
```http
GET /vendor/finance/wallet/deductions
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Deductions retrieved",
  "data": {
    "deductions": [
      {
        "_id": "deduction_id",
        "walletId": "wallet_id",
        "amount": 500,
        "category": "platform_fee",
        "description": "Platform commission",
        "referenceType": "order",
        "referenceId": "order_id",
        "status": "completed",
        "metadata": {
          "feePercentage": 10,
          "originalAmount": 5000
        },
        "createdAt": "2024-01-10T00:00:00.000Z"
      }
    ]
  }
}
```

---

## 📅 Closure APIs

### 4. Get Daily Closure
```http
GET /vendor/finance/closure/daily?date=2024-01-15
Authorization: Bearer {token}
```

**Query Parameters:**
- `date` (optional): YYYY-MM-DD format. Default: today

**Response:**
```json
{
  "success": true,
  "message": "Daily closure retrieved",
  "data": {
    "period": "daily",
    "date": "2024-01-15",
    "earnings": 5000,
    "count": 12,
    "totalEarnings": 5000,
    "totalOrders": 12,
    "breakdown": {
      "grossEarnings": 6000,
      "deductions": 1000,
      "netEarnings": 5000
    }
  }
}
```

---

### 5. Get Weekly Closure
```http
GET /vendor/finance/closure/weekly?date=2024-01-15
Authorization: Bearer {token}
```

**Query Parameters:**
- `date` (optional): Any date in the week. Default: current week

**Response:**
```json
{
  "success": true,
  "message": "Weekly closure retrieved",
  "data": {
    "period": "weekly",
    "weekStart": "2024-01-08",
    "weekEnd": "2024-01-14",
    "earnings": 35000,
    "count": 85,
    "totalEarnings": 35000,
    "totalOrders": 85,
    "dailyBreakdown": [
      {
        "date": "2024-01-08",
        "earnings": 5000,
        "orders": 12
      },
      {
        "date": "2024-01-09",
        "earnings": 4500,
        "orders": 11
      }
    ],
    "stats": {
      "avgDailyEarnings": 5000,
      "avgOrderValue": 412
    }
  }
}
```

---

### 6. Get Monthly Closure
```http
GET /vendor/finance/closure/monthly?date=2024-01-15
Authorization: Bearer {token}
```

**Query Parameters:**
- `date` (optional): Any date in the month. Default: current month

**Response:**
```json
{
  "success": true,
  "message": "Monthly closure retrieved",
  "data": {
    "period": "monthly",
    "month": "2024-01",
    "earnings": 150000,
    "count": 350,
    "totalEarnings": 150000,
    "totalOrders": 350,
    "weeklyBreakdown": [
      {
        "week": 1,
        "weekStart": "2024-01-01",
        "weekEnd": "2024-01-07",
        "earnings": 35000,
        "orders": 85
      }
    ],
    "categoryWise": {
      "printing": 80000,
      "binding": 40000,
      "lamination": 30000
    },
    "stats": {
      "avgWeeklyEarnings": 37500,
      "avgOrderValue": 429,
      "topDay": {
        "date": "2024-01-15",
        "earnings": 8000
      }
    }
  }
}
```

---

## 💰 Payout APIs

### 7. Get Payout Schedule
```http
GET /vendor/finance/payouts/schedule
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Payout schedule retrieved",
  "data": {
    "nextPayoutDate": "2024-01-20",
    "estimatedAmount": 12000,
    "lastPayoutDate": "2024-01-05",
    "lastPayoutAmount": 10000,
    "payoutFrequency": "weekly",
    "payoutMethod": "bank_transfer",
    "bankAccount": {
      "accountName": "Vendor Name",
      "accountNumber": "1234567890",
      "ifscCode": "SBIN0001234",
      "bankName": "State Bank of India"
    },
    "estimatedDeductions": {
      "platformFee": 1500,
      "gst": 500,
      "other": 0
    },
    "estimatedNetAmount": 10000
  }
}
```

---

### 8. Get Payout History
```http
GET /vendor/finance/payouts/history
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Payout history retrieved",
  "data": {
    "payouts": [
      {
        "_id": "payout_id",
        "vendorId": "vendor_id",
        "payoutDate": "2024-01-05",
        "amount": 12000,
        "status": "paid",
        "transactionId": "TXN123456789",
        "bankAccount": "XXXX7890",
        "ordersIncluded": 45,
        "periodStart": "2023-12-29",
        "periodEnd": "2024-01-04",
        "breakdown": {
          "grossAmount": 14000,
          "platformFee": 1500,
          "gst": 500,
          "netAmount": 12000
        },
        "paidAt": "2024-01-05T10:30:00.000Z",
        "createdAt": "2024-01-05T00:00:00.000Z"
      }
    ],
    "summary": {
      "totalPayouts": 10,
      "totalAmount": 120000,
      "avgPayoutAmount": 12000,
      "lastPayoutDate": "2024-01-05"
    }
  }
}
```

---

## 🔐 Authentication

All APIs require Bearer token authentication:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Token is obtained from login API and stored in localStorage as `auth_token`.

---

## ❌ Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized access"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Route not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details..."
}
```

---

## 📝 Notes

1. **Date Format**: All dates should be in `YYYY-MM-DD` format
2. **Currency**: All amounts are in INR (Indian Rupees)
3. **Timezone**: All timestamps are in UTC
4. **Pagination**: Currently not implemented, returns all records
5. **Rate Limiting**: Not specified, implement as needed

---

## 🧪 Testing with cURL

### Test Wallet Summary
```bash
curl -X GET \
  'https://gateway-202671058278.asia-south1.run.app/api/vendor/finance/wallet/summary' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE'
```

### Test Daily Closure
```bash
curl -X GET \
  'https://gateway-202671058278.asia-south1.run.app/api/vendor/finance/closure/daily?date=2024-01-15' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE'
```

### Test Payout History
```bash
curl -X GET \
  'https://gateway-202671058278.asia-south1.run.app/api/vendor/finance/payouts/history' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE'
```

---

## 🚀 Quick Reference

| API | Method | Endpoint | Used In |
|-----|--------|----------|---------|
| Wallet Summary | GET | `/vendor/finance/wallet/summary` | EarningsPage |
| Store-wise Earnings | GET | `/vendor/finance/wallet/store-wise` | EarningsPage |
| Deductions | GET | `/vendor/finance/wallet/deductions` | EarningsPage |
| Daily Closure | GET | `/vendor/finance/closure/daily` | ClosurePage |
| Weekly Closure | GET | `/vendor/finance/closure/weekly` | ClosurePage |
| Monthly Closure | GET | `/vendor/finance/closure/monthly` | ClosurePage |
| Payout Schedule | GET | `/vendor/finance/payouts/schedule` | PayoutsPage |
| Payout History | GET | `/vendor/finance/payouts/history` | PayoutsPage |

---

## 📦 Complete API List (Copy-Paste Ready)

```
GET /vendor/finance/wallet/summary
GET /vendor/finance/wallet/store-wise
GET /vendor/finance/wallet/deductions
GET /vendor/finance/closure/daily?date=YYYY-MM-DD
GET /vendor/finance/closure/weekly?date=YYYY-MM-DD
GET /vendor/finance/closure/monthly?date=YYYY-MM-DD
GET /vendor/finance/payouts/schedule
GET /vendor/finance/payouts/history
```
