import apiClient from './api.service';
import { API_CONFIG } from '../config/api.config';

// ============================================================================
// PROFILE MANAGEMENT INTERFACES
// ============================================================================

export interface UserProfile {
  _id?: string;
  userId: string;
  name?: string;
  phone?: string;
  avatar?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  preferences?: {
    notifications?: boolean;
    newsletter?: boolean;
    push?: boolean;
    whatsapp?: boolean;
    criticalAlerts?: boolean;
    quietHours?: {
      start?: string;
      end?: string;
    };
  };
  wishlist?: WishlistItem[];
  privacyRequests?: {
    dataExportRequestedAt?: string;
    dataExportStatus?: 'none' | 'requested' | 'processing' | 'completed';
    accountDeletionRequestedAt?: string;
    accountDeletionStatus?: 'none' | 'requested' | 'blocked_active_orders' | 'processing' | 'completed';
    accountDeletionReason?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfileData {
  name?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
}

export interface NotificationPreferences {
  notifications?: boolean;
  newsletter?: boolean;
  push?: boolean;
  whatsapp?: boolean;
  criticalAlerts?: boolean;
  quietHours?: {
    start?: string;
    end?: string;
  };
}

export interface DataExportRequest {
  reason?: string;
}

export interface AccountDeletionRequest {
  reason?: string;
}

// ============================================================================
// ADDRESS MANAGEMENT INTERFACES
// ============================================================================

export interface Address {
  _id: string;
  userId: string;
  label?: 'Home' | 'Office' | 'Other';
  fullName: string;
  phone: string;
  houseNo?: string;
  area?: string;
  landmark?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  location?: {
    lat?: number;
    lng?: number;
  };
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAddressData {
  label?: 'Home' | 'Office' | 'Other';
  fullName: string;
  phone: string;
  houseNo?: string;
  area?: string;
  landmark?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  isDefault?: boolean;
}

export interface UpdateAddressData extends Partial<CreateAddressData> {}

export interface GPSCoordinates {
  lat?: number;
  lng?: number;
}

// ============================================================================
// WISHLIST INTERFACES
// ============================================================================

export interface WishlistItem {
  productId: string;
  productType?: 'gifting' | 'shopping' | 'printing' | 'business-printing';
  addedAt?: string;
}

// ============================================================================
// API RESPONSE INTERFACES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ============================================================================
// USER PROFILE SERVICE CLASS
// ============================================================================

class UserProfileService {
  // ========================================================================
  // PROFILE MANAGEMENT METHODS
  // ========================================================================

  /**
   * Get user profile details
   * @returns User profile information
   */
  async getProfile(): Promise<ApiResponse<UserProfile>> {
    const response = await apiClient.get<ApiResponse<UserProfile>>(
      `${API_CONFIG.ENDPOINTS.USER.PROFILE}`
    );
    return response.data;
  }

  /**
   * Update user profile (name, phone, dateOfBirth, gender)
   * @param data Profile update data
   * @returns Updated profile
   */
  async updateProfile(data: UpdateProfileData): Promise<ApiResponse<UserProfile>> {
    const response = await apiClient.put<ApiResponse<UserProfile>>(
      `${API_CONFIG.ENDPOINTS.USER.PROFILE}`,
      data
    );
    return response.data;
  }

  /**
   * Upload user avatar/profile picture
   * @param file Image file to upload
   * @returns Updated profile with new avatar URL
   */
  async uploadAvatar(file: File): Promise<ApiResponse<UserProfile>> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await apiClient.post<ApiResponse<UserProfile>>(
      `${API_CONFIG.ENDPOINTS.USER.PROFILE}/avatar`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  /**
   * Update notification preferences
   * @param preferences Notification settings
   * @returns Updated profile
   */
  async updateNotificationPreferences(
    preferences: NotificationPreferences
  ): Promise<ApiResponse<UserProfile>> {
    const response = await apiClient.patch<ApiResponse<UserProfile>>(
      `${API_CONFIG.ENDPOINTS.USER.PROFILE}/notifications`,
      preferences
    );
    return response.data;
  }

  /**
   * Request data export (GDPR compliance)
   * @param request Export request details
   * @returns Export request confirmation
   */
  async requestDataExport(
    request?: DataExportRequest
  ): Promise<ApiResponse<UserProfile>> {
    const response = await apiClient.post<ApiResponse<UserProfile>>(
      `${API_CONFIG.ENDPOINTS.USER.PROFILE}/data-export-request`,
      request || {}
    );
    return response.data;
  }

  /**
   * Request account deletion
   * @param request Deletion request with optional reason
   * @returns Updated profile with deletion request status
   */
  async requestAccountDeletion(
    request?: AccountDeletionRequest
  ): Promise<ApiResponse<UserProfile>> {
    const response = await apiClient.post<ApiResponse<UserProfile>>(
      `${API_CONFIG.ENDPOINTS.USER.PROFILE}/account-deletion-request`,
      request || {}
    );
    return response.data;
  }

  // ========================================================================
  // ADDRESS MANAGEMENT METHODS
  // ========================================================================

  /**
   * Get all saved addresses
   * @returns List of user addresses
   */
  async getAllAddresses(): Promise<ApiResponse<Address[]>> {
    const response = await apiClient.get<ApiResponse<Address[]>>(
      `${API_CONFIG.ENDPOINTS.USER.ADDRESSES}`
    );
    return response.data;
  }

  /**
   * Add a new delivery address
   * @param data Address details
   * @returns Created address
   */
  async addAddress(data: CreateAddressData): Promise<ApiResponse<Address>> {
    const response = await apiClient.post<ApiResponse<Address>>(
      `${API_CONFIG.ENDPOINTS.USER.ADDRESSES}`,
      data
    );
    return response.data;
  }

  /**
   * Update an existing address
   * @param addressId Address ID to update
   * @param data Updated address data
   * @returns Updated address
   */
  async updateAddress(
    addressId: string,
    data: UpdateAddressData
  ): Promise<ApiResponse<Address>> {
    const response = await apiClient.put<ApiResponse<Address>>(
      `${API_CONFIG.ENDPOINTS.USER.ADDRESSES}/${addressId}`,
      data
    );
    return response.data;
  }

  /**
   * Update GPS coordinates for an address
   * @param addressId Address ID to update
   * @param coordinates GPS coordinates (lat, lng)
   * @returns Updated address
   */
  async updateGPSLocation(
    addressId: string,
    coordinates: GPSCoordinates
  ): Promise<ApiResponse<Address>> {
    const response = await apiClient.put<ApiResponse<Address>>(
      `${API_CONFIG.ENDPOINTS.USER.ADDRESSES}/${addressId}`,
      { location: coordinates }
    );
    return response.data;
  }

  /**
   * Delete an address
   * @param addressId Address ID to delete
   * @returns Deletion confirmation
   */
  async deleteAddress(addressId: string): Promise<ApiResponse<null>> {
    const response = await apiClient.delete<ApiResponse<null>>(
      `${API_CONFIG.ENDPOINTS.USER.ADDRESSES}/${addressId}`
    );
    return response.data;
  }

  // ========================================================================
  // WISHLIST METHODS
  // ========================================================================

  /**
   * Get user's wishlist
   * @returns Array of wishlist items
   */
  async getWishlist(): Promise<ApiResponse<WishlistItem[]>> {
    const response = await apiClient.get<ApiResponse<WishlistItem[]>>(
      `${API_CONFIG.ENDPOINTS.WISHLIST.GET}`
    );
    return response.data;
  }

  /**
   * Add product to wishlist
   * @param productId Product ID to add
   * @param productType Optional product type (gifting, shopping, printing, business-printing)
   * @returns Updated wishlist
   */
  async addToWishlist(
    productId: string,
    productType?: 'gifting' | 'shopping' | 'printing' | 'business-printing'
  ): Promise<ApiResponse<WishlistItem[]>> {
    const response = await apiClient.post<ApiResponse<WishlistItem[]>>(
      `${API_CONFIG.ENDPOINTS.WISHLIST.ADD}`,
      { productId, productType: productType || 'gifting' }
    );
    return response.data;
  }

  /**
   * Remove product from wishlist
   * @param productId Product ID to remove
   * @returns Updated wishlist
   */
  async removeFromWishlist(productId: string): Promise<ApiResponse<WishlistItem[]>> {
    const response = await apiClient.delete<ApiResponse<WishlistItem[]>>(
      `${API_CONFIG.ENDPOINTS.WISHLIST.REMOVE(productId)}`
    );
    return response.data;
  }

  /**
   * Clear entire wishlist
   * @returns Empty wishlist confirmation
   */
  async clearWishlist(): Promise<ApiResponse<WishlistItem[]>> {
    const response = await apiClient.delete<ApiResponse<WishlistItem[]>>(
      `${API_CONFIG.ENDPOINTS.WISHLIST.CLEAR}`
    );
    return response.data;
  }
}

export default new UserProfileService();
