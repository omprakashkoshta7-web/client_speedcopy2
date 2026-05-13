# Estimated Delivery Time Fix - Pickup Option

## Issue
When selecting a pickup option in printing, the estimated delivery time was not showing. The time was hardcoded as "Ready in 2-4 hrs" and wasn't dynamically managed or displayed properly.

## Root Cause
1. **Hardcoded Display**: The delivery time was hardcoded in PickupLocationPage
2. **No Data Structure**: The PickupLocation type didn't include delivery time fields
3. **No State Management**: Delivery time wasn't stored or passed through the checkout flow
4. **Missing Display**: PrintCheckoutPage didn't show the delivery time at all

## Solution Implemented

### 1. Updated PickupLocation Type (PickupLocationPage.tsx)
Added two new optional fields to store delivery time:
```typescript
type PickupLocation = {
  // ... existing fields
  estimatedDeliveryTime?: string;
  readyTime?: string;
};
```

### 2. Enhanced mapVendorStoreToLocation Function
Now extracts delivery time from store data with fallback to default:
```typescript
const estimatedDeliveryTime = store?.estimatedDeliveryTime || 
                              store?.estimated_delivery_time || 
                              store?.readyTime || 
                              store?.ready_time || 
                              'Ready in 2-4 hrs';
```

### 3. Updated handleSelectCenter Function
Now stores delivery time in sessionStorage for easy access:
```typescript
sessionStorage.setItem(`pickup_delivery_time_${locationId}`, 
  selectedLocation.estimatedDeliveryTime || 'Ready in 2-4 hrs');
```

### 4. Dynamic Display in PickupLocationPage
Changed from hardcoded to dynamic:
```jsx
<span className="text-xs font-semibold" style={{ color: '#16a34a' }}>
  {loc.estimatedDeliveryTime || 'Ready in 2-4 hrs'}
</span>
```

### 5. Added Delivery Time Display in PrintCheckoutPage
- **Pickup Location Section**: Shows delivery time below the location details
- **Order Summary Section**: Displays estimated ready time in a highlighted box

```jsx
{/* Display Estimated Delivery Time */}
<div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #f3f4f6' }}>
  <svg className="w-4 h-4" style={{ color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
  <span className="text-sm font-semibold" style={{ color: '#16a34a' }}>
    {pickupLocation.estimatedDeliveryTime || sessionStorage.getItem(`pickup_delivery_time_${locationId}`) || 'Ready in 2-4 hrs'}
  </span>
</div>
```

### 6. Updated Default SpeedCopyHub Store
Added delivery time to both instances:
```typescript
estimatedDeliveryTime: 'Ready in 2-4 hrs',
readyTime: 'Ready in 2-4 hrs',
```

## Files Modified
1. **speedcopy-main/src/pages/PickupLocationPage.tsx**
   - Updated PickupLocation type
   - Enhanced mapVendorStoreToLocation function
   - Updated handleSelectCenter to store delivery time
   - Changed hardcoded display to dynamic
   - Updated both SpeedCopyHub instances

2. **speedcopy-main/src/pages/PrintCheckoutPage.tsx**
   - Added delivery time display in pickup location section
   - Added delivery time display in order summary section

## User Experience Improvements
1. ✅ Estimated delivery time now displays on PickupLocationPage when selecting a location
2. ✅ Delivery time is stored and passed through the checkout flow
3. ✅ PrintCheckoutPage shows the estimated ready time in two places:
   - Below the pickup location details
   - In the order summary section
4. ✅ Fallback to "Ready in 2-4 hrs" if no specific time is available
5. ✅ Time is fetched from API if available, otherwise uses default

## Future Enhancements
- API responses should include `estimatedDeliveryTime` or `readyTime` field
- Service package selection could influence the delivery time shown
- Different delivery times for different service packages (Standard: 3 days, Express: 24 hours, Instant: 4 hours)
- Real-time delivery time calculation based on current queue and processing time

## Testing Checklist
- [ ] Select a pickup location and verify delivery time displays
- [ ] Check that delivery time appears in PrintCheckoutPage
- [ ] Verify delivery time is stored in sessionStorage
- [ ] Test with different pickup locations
- [ ] Verify fallback to "Ready in 2-4 hrs" works
- [ ] Check mobile responsiveness of delivery time display
