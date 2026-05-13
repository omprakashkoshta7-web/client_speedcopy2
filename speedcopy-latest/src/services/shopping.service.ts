import apiClient from './api.service';
import { API_CONFIG } from '../config/api.config';

// ============================================================================
// TYPESCRIPT INTERFACES - Matching Backend Models Exactly
// ============================================================================

export interface ShoppingCategory {
  _id: string;
  name: string;
  slug: string;
  image: string;
  description: string;
  starting_from: number | null;
  section: string;
  sort_order: number;
  is_active: boolean;
}

export interface ShoppingSubcategory {
  _id: string;
  name: string;
  slug: string;
}

export interface ShoppingVariant {
  index: number;
  size: string;
  size_label: string;
  paper_type: string;
  cover_color: string;
  cover_color_name: string;
  stock: number;
  additional_price: number;
}

export interface ProductSpecs {
  paper_weight: string;
  page_count: string;
  cover_material: string;
  binding: string;
  extras: string;
  features: string[];
}

export interface ShoppingProductCard {
  _id: string;
  name: string;
  slug: string;
  thumbnail: string;
  mrp: number;
  sale_price: number;
  discount_pct: number;
  badge: string | null;
  in_stock: boolean;
  brand: string;
  highlights: string[];
  category: ShoppingCategory | null;
  subcategory: ShoppingSubcategory | null;
}

