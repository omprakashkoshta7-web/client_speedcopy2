# Store Display Issue - Debugging Guide

## समस्या (Problem)
Vendor में stores registered हैं लेकिन Pickup Location page पर "Stores pending approval" message दिख रहा है।

## Debug Steps

### 1. Browser Console Check करें
1. Browser में F12 दबाएं (Developer Tools खोलने के लिए)
2. Console tab पर जाएं
3. Page को refresh करें
4. निम्नलिखित logs देखें:

```
🔍 Fetching pickup locations...
🔄 loadStores called with params: {...}
📦 Vendor API RAW response: {...}
🖨️ Printing API RAW response: {...}
```

### 2. API Response Check करें

#### Vendor API Response Format
Expected format:
```json
{
  "success": true,
  "data": {
    "stores": [
      {
        "_id": "store123",
        "name": "Store Name",
        "address": "Store Address",
        "city": "City",
        "state": "State",
        "pincode": "123456",
        "is_active": true,
        "approval_status": "approved",
        "location": {
          "type": "Point",
          "coordinates": [lng, lat]
        },
        "distance_km": 5.2
      }
    ],
    "totalFound": 1,
    "searchLocation": {...},
    "searchRadius": 50
  }
}
```

### 3. Common Issues और Solutions

#### Issue 1: API Response Empty है
**Symptoms:**
```
📦 Extracted vendor stores count: 0
⚠️ No vendor stores found in response
```

**Solutions:**
1. Backend vendor service check करें: `https://vendor-202671058278.asia-south1.run.app/api/vendor/stores/nearby`
2. Database में stores exist करते हैं या नहीं check करें
3. Stores का `is_active` field true है या नहीं check करें

#### Issue 2: Stores Pending Approval हैं
**Symptoms:**
```
📦 Extracted vendor stores count: 5
✅ Final mapped stores: 5
```
But still showing "Stores pending approval"

**Solutions:**
1. Check if `approval_status` field is "pending"
2. Backend में approval logic को update करें
3. Admin panel से stores को approve करें

#### Issue 3: API Call Fail हो रहा है
**Symptoms:**
```
❌ Vendor API failed: Network Error
```

**Solutions:**
1. Network tab में API call check करें
2. CORS issues check करें
3. Backend service running है या नहीं check करें

### 4. Manual API Testing

#### Test Vendor API Directly
```bash
# Without location
curl https://vendor-202671058278.asia-south1.run.app/api/vendor/stores/nearby?limit=50

# With location
curl "https://vendor-202671058278.asia-south1.run.app/api/vendor/stores/nearby?lat=28.6139&lng=77.2090&radius=50&limit=50"

# With pincode
curl "https://vendor-202671058278.asia-south1.run.app/api/vendor/stores/nearby?pincode=110001&radius=50&limit=50"
```

#### Test Printing API
```bash
curl https://gateway-202671058278.asia-south1.run.app/api/products/printing/pickup-locations?limit=50
```

### 5. Frontend Fixes Applied

#### Fix 1: Enhanced Logging
- Added detailed console logs at every step
- Shows raw API responses
- Shows extraction paths tried
- Shows final mapped stores

#### Fix 2: Multiple Extraction Paths
Code now tries multiple paths to extract stores:
- `res.data.stores`
- `res.stores`
- `res.data` (if array)
- `res` (if array)

#### Fix 3: Show Pending Approval Stores
Stores with `approval_status: "pending"` will now show with "PENDING APPROVAL" label instead of being hidden.

### 6. Backend Fixes Needed

#### Vendor Service API
File: `vendor-service/src/routes/stores.js` (या similar)

```javascript
// GET /api/vendor/stores/nearby
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 50, limit = 50, pincode } = req.query;
    
    // Build query
    const query = {
      // IMPORTANT: Don't filter by approval_status here
      // Let frontend decide what to show
      is_active: true  // Only show active stores
    };
    
    // Add location/pincode filters...
    
    const stores = await Store.find(query).limit(limit);
    
    // Calculate distances if lat/lng provided
    
    res.json({
      success: true,
      data: {
        stores: stores,
        totalFound: stores.length,
        searchLocation: { lat, lng },
        searchRadius: radius
      }
    });
  } catch (error) {
    console.error('Error fetching stores:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

### 7. Database Check

```javascript
// MongoDB query to check stores
db.stores.find({
  is_active: true
}).pretty()

// Check approval status
db.stores.aggregate([
  {
    $group: {
      _id: "$approval_status",
      count: { $sum: 1 }
    }
  }
])
```

### 8. Quick Fix for Testing

अगर आप तुरंत test करना चाहते हैं, तो:

1. **Browser Console में run करें:**
```javascript
// Check what API is returning
fetch('https://vendor-202671058278.asia-south1.run.app/api/vendor/stores/nearby?limit=50')
  .then(r => r.json())
  .then(data => console.log('API Response:', data))
```

2. **Mock data add करें (temporary testing):**
```javascript
// In PickupLocationPage.tsx, fetchLocations function
const apiStores = await loadStores(geoParams);

// Add this for testing:
if (apiStores.length === 0) {
  console.warn('⚠️ No stores found, using mock data for testing');
  setLocations([{
    id: 'test-1',
    name: 'Test Store',
    address: 'Test Address, City, State - 123456',
    distance: '5.0 km',
    rating: 4.8,
    reviews: 10,
    status: 'open',
    statusLabel: 'OPEN NOW',
    amenities: ['print', 'wifi', 'parking'],
    icon: 'store'
  }]);
  return;
}
```

## Next Steps

1. ✅ Frontend logging enhanced (DONE)
2. ⏳ Check browser console logs
3. ⏳ Test API endpoints directly
4. ⏳ Fix backend if needed
5. ⏳ Update database records if needed

## Contact
अगर issue solve नहीं हो रहा है, तो:
- Console logs का screenshot share करें
- Network tab का screenshot share करें
- Backend logs check करें
