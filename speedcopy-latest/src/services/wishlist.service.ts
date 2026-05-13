import apiClient from './api.service';
import { API_CONFIG } from '../config/api.config';

// Wishlist item interface matching backend schema
export interface WishlistItem {
  productId: string;
  productType: 'gifting' | 'shopping' | 'printing' | 'business-printing';
  addedAt: string;
  product?: {
    _id: string;
    name: string;
    image?: string;
    thumbnail?: string;
    basePrice?: number;
    discountedPrice?: number;
    sale_price?: number;
    category?: string;
  };
}

// Response interfaces
interface WishlistResponse {
  success: boolean;
  data: WishlistItem[];
  message?: string;
}

interface WishlistActionResponse {
  success: boolean;
  data: WishlistItem[];
  message: string;
}

/**
 * Wishlist Service - Handles all wishlist operations
 * Implements all 4 Wishlist APIs with fallback support
 */
class WishlistService {
  private STORAGE_KEY = 'speedcopy_wishlist';

  private isNotFoundError(error: any) {
    return error?.response?.status === 404;
  }

  private isRouteNotFoundError(error: any) {
    return this.isNotFoundError(error) && 
           error?.response?.data?.message === 'Route not found';
  }

  private wrapSuccess(data: any, message?: string) {
    return { 
      success: true, 
      data,
      ...(message && { message })
    };
  }

