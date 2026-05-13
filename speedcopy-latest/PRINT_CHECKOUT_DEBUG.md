# Print Checkout Page - Pickup Location Debug Fix

## Issue
When user selects a default store from PickupLocationPage (e.g., `default-1`), the PrintCheckoutPage wasn't showing the pickup location details properly.

## Root Cause
The pickup location section was conditionally rendered with `{pickupLocation && ...}`, but there was no visual feedback when:
1. The locationId exists but pickupLocation is still loading
2. The default store lookup failed

## Changes Made

### 1. Enhanced Console Logging
Added detailed console logs to track the store loading process:
- Log when checking for default store IDs
- Log the loaded store details (name, address, phone)
- Log available default store IDs if lookup fails
- Log the complete render state before rendering

### 2. Added Loading State
Changed the pickup location section from simple conditional rendering to three states:
- **Has pickupLocation**: Show the full pickup location card with store details
- **Has locationId but no pickupLocation**: Show loading skeleton
- **No locationId**: Don't show the section at all

### 3. Default Stores Mapping
Ensured the default stores mapping matches exactly with PickupLocationPage:
```javascript
const defaultStores = {
  'default-1': { name: 'SpeedCopy Hub - Jabalpur', ... },
  'default-2': { name: 'SpeedCopy Express - Delhi', ... },
  'default-3': { name: 'SpeedCopy Center - Mumbai', ... },
  'default-4': { name: 'SpeedCopy Plus - Bangalore', ... },
  'default-5': { name: 'SpeedCopy Station - Chennai', ... },
}
```

## Testing Instructions

1. Go to Document Printing page
2. Select a pickup location (any default store)
3. Click "Select Center"
4. On PrintCheckoutPage, check:
   - ✅ Pickup Location section should appear at the top
   - ✅ Store name should be displayed
   - ✅ Full address should be formatted properly
   - ✅ Phone number should show with 📞 icon

## Console Logs to Check

When the page loads, you should see:
```
🔍 Fetching checkout data for locationId: default-1
📍 Using default store for locationId: default-1
✅ Default store loaded: {_id: 'default-1', name: '...', ...}
✅ Store name: SpeedCopy Hub - Jabalpur
✅ Store address: {line1: '...', city: '...', ...}
✅ Store phone: +91-9876543210
🎨 Rendering PrintCheckoutPage with: {locationId: 'default-1', pickupLocation: {...}, ...}
```

## Files Modified
- `client/src/pages/PrintCheckoutPage.tsx`

## Date
April 27, 2026
