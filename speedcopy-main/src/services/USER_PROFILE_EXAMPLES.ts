/**
 * User Profile & Account API - Implementation Examples
 * 
 * यह file में सभी 15 APIs के practical examples दिए गए हैं।
 * इन्हें अपने components में use कर सकते हो।
 */

import userProfileService from './user-profile.service';
import type { 
  UpdateProfileData, 
  NotificationPreferences 
} from './user-profile.service';

// ============================================================================
// PROFILE MANAGEMENT EXAMPLES
// ============================================================================

/**
 * Example 1: Get User Profile
 */
export async function exampleGetProfile() {
  try {
    const response = await userProfileService.getProfile();
    console.log('Profile:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Failed to get profile:', error.response?.data?.message);
    throw error;
  }
}

/**
 * Example 2: Update User Profile
 */
export async function exampleUpdateProfile() {
  try {
    const updateData: UpdateProfileData = {
      name: 'Jane Doe',
      phone: '+91-9876543211',
      dateOfBirth: '1992-05-15',
      gender: 'female',
    };

    const response = await userProfileService.updateProfile(updateData);
    console.log('Profile updated:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Failed to update profile:', error.response?.data?.message);
    throw error;
  }
}

/**
 * Example 3: Upload Avatar
 */
export async function exampleUploadAvatar(file: File) {
  try {
    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds 5MB limit');
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only JPG, PNG, GIF, WebP allowed');
    }

    const response = await userProfileService.uploadAvatar(file);
    console.log('Avatar uploaded:', response.data.avatar);
    return response.data;
  } catch (error: any) {
    console.error('Failed to upload avatar:', error.message);
    throw error;
  }
}

/**
 * Example 4: Update Notification Preferences
 */
export async function exampleUpdateNotifications() {
  try {
    const preferences: NotificationPreferences = {
      notifications: true,
      newsletter: false,
      push: true,
      whatsapp: true,
      criticalAlerts: true,
      quietHours: {
        start: '22:00',
        end: '08:00',
      },
    };

    const response = await userProfileService.updateNotificationPreferences(preferences);
    console.log('Notifications updated:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Failed to update notifications:', error.response?.data?.message);
    throw error;
  }
}

/**
 * Example 5: Request Data Export (GDPR)
 */
export async function exampleRequestDataExport() {
  try {
    const response = await userProfileService.requestDataExport({
      reason: 'Moving to another platform',
    });

    console.log('Data export requested:', response.data.privacyRequests);
    console.log('Status:', response.data.privacyRequests?.dataExportStatus);
    return response.data;
  } catch (error: any) {
    console.error('Failed to request data export:', error.response?.data?.message);
    throw error;
  }
}

/**
 * Example 6: Request Account Deletion
 */
export async function exampleRequestAccountDeletion() {
  try {
    const response = await userProfileService.requestAccountDeletion({
      reason: 'Not using the service anymore',
    });

    console.log('Account deletion requested:', response.data.privacyRequests);
    const status = response.data.privacyRequests?.accountDeletionStatus;

    if (status === 'blocked_active_orders') {
      console.warn('Account deletion blocked: You have active orders');
    } else if (status === 'requested') {
      console.log('Account will be deleted in 7 days');
    }

    return response.data;
  } catch (error: any) {
    console.error('Failed to request account deletion:', error.response?.data?.message);
    throw error;
  }
}

// ============================================================================
// ADDRESS MANAGEMENT EXAMPLES
// ============================================================================

/**
 * Example 7: Get All Addresses
 */
export async function exampleGetAllAddresses() {
  try {
    const response = await userProfileService.getAllAddresses();
    console.log('Addresses:', response.data);

    // Find default address
    const defaultAddress = response.data.find((addr) => addr.isDefault);
    console.log('Default address:', defaultAddress);

    return response.data;
  } catch (error: any) {
    console.error('Failed to get addresses:', error.response?.data?.message);
    throw error;
  }
}

/**
 * Example 8: Add New Address
 */