export interface ShoppingProductDetail {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  category: ShoppingCategory | null;
  subcategory: ShoppingSubcategory | null;
  brand: string;
  description: string;
  highlights: string[];
  mrp: number;
  sale_price: number;
  discount_pct: number;
  bulk_price: number | null;
  min_bulk_qty: number | null;
  badge: string | null;
  is_deal_of_day: boolean;
  deal_expires_at: string | null;
  variants: ShoppingVariant[];
  specs: ProductSpecs;
  images: string[];
  thumbnail: string;
  is_active: boolean;
  is_featured: boolean;
  free_shipping: boolean;
  in_stock: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShoppingBanner {
  _id: string;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  image: string;
  bg_color: string;
  placement: string;
  section: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealOfDay extends ShoppingProductDetail {
  time_remaining_seconds: number;
}

export interface ShoppingHomeData {
  banners: ShoppingBanner[];
  categories: ShoppingCategory[];
  deal_of_day: DealOfDay | null;
  trending_products: ShoppingProductCard[];
  featured_products: ShoppingProductCard[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ShoppingProductsResponse {
  products: ShoppingProductCard[];
  meta: PaginationMeta;
}

export interface ShoppingListQuery {
  category?: string;
  subcategory?: string;
  badge?: string;
  min_price?: number;
  max_price?: number;
  sort?: 'price_asc' | 'price_desc' | 'default';
  page?: number;
  limit?: number;
}

export interface ShoppingSearchQuery extends ShoppingListQuery {
  q: string;
}

// ============================================================================
// API RESPONSE WRAPPER
// ============================================================================

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ============================================================================
// SHOPPING SERVICE - 7 APIs
// ============================================================================

class ShoppingService {
  // ========================================
  // 1. GET HOME DATA
  // ========================================
  async getHome(): Promise<ApiResponse<ShoppingHomeData>> {
    try {
      console.log('🚀 [Shopping Service] Fetching home data...');
      const response = await apiClient.get<ApiResponse<ShoppingHomeData>>(
        API_CONFIG.ENDPOINTS.PRODUCTS.SHOPPING.HOME
      );
      console.log('✅ [Shopping Service] Home data fetched:', response.data);
      
      // Cache home data
      localStorage.setItem('shopping_home_data', JSON.stringify(response.data));
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [Shopping Service] Failed to fetch home data:', error);
      
      // Fallback to localStorage
      const cachedData = localStorage.getItem('shopping_home_data');
      if (cachedData) {
        console.log('⚠️ [Shopping Service] Using cached home data');
        return JSON.parse(cachedData);
      }
      
      throw error;
    }
  }

  // ========================================
  // 2. GET CATEGORIES
  // ========================================
  async getCategories(): Promise<ApiResponse<ShoppingCategory[]>> {
    try {
      console.log('🚀 [Shopping Service] Fetching categories...');
      const response = await apiClient.get<ApiResponse<ShoppingCategory[]>>(
        API_CONFIG.ENDPOINTS.PRODUCTS.SHOPPING.CATEGORIES
      );
      console.log('✅ [Shopping Service] Categories fetched:', response.data);
      
      // Cache categories
      localStorage.setItem('shopping_categories', JSON.stringify(response.data));
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [Shopping Service] Failed to fetch categories:', error);
      
      // Fallback to localStorage
      const cachedData = localStorage.getItem('shopping_categories');
      if (cachedData) {
        console.log('⚠️ [Shopping Service] Using cached categories');
        return JSON.parse(cachedData);
      }
      
      throw error;
    }
  }

  // ========================================
  // 3. LIST PRODUCTS (with filters)
  // ========================================
  async listProducts(query: ShoppingListQuery = {}): Promise<ApiResponse<ShoppingProductsResponse>> {
    try {
      console.log('🚀 [Shopping Service] Listing products with query:', query);
      const response = await apiClient.get<ApiResponse<ShoppingProductsResponse>>(
        API_CONFIG.ENDPOINTS.PRODUCTS.SHOPPING.PRODUCTS,
        { params: query }
      );
      console.log('✅ [Shopping Service] Products listed:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [Shopping Service] Failed to list products:', error);
      
      // Fallback to empty list
      return {
        success: false,
        data: {
          products: [],
          meta: { total: 0, page: 1, limit: 12, pages: 0 }
        },
        message: 'Failed to fetch products'
      };
    }
  }

  // ========================================
  // 4. GET PRODUCT BY SLUG/ID
  // ========================================
  async getProduct(slugOrId: string): Promise<ApiResponse<ShoppingProductDetail>> {
    try {
      console.log('🚀 [Shopping Service] Fetching product:', slugOrId);
      const response = await apiClient.get<ApiResponse<ShoppingProductDetail>>(
        API_CONFIG.ENDPOINTS.PRODUCTS.SHOPPING.PRODUCT_BY_ID(slugOrId)
      );
      console.log('✅ [Shopping Service] Product fetched:', response.data);
      
      // Cache product details
      localStorage.setItem(`shopping_product_${slugOrId}`, JSON.stringify(response.data));
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [Shopping Service] Failed to fetch product:', error);
      
      // Fallback to localStorage
      const cachedData = localStorage.getItem(`shopping_product_${slugOrId}`);
      if (cachedData) {
        console.log('⚠️ [Shopping Service] Using cached product data');
        return JSON.parse(cachedData);
      }
      
      throw error;
    }
  }

  // ========================================
  // 5. SEARCH PRODUCTS
  // ========================================
  async searchProducts(query: ShoppingSearchQuery): Promise<ApiResponse<ShoppingProductsResponse>> {
    try {
      console.log('🚀 [Shopping Service] Searching products with query:', query);
      
      if (!query.q || !query.q.trim()) {
        throw new Error('Search query is required');
      }
      
      const response = await apiClient.get<ApiResponse<ShoppingProductsResponse>>(
        API_CONFIG.ENDPOINTS.PRODUCTS.SHOPPING.SEARCH,
        { params: query }
      );
      console.log('✅ [Shopping Service] Search results:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [Shopping Service] Failed to search products:', error);
      
      // Fallback to empty results
      return {
        success: false,
        data: {
          products: [],
          meta: { total: 0, page: 1, limit: 12, pages: 0 }
        },
        message: error.message || 'Failed to search products'
      };
    }
  }

  // ========================================
  // 6. GET DEAL OF THE DAY
  // ========================================
  async getDealOfDay(): Promise<ApiResponse<DealOfDay | null>> {
    try {
      console.log('🚀 [Shopping Service] Fetching deal of the day...');
      const response = await apiClient.get<ApiResponse<DealOfDay | null>>(
        API_CONFIG.ENDPOINTS.PRODUCTS.SHOPPING.DEALS
      );
      console.log('✅ [Shopping Service] Deal of the day fetched:', response.data);
      
      // Cache deal
      if (response.data.data) {
        localStorage.setItem('shopping_deal_of_day', JSON.stringify(response.data));
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [Shopping Service] Failed to fetch deal of the day:', error);
      
      // Fallback to localStorage
      const cachedData = localStorage.getItem('shopping_deal_of_day');
      if (cachedData) {
        console.log('⚠️ [Shopping Service] Using cached deal of the day');
        return JSON.parse(cachedData);
      }
      
      return {
        success: false,
        data: null,
        message: 'No deal available'
      };
    }
  }

  // ========================================
  // 7. GET TRENDING PRODUCTS
  // ========================================
  async getTrendingProducts(): Promise<ApiResponse<ShoppingProductCard[]>> {
    try {
      console.log('🚀 [Shopping Service] Fetching trending products...');
      const response = await apiClient.get<ApiResponse<ShoppingProductCard[]>>(
        API_CONFIG.ENDPOINTS.PRODUCTS.SHOPPING.TRENDING
      );
      console.log('✅ [Shopping Service] Trending products fetched:', response.data);
      
      // Cache trending products
      localStorage.setItem('shopping_trending_products', JSON.stringify(response.data));
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [Shopping Service] Failed to fetch trending products:', error);
      
      // Fallback to localStorage
      const cachedData = localStorage.getItem('shopping_trending_products');
      if (cachedData) {
        console.log('⚠️ [Shopping Service] Using cached trending products');
        return JSON.parse(cachedData);
      }
      
      return {
        success: false,
        data: [],
        message: 'Failed to fetch trending products'
      };
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Get products by category
   */
  async getProductsByCategory(
    categorySlugOrId: string,
    query: Omit<ShoppingListQuery, 'category'> = {}
  ): Promise<ApiResponse<ShoppingProductsResponse>> {
    try {
      console.log('🚀 [Shopping Service] Fetching products for category:', categorySlugOrId);
      return await this.listProducts({ ...query, category: categorySlugOrId });
    } catch (error: any) {
      console.error('❌ [Shopping Service] Failed to fetch products by category:', error);
      throw error;
    }
  }

  /**
   * Get products by price range
   */
  async getProductsByPriceRange(
    minPrice: number,
    maxPrice: number,
    query: ShoppingListQuery = {}
  ): Promise<ApiResponse<ShoppingProductsResponse>> {
    return this.listProducts({ ...query, min_price: minPrice, max_price: maxPrice });
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(query: ShoppingListQuery = {}): Promise<ApiResponse<ShoppingProductsResponse>> {
    return this.listProducts({ ...query, badge: 'featured' });
  }

  /**
   * Get products with free shipping
   */
  async getFreeShippingProducts(query: ShoppingListQuery = {}): Promise<ApiResponse<ShoppingProductsResponse>> {
    return this.listProducts({ ...query, badge: 'free-shipping' });
  }

  /**
   * Check if deal is still valid
   */
  isDealValid(deal: DealOfDay | null): boolean {
    if (!deal || !deal.deal_expires_at) return false;
    return new Date(deal.deal_expires_at) > new Date();
  }

  /**
   * Format time remaining for deal
   */
  formatTimeRemaining(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  /**
   * Clear all cached shopping data
   */
  clearCache(): void {
    console.log('🧹 [Shopping Service] Clearing cache...');
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('shopping_')) {
        localStorage.removeItem(key);
      }
    });
    console.log('✅ [Shopping Service] Cache cleared');
  }
}

// Export singleton instance
const shoppingService = new ShoppingService();
export default shoppingService;
