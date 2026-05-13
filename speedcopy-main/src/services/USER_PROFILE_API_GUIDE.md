# User Profile & Account API Integration Guide

यह guide आपको User Profile & Account APIs को integrate करने में मदद करेगा। सभी 15 APIs पहले से ही `user-profile.service.ts` में implement हैं।

## Overview

**Total APIs: 15**
- Profile Management: 6 APIs
- Address Management: 5 APIs
- Wishlist: 4 APIs

---

## 1. Profile Management (6 APIs)

### 1.1 Get Profile
User की personal details देखना (name, email, phone)

```typescript
import userProfileService from '@/services/user-profile.service';

// Usage
const response = await userProfileService.getProfile();
console.log(response.data); // UserProfile object
```

**Response:**
```typescript
{
  _id: "profile123",
  userId: "user123",
  name: "John Doe",
  phone: "+91-9876543210",
  avatar: "https://...",
  dateOfBirth: "1990-01-01",
  gender: "male",
  preferences: {
    notifications: true,
    newsletter: false,
    push: true,
    whatsapp: true,
    criticalAlerts: true,
    quietHours: {
      start: "22:00",
      end: "08:00"
    }
  },
  wishlist: [...],
  privacyRequests: {...},
  createdAt: "2024-01-01T00:00:00Z"
}
```

---

### 1.2 Update Profile
Name, phone, dateOfBirth, gender update करना

```typescript
const response = await userProfileService.updateProfile({
  name: "Jane Doe",
  phone: "+91-9876543211",
  dateOfBirth: "1992-05-15",
  gender: "female"
});
```

**Parameters:**
- `name` (optional): नया नाम
- `phone` (optional): नया phone number
- `dateOfBirth` (optional): जन्मतिथि (YYYY-MM-DD format)
- `gender` (optional): 'male' | 'female' | 'other'

---

### 1.3 Upload Avatar
Profile picture लगाना

```typescript
const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
const file = fileInput.files?.[0];

if (file) {
  const response = await userProfileService.uploadAvatar(file);
  console.log(response.data.avatar); // New avatar URL
}
```

**Supported formats:** JPG, PNG, GIF, WebP
**Max size:** 5MB

---

### 1.4 Update Notifications
Email/SMS/Push notifications on/off करना

```typescript
const response = await userProfileService.updateNotificationPreferences({
  notifications: true,
  newsletter: false,
  push: true,
  whatsapp: true,
  criticalAlerts: true,
  quietHours: {
    start: "22:00",
    end: "08:00"
  }
});
```

**Parameters:**
- `notifications`: General notifications enable/disable
- `newsletter`: Newsletter emails enable/disable
- `push`: Push notifications enable/disable
- `whatsapp`: WhatsApp notifications enable/disable
- `criticalAlerts`: Critical alerts enable/disable (default: true)
- `quietHours`: Quiet hours configuration
  - `start`: Start time (HH:MM format)
  - `end`: End time (HH:MM format)

---

### 1.5 Request Data Export
Apna pura data download करना (GDPR compliance)

```typescript
const response = await userProfileService.requestDataExport({
  reason: "Moving to another platform"
});

console.log(response.data.privacyRequests);
// {
//   dataExportRequestedAt: "2024-01-15T10:30:00Z",
//   dataExportStatus: "requested",
//   ...
// }
```

**Parameters:**
- `reason` (optional): Data export का कारण

**Note:** Data export request process में जाएगी और status को track कर सकते हैं

---

### 1.6 Request Account Deletion
Account delete करने की request

```typescript
const response = await userProfileService.requestAccountDeletion({
  reason: "Moving to another platform"
});

console.log(response.data.privacyRequests);
// {
//   accountDeletionRequestedAt: "2024-01-15T10:30:00Z",
//   accountDeletionStatus: "requested" or "blocked_active_orders",
//   accountDeletionReason: "Moving to another platform"
// }
```

**Parameters:**
- `reason` (optional): Account delete करने का कारण

**Note:** 
- अगर active orders हैं तो status `blocked_active_orders` होगी
- अन्यथा status `requested` होगी

---

## 2. Address Management (5 APIs)

### 2.1 Get All Addresses
Saved addresses की list देखना

```typescript
const response = await userProfileService.getAllAddresses();
console.log(response.data); // Address[]
```

