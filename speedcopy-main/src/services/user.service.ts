import apiClient from './api.service';
import { API_CONFIG } from '../config/api.config';

// Profile interfaces matching backend schema
export interface UserProfile {
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
  wishlist?: Array<{
    productId: string;
    productType: 'gifting' | 'shopping' | 'printing' | 'business-printing';
    addedAt: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateProfileData {
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
}

// Address interfaces matching backend schema
export interface Address {
  _id: string;
  userId: string;
  label: 'Home' | 'Office' | 'Other';
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
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AddressData {
  label: 'Home' | 'Office' | 'Other';
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
}

class UserService {
  // Get user profile
  async getProfile(): Promise<{ success: boolean; data: UserProfile }> {
    const response = await apiClient.get(API_CONFIG.ENDPOINTS.USER.PROFILE);
    return response.data;
  }

  // Update user profile
  async updateProfile(data: UpdateProfileData): Promise<{ success: boolean; data: UserProfile; message: string }> {
    const response = await apiClient.put(
      API_CONFIG.ENDPOINTS.USER.PROFILE,
      data
    );
    return response.data;
  }

  // Get user addresses
  async getAddresses(): Promise<{ success: boolean; data: Address[] }> {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.USER.ADDRESSES);
      return response.data;
    } catch (error: any) {
      // If /api/users/addresses fails, try alternative endpoint
      if (error.response?.status === 400 || error.response?.status === 404) {
        console.warn('Primary addresses endpoint failed, trying alternative...');
        try {
          const altResponse = await apiClient.get('/api/user/addresses');
          return altResponse.data;
        } catch (altError) {
          console.error('Alternative addresses endpoint also failed');
          // Return empty array instead of throwing
          return { success: false, data: [] };
        }
      }
      throw error;
    }
  }

  // Add new address
  async addAddress(data: AddressData): Promise<{ success: boolean; data: Address; message: string }> {
    const response = await apiClient.post(
      API_CONFIG.ENDPOINTS.USER.ADDRESSES,
      data
    );
    return response.data;
  }

  // Update address
  async updateAddress(addressId: string, data: Partial<AddressData>): Promise<{ success: boolean; data: Address; message: string }> {
    const response = await apiClient.put(
      `${API_CONFIG.ENDPOINTS.USER.ADDRESSES}/${addressId}`,
      data
    );
    return response.data;
  }

  // Delete address
  async deleteAddress(addressId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(
      `${API_CONFIG.ENDPOINTS.USER.ADDRESSES}/${addressId}`
    );
    return response.data;
  }

  // Update notification preferences
  async updateNotificationPreferences(preferences: UpdateProfileData['preferences']): Promise<{ success: boolean; data: UserProfile; message: string }> {
    const response = await apiClient.patch(
      `${API_CONFIG.ENDPOINTS.USER.PROFILE}/preferences`,
      { preferences }
    );
    return response.data;
  }

  // Get wishlist
  async getWishlist(): Promise<{ success: boolean; data: UserProfile['wishlist'] }> {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.WISHLIST.GET);
      
      // Handle different response structures
      const responseData = response.data?.data || response.data;
      const wishlistData = Array.isArray(responseData) ? responseData : 
                          responseData?.wishlist || [];
      
      return {
        success: true,
        data: wishlistData
      };
    } catch (error) {
      console.warn('Wishlist API failed, using fallback');
      
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem('speedcopy_wishlist');
        const localWishlist = stored ? JSON.parse(stored) : [];
        return {
          success: true,
          data: localWishlist
        };
      } catch (fallbackError) {
        return {
          success: true,
          data: []
        };
      }
    }
  }

  // Add to wishlist
  async addToWishlist(productId: string, productType: 'gifting' | 'shopping' | 'printing' | 'business-printing' = 'gifting'): Promise<{ success: boolean; data: UserProfile['wishlist']; message: string }> {
    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.WISHLIST.ADD,
        { productId, productType }
      );
      
      // Handle different response structures
      const responseData = response.data?.data || response.data;
      const wishlistData = Array.isArray(responseData) ? responseData : 
                          responseData?.wishlist || [];
      
      // Sync with localStorage
      localStorage.setItem('speedcopy_wishlist', JSON.stringify(wishlistData));
      
      return {
        success: true,
        data: wishlistData,
        message: response.data?.message || 'Product added to wishlist'
      };
    } catch (error) {
      console.warn('Add to wishlist API failed, using fallback');
      
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem('speedcopy_wishlist');
        const localWishlist = stored ? JSON.parse(stored) : [];
        
        // Check if already exists
        const exists = localWishlist.some((item: any) => item.productId === productId);
        if (!exists) {
          const newItem = {
            productId,
            productType,
            addedAt: new Date().toISOString()
          };
          localWishlist.push(newItem);
          localStorage.setItem('speedcopy_wishlist', JSON.stringify(localWishlist));
        }
        
        return {
          success: true,
          data: localWishlist,
          message: 'Product added to wishlist (offline mode)'
        };
      } catch (fallbackError) {
        throw error;
      }
    }
  }

  // Remove from wishlist
  async removeFromWishlist(productId: string): Promise<{ success: boolean; data: UserProfile['wishlist']; message: string }> {
    try {
      const response = await apiClient.delete(
        API_CONFIG.ENDPOINTS.WISHLIST.REMOVE(productId)
      );
      
      // Handle different response structures
      const responseData = response.data?.data || response.data;
      const wishlistData = Array.isArray(responseData) ? responseData : 
                          responseData?.wishlist || [];
      
      // Sync with localStorage
      localStorage.setItem('speedcopy_wishlist', JSON.stringify(wishlistData));
      
      return {
        success: true,
        data: wishlistData,
        message: response.data?.message || 'Product removed from wishlist'
      };
    } catch (error) {
      console.warn('Remove from wishlist API failed, using fallback');
      
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem('speedcopy_wishlist');
        const localWishlist = stored ? JSON.parse(stored) : [];
        const updatedWishlist = localWishlist.filter((item: any) => item.productId !== productId);
        localStorage.setItem('speedcopy_wishlist', JSON.stringify(updatedWishlist));
        
        return {
          success: true,
          data: updatedWishlist,
          message: 'Product removed from wishlist (offline mode)'
        };
      } catch (fallbackError) {
        throw error;
      }
    }
  }

  // Clear wishlist
  async clearWishlist(): Promise<{ success: boolean; data: []; message: string }> {
    try {
      const response = await apiClient.delete(
        API_CONFIG.ENDPOINTS.WISHLIST.CLEAR
      );
      
      // Clear localStorage
      localStorage.setItem('speedcopy_wishlist', JSON.stringify([]));
      
      return {
        success: true,
        data: [],
        message: response.data?.message || 'Wishlist cleared successfully'
      };
    } catch (error) {
      console.warn('Clear wishlist API failed, using fallback');
      
      // Fallback to localStorage
      localStorage.setItem('speedcopy_wishlist', JSON.stringify([]));
      
      return {
        success: true,
        data: [],
        message: 'Wishlist cleared (offline mode)'
      };
    }
  }

  // Upload avatar
  async uploadAvatar(file: File): Promise<{ success: boolean; data: UserProfile; message: string }> {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await apiClient.post(
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

  // Request data export (GDPR)
  async requestDataExport(): Promise<{ success: boolean; data: any; message: string }> {
    const response = await apiClient.post(
      `${API_CONFIG.ENDPOINTS.USER.PROFILE}/data-export`
    );
    return response.data;
  }

  // Request account deletion (GDPR)
  async requestAccountDeletion(reason?: string): Promise<{ success: boolean; data: any; message: string }> {
    const response = await apiClient.post(
      `${API_CONFIG.ENDPOINTS.USER.PROFILE}/account-deletion`,
      { reason }
    );
    return response.data;
  }
}

export default new UserService();
