import apiClient from './api.service';
import { API_CONFIG } from '../config/api.config';

// ============================================
// TypeScript Interfaces - Match Backend Schema
// ============================================

export interface BusinessPrintType {
  id: string;
  name: string;
  description: string;
  route: string;
  cta_text: string;
  base_price: number;
  max_price?: number;
  is_featured: boolean;
  product_count: number;
  thumbnail?: string;
}

export interface BusinessPrintingHomeSection {
  id: string;
  name: string;
  description: string;
  route: string;
  cta_text: string;
}

export interface BusinessPrintingHome {
  sections: BusinessPrintingHomeSection[];
  business_types: BusinessPrintType[];
  featured_products: BusinessProduct[];
  service_packages: ServicePackage[];
}

export interface BusinessProduct {
  _id: string;
  name: string;
  slug: string;
  business_print_type: string;
  category: any;
  subcategory?: any;
  description: string;
  thumbnail: string;
  images: string[];
  base_price: number;
  discounted_price: number;
  requires_design: boolean;
  design_mode: 'premium' | 'normal' | 'both';
  is_featured: boolean;
  sort_order: number;
}

export interface ServicePackage {
  id: string;
  name: string;
  description: string;
  icon: string;
  originalPrice: number;
  price: number;
  savings: number;
  features: string[];
  isPopular: boolean;
}

export interface PickupLocation {
  _id: string;
  name: string;
  address: string;
  city: string;
  pincode: string;
  phone?: string;
  workingHours?: string;
  distance?: number;
  location?: {
    type: string;
    coordinates: [number, number];
  };
}

export interface BusinessPrintConfig {
  _id: string;
  userId: string;
  productId: string;
  businessPrintType: string;
  designType: 'premium' | 'normal';
  designId?: string;
  quantity: number;
  deliveryMethod: 'pickup' | 'delivery';
  shopId?: string;
  servicePackage?: string;
  specialInstructions?: string;
  estimatedPrice?: number;
  status: 'draft' | 'ordered';
  createdAt: string;
  updatedAt: string;
}

export interface SaveBusinessPrintConfigData {
  productId: string;
  businessPrintType: string;
  designType: 'premium' | 'normal';
  designId?: string;
  quantity: number;
  deliveryMethod: 'pickup' | 'delivery';
  shopId?: string;
  servicePackage?: string;
  specialInstructions?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  pages: number;
  uploadedAt: string;
  mimetype?: string;
}

/**
 * Business Printing Service - Handles all business printing operations
 * Implements all 9 Business Printing APIs with fallback support
 */
class BusinessPrintingService {
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

  // ============================================
  // 1. Home & Types (2 APIs)
  // ============================================

  /**
   * 1.1 Get Business Printing Home
   * GET /api/business-printing/home
   */
  async getBusinessPrintingHome(): Promise<{ success: boolean; data: BusinessPrintingHome }> {
    try {
      console.log('🏠 Getting business printing home...');
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.PRODUCTS.BUSINESS_PRINTING.HOME);
      console.log('✅ Business printing home response:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Business printing home API failed:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      // Fallback data
      return this.wrapSuccess({
        sections: [
          {
            id: 'business_printing',
            name: 'Business Printing',
            description: 'Premium print materials for brands, campaigns, and corporate teams.',
            route: '/printing/business-printing',
            cta_text: 'Explore Business Printing',
          },
        ],
        business_types: [],
        featured_products: [],
        service_packages: []
      });
    }
  }

  /**
   * 1.2 Get Business Printing Types
   * GET /api/business-printing/types
   */
  async getBusinessPrintingTypes(): Promise<{ success: boolean; data: BusinessPrintType[] }> {
    try {
      console.log('📋 Getting business printing types...');
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.PRODUCTS.BUSINESS_PRINTING.TYPES);
      console.log('✅ Business printing types response:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Business printing types API failed:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      // Fallback to localStorage or empty array
      const cached = localStorage.getItem('speedcopy_business_types');
      return this.wrapSuccess(cached ? JSON.parse(cached) : []);
    }
  }

  // ============================================
  // 2. Products (2 APIs)
  // ============================================

