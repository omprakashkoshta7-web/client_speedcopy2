import apiClient from './api.service';
import { API_CONFIG } from '../config/api.config';

// ============================================================================
// TYPESCRIPT INTERFACES - Matching Backend Models Exactly
// ============================================================================

export interface GiftingCategory {
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

export interface GiftingSubcategory {
  _id: string;
  name: string;
  slug: string;
}

export interface GiftingVariant {
  index: number;
  size: string;
  size_label: string;
  paper_type: string;
  cover_color: string;
  cover_color_name: string;
  stock: number;
  additional_price: number;
}

export interface GiftOptions {
  materials: string[];
  sizes: string[];
  colors: string[];
  canvas: {
    width: number;
    height: number;
    unit: string;
  } | null;
  design_instructions: string;
}

export interface Customization {
  requires_design: boolean;
  requires_upload: boolean;
  design_mode: 'premium' | 'normal' | 'both' | null;
  supports_photos: boolean;
  supports_names: boolean;
  supports_text: boolean;
  premium_design_available: boolean;
  start_design_available: boolean;
  max_photos: number;
  max_name_length: number;
  max_text_length: number;
  design_instructions: string;
  canvas: {
    width: number;
    height: number;
    unit: string;
  } | null;
}

export interface GiftingProductCard {
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
  category: GiftingCategory | null;
  subcategory: GiftingSubcategory | null;
  gift_options: GiftOptions;
  customization: Customization;
}

export interface GiftingProductDetail {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  category: GiftingCategory | null;
  subcategory: GiftingSubcategory | null;
  brand: string;
  description: string;
  highlights: string[];
  mrp: number;
  sale_price: number;
  discount_pct: number;
  badge: string | null;
  variants: GiftingVariant[];
  gift_options: GiftOptions;
  customization: Customization;
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

export interface GiftingBanner {
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
}

export interface GiftingHomeData {
  banners: GiftingBanner[];
  categories: GiftingCategory[];
  featured_products: GiftingProductCard[];
  customizable_products: GiftingProductCard[];
  premium_designs: GiftingProductCard[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface GiftingProductsResponse {
  products: GiftingProductCard[];
  meta: PaginationMeta;
}

export interface GiftingListQuery {
  category?: string;
  subcategory?: string;
  customizable?: 'true' | 'false';
  design_mode?: 'premium' | 'normal' | 'both';
  badge?: string;
  search?: string;
  q?: string;
  min_price?: number;
  max_price?: number;
  sort?: 'price_asc' | 'price_desc' | 'default';
  page?: number;
  limit?: number;
}

export interface GiftingSearchQuery extends GiftingListQuery {
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
// GIFTING SERVICE - 6 APIs
// ============================================================================

class GiftingService {
  // ========================================
  // 1. GET HOME DATA
  // ========================================
  async getHome(): Promise<ApiResponse<GiftingHomeData>> {
    try {
      console.log('🚀 [Gifting Service] Fetching home data...');
      const response = await apiClient.get<ApiResponse<GiftingHomeData>>(
        API_CONFIG.ENDPOINTS.PRODUCTS.GIFTING.HOME
      );
      console.log('✅ [Gifting Service] Home data fetched:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [Gifting Service] Failed to fetch home data:', error);
      
      // Fallback to localStorage
      const cachedData = localStorage.getItem('gifting_home_data');
      if (cachedData) {
        console.log('⚠️ [Gifting Service] Using cached home data');
        return JSON.parse(cachedData);
      }
      
      throw error;
    }
  }

  // ========================================
  // 2. GET CATEGORIES
  // ========================================
  async getCategories(): Promise<ApiResponse<GiftingCategory[]>> {
    try {
      console.log('🚀 [Gifting Service] Fetching categories...');
      const response = await apiClient.get<ApiResponse<GiftingCategory[]>>(
        API_CONFIG.ENDPOINTS.PRODUCTS.GIFTING.CATEGORIES
      );
      console.log('✅ [Gifting Service] Categories fetched:', response.data);
      
      // Cache categories
      localStorage.setItem('gifting_categories', JSON.stringify(response.data));
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [Gifting Service] Failed to fetch categories:', error);
      
      // Fallback to localStorage
      const cachedData = localStorage.getItem('gifting_categories');
      if (cachedData) {
        console.log('⚠️ [Gifting Service] Using cached categories');
        return JSON.parse(cachedData);
      }
      
      throw error;
    }
  }

  // ========================================
  // 3. LIST PRODUCTS (with filters)
  // ========================================
  async listProducts(query: GiftingListQuery = {}): Promise<ApiResponse<GiftingProductsResponse>> {
    try {
      console.log('🚀 [Gifting Service] Listing products with query:', query);
      const response = await apiClient.get<ApiResponse<GiftingProductsResponse>>(
        API_CONFIG.ENDPOINTS.PRODUCTS.GIFTING.PRODUCTS,
        { params: query }
      );
      console.log('✅ [Gifting Service] Products listed:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [Gifting Service] Failed to list products:', error);
      
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
  // 4. SEARCH PRODUCTS
  // ========================================
  async searchProducts(query: GiftingSearchQuery): Promise<ApiResponse<GiftingProductsResponse>> {
    try {
      console.log('🚀 [Gifting Service] Searching products with query:', query);
      
      if (!query.q || !query.q.trim()) {
        throw new Error('Search query is required');
      }
      
      const response = await apiClient.get<ApiResponse<GiftingProductsResponse>>(
        API_CONFIG.ENDPOINTS.PRODUCTS.GIFTING.SEARCH,
        { params: query }
      );
      console.log('✅ [Gifting Service] Search results:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [Gifting Service] Failed to search products:', error);
      
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
  // 5. GET PRODUCT BY ID/SLUG
  // ========================================
  async getProduct(identifier: string): Promise<ApiResponse<GiftingProductDetail>> {
    try {
      console.log('🚀 [Gifting Service] Fetching product:', identifier);
      const response = await apiClient.get<ApiResponse<GiftingProductDetail>>(
        API_CONFIG.ENDPOINTS.PRODUCTS.GIFTING.PRODUCT_BY_ID(identifier)
      );
      console.log('✅ [Gifting Service] Product fetched:', response.data);
      
      // Cache product details
      localStorage.setItem(`gifting_product_${identifier}`, JSON.stringify(response.data));
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [Gifting Service] Failed to fetch product:', error);
      
      // Fallback to localStorage
      const cachedData = localStorage.getItem(`gifting_product_${identifier}`);
      if (cachedData) {
        console.log('⚠️ [Gifting Service] Using cached product data');
        return JSON.parse(cachedData);
      }
      
      throw error;
    }
  }

  // ========================================
  // 6. GET PRODUCTS BY CATEGORY
  // ========================================
  async getProductsByCategory(
    categorySlugOrId: string,
    query: Omit<GiftingListQuery, 'category'> = {}
  ): Promise<ApiResponse<GiftingProductsResponse>> {
    try {
      console.log('🚀 [Gifting Service] Fetching products for category:', categorySlugOrId);
      return await this.listProducts({ ...query, category: categorySlugOrId });
    } catch (error: any) {
      console.error('❌ [Gifting Service] Failed to fetch products by category:', error);
      throw error;
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Get customizable products only
   */
  async getCustomizableProducts(query: GiftingListQuery = {}): Promise<ApiResponse<GiftingProductsResponse>> {
    return this.listProducts({ ...query, customizable: 'true' });
  }

  /**
   * Get premium design products
   */
  async getPremiumDesignProducts(query: GiftingListQuery = {}): Promise<ApiResponse<GiftingProductsResponse>> {
    return this.listProducts({ ...query, design_mode: 'premium' });
  }

  /**
   * Get products by price range
   */
  async getProductsByPriceRange(
    minPrice: number,
    maxPrice: number,
    query: GiftingListQuery = {}
  ): Promise<ApiResponse<GiftingProductsResponse>> {
    return this.listProducts({ ...query, min_price: minPrice, max_price: maxPrice });
  }

  /**
   * Clear all cached gifting data
   */
  clearCache(): void {
    console.log('🧹 [Gifting Service] Clearing cache...');
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('gifting_')) {
        localStorage.removeItem(key);
      }
    });
    console.log('✅ [Gifting Service] Cache cleared');
  }
}

// Export singleton instance
const giftingService = new GiftingService();
export default giftingService;