**Response:**
```typescript
[
  {
    _id: "addr1",
    userId: "user123",
    label: "Home",
    fullName: "John Doe",
    phone: "+91-9876543210",
    houseNo: "123",
    area: "Bandra",
    landmark: "Near Station",
    line1: "123 Main Street",
    line2: "Apt 4B",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    country: "India",
    location: {
      lat: 19.0760,
      lng: 72.8777
    },
    isDefault: true,
    createdAt: "2024-01-01T00:00:00Z"
  }
]
```

---

### 2.2 Add Address
Naya delivery address add करना

```typescript
const response = await userProfileService.addAddress({
  label: "Office",
  fullName: "John Doe",
  phone: "+91-9876543210",
  houseNo: "456",
  area: "Business District",
  landmark: "Near Mall",
  line1: "456 Business Avenue",
  line2: "Suite 100",
  city: "Bangalore",
  state: "Karnataka",
  pincode: "560001",
  country: "India",
  isDefault: false
});
```

**Parameters (Required):**
- `fullName`: Full name for this address
- `phone`: Phone number for this address
- `line1`: Street address line 1

**Parameters (Optional):**
- `label`: 'Home' | 'Office' | 'Other' (default: 'Home')
- `houseNo`: House/Building number
- `area`: Area/Locality name
- `landmark`: Nearby landmark
- `line2`: Street address line 2
- `city`: City name
- `state`: State/Province
- `pincode`: Postal/ZIP code
- `country`: Country (default: 'India')
- `isDefault`: Set as default address

---

### 2.3 Update Address
Purana address edit करना

```typescript
const response = await userProfileService.updateAddress('addr1', {
  fullName: "Jane Doe",
  phone: "+91-9876543211",
  line1: "789 New Street"
});
```

**Parameters:** Same as Add Address (सभी optional हैं)

---

### 2.4 Update GPS Location
Address का exact GPS coordinates save करना

```typescript
const response = await userProfileService.updateGPSLocation('addr1', {
  lat: 28.6139,
  lng: 77.2090
});
```

**Parameters:**
- `lat`: Latitude coordinate
- `lng`: Longitude coordinate

---

### 2.5 Delete Address
Address remove करना

```typescript
const response = await userProfileService.deleteAddress('addr1');
console.log(response.success); // true
```

---

## 3. Wishlist (4 APIs)

### 3.1 Get Wishlist
Saved products देखना

```typescript
const response = await userProfileService.getWishlist();
console.log(response.data); // WishlistItem[]
```

**Response:**
```typescript
[
  {
    productId: "prod123",
    productType: "gifting",
    addedAt: "2024-01-15T10:30:00Z"
  },
  {
    productId: "prod456",
    productType: "shopping",
    addedAt: "2024-01-14T15:20:00Z"
  }
]
```

---

### 3.2 Add to Wishlist
Product save करना

```typescript
const response = await userProfileService.addToWishlist(
  'prod123',
  'gifting' // optional: 'gifting' | 'shopping' | 'printing' | 'business-printing'
);
console.log(response.data); // Updated wishlist array
```

**Parameters:**
- `productId` (required): Product ID to add
- `productType` (optional): 'gifting' | 'shopping' | 'printing' | 'business-printing' (default: 'gifting')

---

### 3.3 Remove from Wishlist
Ek product hatana

```typescript
const response = await userProfileService.removeFromWishlist('prod123');
console.log(response.data); // Updated wishlist array
```

**Parameters:**
- `productId`: Product ID to remove

---

### 3.4 Clear Wishlist
Puri wishlist khali करना

```typescript
const response = await userProfileService.clearWishlist();
console.log(response.data); // Empty array []
```

---

## Complete Example: React Component