  // Get wishlist from localStorage
  private getLocalWishlist(): WishlistItem[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to parse local wishlist:', error);
      return [];
    }
  }

  // Save wishlist to localStorage
  private saveLocalWishlist(wishlist: WishlistItem[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(wishlist));
    } catch (error) {
      console.error('Failed to save local wishlist:', error);
    }
  }

  /**
   * 1. Get Wishlist - Saved products dekhna
   * GET /api/users/wishlist
   */
  async getWishlist(): Promise<WishlistResponse> {
    try {
      console.log('📋 Getting wishlist...');
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.WISHLIST.GET);
      console.log('✅ Wishlist response:', response.data);
      
      // Handle different response structures
      const responseData = response.data?.data || response.data;
      const wishlistData = Array.isArray(responseData) ? responseData : 
                          responseData?.wishlist || [];
      
      // Sync with localStorage
      this.saveLocalWishlist(wishlistData);
      
      return this.wrapSuccess(wishlistData);
    } catch (error) {
      console.warn('⚠️ Wishlist API failed:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      // Fallback to localStorage
      const localWishlist = this.getLocalWishlist();
      console.log('📦 Using local wishlist:', localWishlist.length, 'items');
      return this.wrapSuccess(localWishlist);
    }
  }

  /**
   * 2. Add to Wishlist - Product save karna
   * POST /api/users/wishlist
   */
  async addToWishlist(
    productId: string, 
    productType: 'gifting' | 'shopping' | 'printing' | 'business-printing' = 'gifting'
  ): Promise<WishlistActionResponse> {
    try {
      console.log('➕ Adding to wishlist:', { productId, productType });
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.WISHLIST.ADD,
        { productId, productType }
      );
      console.log('✅ Added to wishlist:', response.data);
      
      // Handle different response structures
      const responseData = response.data?.data || response.data;
      const wishlistData = Array.isArray(responseData) ? responseData : 
                          responseData?.wishlist || [];
      
      // Sync with localStorage
      this.saveLocalWishlist(wishlistData);
      
      return {
        success: true,
        data: wishlistData,
        message: response.data?.message || 'Product added to wishlist'
      };
    } catch (error) {
      console.warn('⚠️ Add to wishlist API failed:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      // Fallback to localStorage
      const localWishlist = this.getLocalWishlist();
      
      // Check if already exists
      const exists = localWishlist.some(item => item.productId === productId);
      if (exists) {
        return {
          success: true,
          data: localWishlist,
          message: 'Product already in wishlist'
        };
      }
      
      // Add new item
      const newItem: WishlistItem = {
        productId,
        productType,
        addedAt: new Date().toISOString()
      };
      
      const updatedWishlist = [...localWishlist, newItem];
      this.saveLocalWishlist(updatedWishlist);
      
      return {
        success: true,
        data: updatedWishlist,
        message: 'Product added to wishlist (offline mode)'
      };
    }
  }

  /**
   * 3. Remove from Wishlist - Ek product hatana
   * DELETE /api/users/wishlist/{productId}
   */
  async removeFromWishlist(productId: string): Promise<WishlistActionResponse> {
    try {
      console.log('➖ Removing from wishlist:', productId);
      const response = await apiClient.delete(
        API_CONFIG.ENDPOINTS.WISHLIST.REMOVE(productId)
      );
      console.log('✅ Removed from wishlist:', response.data);
      
      // Handle different response structures
      const responseData = response.data?.data || response.data;
      const wishlistData = Array.isArray(responseData) ? responseData : 
                          responseData?.wishlist || [];
      
      // Sync with localStorage
      this.saveLocalWishlist(wishlistData);
      
      return {
        success: true,
        data: wishlistData,
        message: response.data?.message || 'Product removed from wishlist'
      };
    } catch (error) {
      console.warn('⚠️ Remove from wishlist API failed:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      // Fallback to localStorage
      const localWishlist = this.getLocalWishlist();
      const updatedWishlist = localWishlist.filter(item => item.productId !== productId);
      this.saveLocalWishlist(updatedWishlist);
      
      return {
        success: true,
        data: updatedWishlist,
        message: 'Product removed from wishlist (offline mode)'
      };
    }
  }

  /**
   * 4. Clear Wishlist - Puri wishlist khali karna
   * DELETE /api/users/wishlist
   */
  async clearWishlist(): Promise<WishlistActionResponse> {
    try {
      console.log('🗑️ Clearing wishlist...');
      const response = await apiClient.delete(
        API_CONFIG.ENDPOINTS.WISHLIST.CLEAR
      );
      console.log('✅ Wishlist cleared:', response.data);
      
      // Clear localStorage
      this.saveLocalWishlist([]);
      
      return {
        success: true,
        data: [],
        message: response.data?.message || 'Wishlist cleared successfully'
      };
    } catch (error) {
      console.warn('⚠️ Clear wishlist API failed:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      // Fallback to localStorage
      this.saveLocalWishlist([]);
      
      return {
        success: true,
        data: [],
        message: 'Wishlist cleared (offline mode)'
      };
    }
  }

  // Utility methods
  
  /**
   * Check if product is in wishlist
   */
  async isInWishlist(productId: string): Promise<boolean> {
    try {
      const wishlist = await this.getWishlist();
      return wishlist.data.some(item => item.productId === productId);
    } catch (error) {
      console.error('Failed to check wishlist status:', error);
      return false;
    }
  }

  /**
   * Toggle wishlist status (add if not present, remove if present)
   */
  async toggleWishlist(
    productId: string,
    productType: 'gifting' | 'shopping' | 'printing' | 'business-printing' = 'gifting'
  ): Promise<{ success: boolean; isInWishlist: boolean; message: string }> {
    try {
      const isInWishlist = await this.isInWishlist(productId);
      
      if (isInWishlist) {
        const response = await this.removeFromWishlist(productId);
        return {
          success: response.success,
          isInWishlist: false,
          message: response.message
        };
      } else {
        const response = await this.addToWishlist(productId, productType);
        return {
          success: response.success,
          isInWishlist: true,
          message: response.message
        };
      }
    } catch (error: any) {
      console.error('Failed to toggle wishlist:', error);
      throw new Error(error?.message || 'Failed to update wishlist');
    }
  }

  /**
   * Get wishlist count
   */
  async getWishlistCount(): Promise<number> {
    try {
      const wishlist = await this.getWishlist();
      return wishlist.data.length;
    } catch (error) {
      console.error('Failed to get wishlist count:', error);
      return 0;
    }
  }

  /**
   * Get wishlist items by product type
   */
  async getWishlistByType(
    productType: 'gifting' | 'shopping' | 'printing' | 'business-printing'
  ): Promise<WishlistItem[]> {
    try {
      const wishlist = await this.getWishlist();
      return wishlist.data.filter(item => item.productType === productType);
    } catch (error) {
      console.error('Failed to get wishlist by type:', error);
      return [];
    }
  }

  /**
   * Sync local wishlist with server (useful after login)
   */
  async syncWishlist(): Promise<void> {
    try {
      const localWishlist = this.getLocalWishlist();
      
      if (localWishlist.length === 0) {
        return;
      }
      
      console.log('🔄 Syncing local wishlist with server...');
      
      // Get server wishlist
      const serverWishlist = await this.getWishlist();
      const serverProductIds = new Set(serverWishlist.data.map(item => item.productId));
      
      // Add local items that are not on server
      for (const item of localWishlist) {
        if (!serverProductIds.has(item.productId)) {
          await this.addToWishlist(item.productId, item.productType);
        }
      }
      
      console.log('✅ Wishlist synced successfully');
    } catch (error) {
      console.error('Failed to sync wishlist:', error);
    }
  }
}

export default new WishlistService();