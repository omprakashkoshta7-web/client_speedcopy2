# User Profile & Account APIs - Quick Reference

## All 15 APIs Summary

### Profile Management (6 APIs)

| # | API | Method | Endpoint | Description |
|---|-----|--------|----------|-------------|
| 1 | `getProfile()` | GET | `/api/users/profile` | User की details देखना |
| 2 | `updateProfile(data)` | PUT | `/api/users/profile` | Name, phone, dateOfBirth, gender update करना |
| 3 | `uploadAvatar(file)` | POST | `/api/users/profile/avatar` | Profile picture लगाना |
| 4 | `updateNotificationPreferences(prefs)` | PATCH | `/api/users/profile/notifications` | Email/SMS/Push notifications on/off करना |
| 5 | `requestDataExport(request)` | POST | `/api/users/profile/data-export-request` | Apna pura data download करना (GDPR) |
| 6 | `requestAccountDeletion(request)` | POST | `/api/users/profile/account-deletion-request` | Account delete करने की request |

### Address Management (5 APIs)

| # | API | Method | Endpoint | Description |
|---|-----|--------|----------|-------------|
| 7 | `getAllAddresses()` | GET | `/api/users/addresses` | Saved addresses की list देखना |
| 8 | `addAddress(data)` | POST | `/api/users/addresses` | Naya delivery address add करना |
| 9 | `updateAddress(id, data)` | PUT | `/api/users/addresses/{id}` | Purana address edit करना |
| 10 | `updateGPSLocation(id, coords)` | PUT | `/api/users/addresses/{id}` | Address का GPS coordinates save करना |
| 11 | `deleteAddress(id)` | DELETE | `/api/users/addresses/{id}` | Address remove करना |

### Wishlist (4 APIs)

| # | API | Method | Endpoint | Description |
|---|-----|--------|----------|-------------|
| 12 | `getWishlist()` | GET | `/api/users/wishlist` | Saved products देखना |
| 13 | `addToWishlist(productId, type)` | POST | `/api/users/wishlist` | Product save करना |
| 14 | `removeFromWishlist(productId)` | DELETE | `/api/users/wishlist/{productId}` | Ek product hatana |
| 15 | `clearWishlist()` | DELETE | `/api/users/wishlist` | Puri wishlist khali करना |

---

## Usage Examples

### 1. Get Profile
```typescript
const response = await userProfileService.getProfile();
// Returns: UserProfile object with all user details
```

### 2. Update Profile
```typescript
await userProfileService.updateProfile({
  name: "Jane Doe",
  phone: "+91-9876543211"
});
```

### 3. Upload Avatar
```typescript
const file = document.querySelector('input[type="file"]').files[0];
await userProfileService.uploadAvatar(file);
```

### 4. Update Notifications
```typescript
await userProfileService.updateNotificationPreferences({
  notifications: true,
  push: true,
  whatsapp: false
});
```

### 5. Request Data Export
```typescript
await userProfileService.requestDataExport({
  reason: "Moving to another platform"
});
```

### 6. Request Account Deletion
```typescript
await userProfileService.requestAccountDeletion({
  reason: "Not using anymore"
});
```

### 7. Get All Addresses
```typescript
const response = await userProfileService.getAllAddresses();
// Returns: Address[] array
```

### 8. Add Address
```typescript
await userProfileService.addAddress({
  fullName: "John Doe",
  phone: "+91-9876543210",
  line1: "123 Main Street",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400001"
});
```

### 9. Update Address
```typescript
await userProfileService.updateAddress('addr_id', {
  fullName: "Jane Doe",
  phone: "+91-9876543211"
});
```

### 10. Update GPS Location
```typescript
await userProfileService.updateGPSLocation('addr_id', {
  lat: 19.0760,
  lng: 72.8777
});
```

### 11. Delete Address
```typescript
await userProfileService.deleteAddress('addr_id');
```

### 12. Get Wishlist
```typescript
const response = await userProfileService.getWishlist();
// Returns: WishlistItem[] array
```

### 13. Add to Wishlist
```typescript
await userProfileService.addToWishlist('product_id', 'gifting');
```

### 14. Remove from Wishlist
```typescript
await userProfileService.removeFromWishlist('product_id');
```

### 15. Clear Wishlist
```typescript
await userProfileService.clearWishlist();
```

---

## Backend Field Mapping

### Profile Fields
- `userId`: User ID from auth-service
- `name`: User's full name
- `phone`: Phone number
- `avatar`: Avatar image URL
- `dateOfBirth`: Date of birth
- `gender`: 'male' | 'female' | 'other'
- `preferences`: Notification preferences
- `wishlist`: Array of wishlist items
- `privacyRequests`: Data export and deletion requests

### Address Fields
- `fullName`: Full name for address
- `phone`: Phone number for address
- `line1`: Street address line 1
- `line2`: Street address line 2
- `houseNo`: House/Building number
- `area`: Area/Locality
- `landmark`: Nearby landmark
- `city`: City name
- `state`: State/Province
- `pincode`: Postal code
- `country`: Country (default: India)
- `location`: GPS coordinates {lat, lng}
- `label`: 'Home' | 'Office' | 'Other'
- `isDefault`: Is default address

### Wishlist Fields
- `productId`: Product ID
- `productType`: 'gifting' | 'shopping' | 'printing' | 'business-printing'
- `addedAt`: Timestamp when added

---

## Error Codes

| Status | Error | Meaning |
|--------|-------|---------|
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Token missing or invalid |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Product already in wishlist |
| 500 | Server Error | Internal server error |

---

## Notes

1. सभी APIs के लिए authentication token required है
2. Token automatically request headers में add होता है
3. Backend field names को exactly match करना है
4. Address में `line1` required है, बाकी optional हैं
5. Wishlist में `productType` default 'gifting' है
6. GPS coordinates में `lat` और `lng` use होते हैं (latitude/longitude नहीं)
7. Account deletion में active orders होने पर status `blocked_active_orders` होगी