export async function exampleAddAddress() {
  try {
    const newAddress = {
      label: 'Office' as const,
      fullName: 'John Doe',
      phone: '+91-9876543210',
      houseNo: '456',
      area: 'Business District',
      landmark: 'Near Shopping Mall',
      line1: '456 Business Avenue',
      line2: 'Suite 100',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      country: 'India',
      isDefault: false,
    };

    const response = await userProfileService.addAddress(newAddress);
    console.log('Address added:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Failed to add address:', error.response?.data?.message);
    throw error;
  }
}

/**
 * Example 9: Update Address
 */
export async function exampleUpdateAddress(addressId: string) {
  try {
    const updateData = {
      fullName: 'Jane Doe',
      phone: '+91-9876543211',
      line1: '789 New Street',
    };

    const response = await userProfileService.updateAddress(addressId, updateData);
    console.log('Address updated:', response.data);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.error('Address not found');
    } else {
      console.error('Failed to update address:', error.response?.data?.message);
    }
    throw error;
  }
}

/**
 * Example 10: Update GPS Location
 */
export async function exampleUpdateGPSLocation(addressId: string) {
  try {
    // Get current location from browser
    const position = await new Promise<GeolocationCoordinates>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        (err) => reject(err)
      );
    });

    const response = await userProfileService.updateGPSLocation(addressId, {
      lat: position.latitude,
      lng: position.longitude,
    });

    console.log('GPS location updated:', response.data.location);
    return response.data;
  } catch (error: any) {
    console.error('Failed to update GPS location:', error.message);
    throw error;
  }
}

/**
 * Example 11: Delete Address
 */
export async function exampleDeleteAddress(addressId: string) {
  try {
    const response = await userProfileService.deleteAddress(addressId);
    console.log('Address deleted successfully');
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.error('Address not found');
    } else {
      console.error('Failed to delete address:', error.response?.data?.message);
    }
    throw error;
  }
}

// ============================================================================
// WISHLIST EXAMPLES
// ============================================================================

/**
 * Example 12: Get Wishlist
 */
export async function exampleGetWishlist() {
  try {
    const response = await userProfileService.getWishlist();
    console.log('Wishlist items:', response.data);
    console.log('Total items:', response.data.length);
    return response.data;
  } catch (error: any) {
    console.error('Failed to get wishlist:', error.response?.data?.message);
    throw error;
  }
}

/**
 * Example 13: Add to Wishlist
 */
export async function exampleAddToWishlist(productId: string, productType?: string) {
  try {
    const response = await userProfileService.addToWishlist(
      productId,
      (productType as any) || 'gifting'
    );

    console.log('Product added to wishlist');
    console.log('Total items in wishlist:', response.data.length);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 409) {
      console.warn('Product already in wishlist');
    } else {
      console.error('Failed to add to wishlist:', error.response?.data?.message);
    }
    throw error;
  }
}

/**
 * Example 14: Remove from Wishlist
 */
export async function exampleRemoveFromWishlist(productId: string) {
  try {
    const response = await userProfileService.removeFromWishlist(productId);
    console.log('Product removed from wishlist');
    console.log('Total items in wishlist:', response.data.length);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.error('Product not found in wishlist');
    } else {
      console.error('Failed to remove from wishlist:', error.response?.data?.message);
    }
    throw error;
  }
}

/**
 * Example 15: Clear Wishlist
 */
export async function exampleClearWishlist() {
  try {
    // Confirm before clearing
    const confirmed = window.confirm('Are you sure you want to clear your entire wishlist?');
    if (!confirmed) {
      console.log('Wishlist clear cancelled');
      return;
    }

    const response = await userProfileService.clearWishlist();
    console.log('Wishlist cleared successfully');
    return response.data;
  } catch (error: any) {
    console.error('Failed to clear wishlist:', error.response?.data?.message);
    throw error;
  }
}

// ============================================================================
// ADVANCED EXAMPLES
// ============================================================================

/**
 * Example: Complete Profile Setup
 */