```typescript
import { useState, useEffect } from 'react';
import userProfileService, { UserProfile, Address } from '@/services/user-profile.service';

export function UserProfileComponent() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
    loadAddresses();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await userProfileService.getProfile();
      setProfile(response.data);
    } catch (err) {
      setError('Failed to load profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAddresses = async () => {
    try {
      const response = await userProfileService.getAllAddresses();
      setAddresses(response.data);
    } catch (err) {
      console.error('Failed to load addresses', err);
    }
  };

  const handleUpdateProfile = async (name: string, phone: string) => {
    try {
      const response = await userProfileService.updateProfile({ name, phone });
      setProfile(response.data);
      alert('Profile updated successfully');
    } catch (err) {
      alert('Failed to update profile');
    }
  };

  const handleAddAddress = async (addressData: any) => {
    try {
      await userProfileService.addAddress(addressData);
      loadAddresses(); // Reload addresses
      alert('Address added successfully');
    } catch (err) {
      alert('Failed to add address');
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      await userProfileService.deleteAddress(addressId);
      loadAddresses(); // Reload addresses
      alert('Address deleted successfully');
    } catch (err) {
      alert('Failed to delete address');
    }
  };

  const handleAddToWishlist = async (productId: string) => {
    try {
      await userProfileService.addToWishlist(productId, 'gifting');
      alert('Added to wishlist');
    } catch (err) {
      alert('Failed to add to wishlist');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {profile && (
        <div>
          <h2>{profile.name}</h2>
          <p>Phone: {profile.phone}</p>
          {profile.avatar && <img src={profile.avatar} alt="Avatar" />}
        </div>
      )}

      <div>
        <h3>Addresses</h3>
        {addresses.map((addr) => (
          <div key={addr._id}>
            <p>{addr.label}: {addr.line1}, {addr.city}</p>
            <button onClick={() => handleDeleteAddress(addr._id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Error Handling

```typescript
import userProfileService from '@/services/user-profile.service';

try {
  const response = await userProfileService.getProfile();
  console.log(response.data);
} catch (error: any) {
  if (error.response?.status === 401) {
    console.error('Unauthorized - Please login');
  } else if (error.response?.status === 404) {
    console.error('Profile not found');
  } else if (error.response?.status === 409) {
    console.error('Conflict - Product already in wishlist');
  } else if (error.response?.status === 500) {
    console.error('Server error');
  } else {
    console.error('Error:', error.message);
  }
}
```

---

## Backend Field Mapping

### Profile Model Fields
```typescript
{
  userId: string,           // From auth-service
  name?: string,
  phone?: string,
  avatar?: string,
  dateOfBirth?: Date,
  gender?: 'male' | 'female' | 'other',
  preferences?: {
    notifications?: boolean,
    newsletter?: boolean,
    push?: boolean,
    whatsapp?: boolean,
    criticalAlerts?: boolean,
    quietHours?: {
      start?: string,
      end?: string
    }
  },
  wishlist?: [{
    productId: string,
    productType: 'gifting' | 'shopping' | 'printing' | 'business-printing',
    addedAt: Date
  }],
  privacyRequests?: {
    dataExportRequestedAt?: Date,
    dataExportStatus?: 'none' | 'requested' | 'processing' | 'completed',
    accountDeletionRequestedAt?: Date,
    accountDeletionStatus?: 'none' | 'requested' | 'blocked_active_orders' | 'processing' | 'completed',
    accountDeletionReason?: string
  }
}
```

### Address Model Fields
```typescript
{
  userId: string,
  label?: 'Home' | 'Office' | 'Other',
  fullName: string,
  phone: string,
  houseNo?: string,
  area?: string,
  landmark?: string,
  line1: string,
  line2?: string,
  city: string,
  state: string,
  pincode: string,
  country?: string,
  location?: {
    lat?: number,
    lng?: number
  },
  isDefault?: boolean
}
```

---

## API Response Format

सभी APIs निम्नलिखित format में response देते हैं:

```typescript
{
  success: boolean,
  message: string,
  data: T // Generic data type
}
```

---

## Authentication

सभी APIs के लिए authentication token required है। Token automatically request headers में add होता है।

```typescript
// Token automatically added by apiClient interceptor
// Authorization: Bearer <token>
```

---

## Notes

1. **Token Management**: Token automatically localStorage से manage होता है
2. **Error Handling**: Global error handling apiClient में है
3. **CORS**: Backend को CORS enable करना होगा
4. **Rate Limiting**: Backend rate limiting implement कर सकता है
5. **Validation**: Frontend validation के लिए Zod/Yup use करें
6. **Address Fields**: Backend में address fields अलग हैं (line1, line2, fullName, etc.)
7. **Wishlist**: Wishlist profile के अंदर embedded है, array of objects
8. **GPS Coordinates**: Backend में `location` object के अंदर `lat` और `lng` fields हैं

---

## Integration Checklist

- [x] Service created with all 15 APIs
- [x] TypeScript interfaces defined with backend field mapping
- [x] API endpoints configured
- [x] Error handling implemented
- [x] Authentication integrated
- [x] Backend field structure matched
- [ ] UI components creation (UI team)
- [ ] Testing (QA team)

---

## Support

किसी भी issue के लिए backend team से contact करें।