  /**
   * 2.1 Get Business Products
   * GET /api/business-printing/products
   */
  async getBusinessProducts(params?: {
    page?: number;
    limit?: number;
    type?: string;
    search?: string;
  }): Promise<{ success: boolean; data: { products: BusinessProduct[]; meta: any } }> {
    try {
      console.log('🛍️ Getting business products with params:', params);
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.PRODUCTS.BUSINESS_PRINTING.PRODUCTS, { params });
      console.log('✅ Business products response:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Business products API failed:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      return this.wrapSuccess({
        products: [],
        meta: {
          page: params?.page || 1,
          limit: params?.limit || 10,
          total: 0,
          totalPages: 0
        }
      });
    }
  }

  /**
   * 2.2 Get Business Product by ID
   * GET /api/business-printing/products/{id}
   */
  async getBusinessProductById(id: string): Promise<{ success: boolean; data: BusinessProduct }> {
    try {
      console.log('🔍 Getting business product by ID:', id);
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.PRODUCTS.BUSINESS_PRINTING.PRODUCT_BY_ID(id));
      console.log('✅ Business product response:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Get business product failed:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      throw new Error('Business product not found');
    }
  }

  // ============================================
  // 3. Configuration (2 APIs)
  // ============================================

  /**
   * 3.1 Save Business Print Configuration
   * POST /api/business-printing/configure
   */
  async saveBusinessPrintConfig(data: SaveBusinessPrintConfigData): Promise<{ success: boolean; data: BusinessPrintConfig; message: string }> {
    try {
      console.log('💾 Saving business print configuration:', data);
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.PRODUCTS.BUSINESS_PRINTING.CONFIGURE, data);
      console.log('✅ Business print config saved:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Save business print config failed:', error);
      throw error;
    }
  }

  /**
   * 3.2 Get Business Print Configuration
   * GET /api/business-printing/config/{id}
   */
  async getBusinessPrintConfig(configId: string): Promise<{ success: boolean; data: BusinessPrintConfig }> {
    try {
      console.log('🔍 Getting business print config:', configId);
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.PRODUCTS.BUSINESS_PRINTING.CONFIG_BY_ID(configId));
      console.log('✅ Business print config response:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Get business print config failed:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      // Fallback to localStorage
      const cached = localStorage.getItem(`speedcopy_business_config_${configId}`);
      if (cached) {
        return this.wrapSuccess(JSON.parse(cached));
      }
      
      throw new Error('Business print configuration not found');
    }
  }

  // ============================================
  // 4. File Management (2 APIs)
  // ============================================

  /**
   * 4.1 Get Uploaded Files
   * GET /api/products/printing/files
   */
  async getUploadedFiles(): Promise<{ success: boolean; data: UploadedFile[] }> {
    try {
      console.log('📁 Getting uploaded files...');
      const response = await apiClient.get('/api/products/printing/files');
      console.log('✅ Uploaded files response:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Get uploaded files API failed:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      // Fallback to localStorage
      const cached = localStorage.getItem('speedcopy_uploaded_files');
      return this.wrapSuccess(cached ? JSON.parse(cached) : []);
    }
  }

  /**
   * 4.2 Upload Files
   * POST /api/products/printing/upload
   */
  async uploadFiles(files: File[]): Promise<{ success: boolean; data: UploadedFile[]; message: string }> {
    try {
      console.log('📤 Uploading files:', files.length, 'files');
      
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await apiClient.post('/api/products/printing/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('✅ Files uploaded:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ File upload failed:', error);
      throw error;
    }
  }

  // ============================================
  // 5. Service Packages (1 API)
  // ============================================

  /**
   * 5.1 Get Service Packages
   * GET /api/business-printing/service-packages
   */
  async getServicePackages(): Promise<{ success: boolean; data: ServicePackage[] }> {
    try {
      console.log('📦 Getting service packages...');
      const response = await apiClient.get('/api/business-printing/service-packages');
      console.log('✅ Service packages response:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Service packages API failed:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      // Fallback data
      return this.wrapSuccess([
        {
          id: 'standard',
          name: 'Standard',
          description: 'Best for non-urgent bulk orders. Reliable and cost-effective.',
          icon: 'truck',
          originalPrice: 12,
          price: 9,
          savings: 3,
          features: ['Ready in 3 days', 'Standard paper quality', 'Pickup at counter'],
          isPopular: false,
        },
        {
          id: 'express',
          name: 'Express',
          description: 'Perfect balance of speed and value for most business needs.',
          icon: 'lightning',
          originalPrice: 18,
          price: 14.5,
          savings: 3.5,
          features: ['Ready in 24 hours', 'High priority queue', 'Pickup at counter'],
          isPopular: true,
        },
        {
          id: 'instant',
          name: 'Instant',
          description: 'When every minute counts. Delivered directly to your door.',
          icon: 'rocket',
          originalPrice: 30,
          price: 25,
          savings: 5,
          features: ['Delivered within 4 hours', 'Immediate processing', 'Direct courier delivery'],
          isPopular: false,
        },
      ]);
    }
  }

  // ============================================
  // Additional APIs (Pickup Locations)
  // ============================================

  /**
   * Get Pickup Locations
   * GET /api/business-printing/pickup-locations
   */
  async getPickupLocations(params: {
    lat?: number;
    lng?: number;
    radius?: number;
    pincode?: string;
  }): Promise<{ success: boolean; data: PickupLocation[] }> {
    try {
      console.log('📍 Getting pickup locations with params:', params);
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.PRODUCTS.BUSINESS_PRINTING.PICKUP_LOCATIONS, { params });
      console.log('✅ Pickup locations response:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Pickup locations API failed:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      // Fallback to empty array
      return this.wrapSuccess([]);
    }
  }

  /**
   * Get Business Printing Categories
   * GET /api/business-printing/categories
   */
  async getBusinessPrintingCategories(): Promise<{ success: boolean; data: any[] }> {
    try {
      console.log('📂 Getting business printing categories...');
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.PRODUCTS.BUSINESS_PRINTING.CATEGORIES);
      console.log('✅ Business printing categories response:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Business printing categories API failed:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      return this.wrapSuccess([]);
    }
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Validate business print configuration
   */
  validateBusinessPrintConfig(data: SaveBusinessPrintConfigData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.productId) errors.push('Product ID is required');
    if (!data.businessPrintType) errors.push('Business print type is required');
    if (!data.designType) errors.push('Design type is required');
    if (!data.quantity || data.quantity < 1) errors.push('Quantity must be at least 1');
    if (!data.deliveryMethod) errors.push('Delivery method is required');

    if (data.deliveryMethod === 'pickup' && !data.shopId) {
      errors.push('Shop ID is required for pickup orders');
    }

    if (data.deliveryMethod === 'delivery' && !data.servicePackage) {
      errors.push('Service package is required for delivery orders');
    }

    if (data.designType === 'premium' && !data.designId) {
      errors.push('Design ID is required for premium designs');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get business print type name
   */
  getBusinessPrintTypeName(typeId: string): string {
    const names: Record<string, string> = {
      business_card: 'Business Cards',
      flyers: 'Flyers & Leaflets',
      leaflets: 'Flyers & Leaflets',
      brochures: 'Brochures',
      posters: 'Posters',
      letterheads: 'Letterheads',
      custom_stationery: 'Custom Stationery',
    };
    return names[typeId] || typeId;
  }

  /**
   * Get service package name
   */
  getServicePackageName(packageId: string): string {
    const names: Record<string, string> = {
      standard: 'Standard',
      express: 'Express',
      instant: 'Instant',
    };
    return names[packageId] || packageId;
  }

  /**
   * Estimate price for business print configuration
   */
  estimatePrice(product: BusinessProduct, quantity: number, servicePackage?: string): number {
    let total = (product.discounted_price || product.base_price) * quantity;

    // Add delivery package price
    if (servicePackage) {
      const packages: Record<string, number> = {
        standard: 9,
        express: 14.5,
        instant: 25,
      };
      total += packages[servicePackage] || 0;
    }

    return Math.round(total * 100) / 100;
  }

  /**
   * Check if product requires design
   */
  requiresDesign(product: BusinessProduct): boolean {
    return product.requires_design !== false;
  }

  /**
   * Get supported design modes for product
   */
  getSupportedDesignModes(product: BusinessProduct): ('premium' | 'normal' | 'both') {
    return product.design_mode || 'both';
  }

  /**
   * Check if design mode is supported
   */
  isDesignModeSupported(product: BusinessProduct, designMode: 'premium' | 'normal'): boolean {
    const supported = this.getSupportedDesignModes(product);
    return supported === 'both' || supported === designMode;
  }
}

export default new BusinessPrintingService();