export async function exampleCompleteProfileSetup(
  profileData: UpdateProfileData,
  avatarFile: File,
  addressData: any
) {
  try {
    console.log('Starting complete profile setup...');

    // Step 1: Update profile
    console.log('Step 1: Updating profile...');
    await userProfileService.updateProfile(profileData);

    // Step 2: Upload avatar
    console.log('Step 2: Uploading avatar...');
    await userProfileService.uploadAvatar(avatarFile);

    // Step 3: Add address
    console.log('Step 3: Adding address...');
    await userProfileService.addAddress(addressData);

    // Step 4: Update notifications
    console.log('Step 4: Updating notification preferences...');
    await userProfileService.updateNotificationPreferences({
      notifications: true,
      push: true,
      whatsapp: true,
    });

    console.log('Profile setup completed successfully!');
  } catch (error: any) {
    console.error('Profile setup failed:', error.message);
    throw error;
  }
}

/**
 * Example: Batch Add Multiple Addresses
 */
export async function exampleBatchAddAddresses(addresses: any[]) {
  try {
    const results = [];

    for (let i = 0; i < addresses.length; i++) {
      console.log(`Adding address ${i + 1} of ${addresses.length}...`);
      const response = await userProfileService.addAddress(addresses[i]);
      results.push(response.data);

      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(`Successfully added ${results.length} addresses`);
    return results;
  } catch (error: any) {
    console.error('Batch add addresses failed:', error.message);
    throw error;
  }
}

/**
 * Example: Search Wishlist
 */
export async function exampleSearchWishlist(searchProductId: string) {
  try {
    const wishlist = await userProfileService.getWishlist();
    const found = wishlist.data.find((item) => item.productId === searchProductId);

    if (found) {
      console.log('Product found in wishlist:', found);
      return found;
    } else {
      console.log('Product not in wishlist');
      return null;
    }
  } catch (error: any) {
    console.error('Search failed:', error.message);
    throw error;
  }
}

/**
 * Example: Get Default Address
 */
export async function exampleGetDefaultAddress() {
  try {
    const addresses = await userProfileService.getAllAddresses();
    const defaultAddress = addresses.data.find((addr) => addr.isDefault);

    if (defaultAddress) {
      console.log('Default address:', defaultAddress);
      return defaultAddress;
    } else {
      console.log('No default address set');
      return null;
    }
  } catch (error: any) {
    console.error('Failed to get default address:', error.message);
    throw error;
  }
}

/**
 * Example: Set Address as Default
 */
export async function exampleSetAddressAsDefault(addressId: string) {
  try {
    const response = await userProfileService.updateAddress(addressId, {
      isDefault: true,
    });

    console.log('Address set as default:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Failed to set address as default:', error.message);
    throw error;
  }
}

/**
 * Example: Export User Data
 */
export async function exampleExportUserData() {
  try {
    console.log('Requesting data export...');

    const response = await userProfileService.requestDataExport({
      reason: 'User requested data export',
    });

    const status = response.data.privacyRequests?.dataExportStatus;
    console.log('Export status:', status);

    if (status === 'requested') {
      console.log('Your data export has been requested. You will receive an email with download link soon.');
    } else if (status === 'processing') {
      console.log('Your data is being processed. Please wait...');
    } else if (status === 'completed') {
      console.log('Your data export is ready for download!');
    }

    return response.data;
  } catch (error: any) {
    console.error('Failed to export data:', error.message);
    throw error;
  }
}

/**
 * Example: Delete Account with Confirmation
 */
export async function exampleDeleteAccountWithConfirmation() {
  try {
    // Step 1: Show confirmation dialog
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );

    if (!confirmed) {
      console.log('Account deletion cancelled');
      return;
    }

    // Step 2: Request deletion
    console.log('Requesting account deletion...');
    const response = await userProfileService.requestAccountDeletion({
      reason: 'User requested account deletion',
    });

    const status = response.data.privacyRequests?.accountDeletionStatus;

    if (status === 'blocked_active_orders') {
      console.error('Cannot delete account: You have active orders. Please complete or cancel them first.');
    } else if (status === 'requested') {
      console.log('Your account deletion has been requested.');
      console.log('Your account will be permanently deleted in 7 days.');
      console.log('You can cancel this request by logging in within 7 days.');
    }

    return response.data;
  } catch (error: any) {
    console.error('Failed to delete account:', error.message);
    throw error;
  }
}
