import apiClient from './api.service';
import { API_CONFIG } from '../config/api.config';

// ============================================
// TypeScript Interfaces - Match Backend Schema
// ============================================

export interface DocumentPrintType {
  id: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  cta_text: string;
  options: {
    colorMode?: string[];
    pageSize?: string[];
    printSide?: string[];
    printOutputType?: string[];
    coverPage?: string[];
    bindingCover?: string[];
    cdRequired?: string[];
    extras?: string[];
  };
  fields: Array<{
    id: string;
    label: string;
    input: string;
    required: boolean;
  }>;
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

export interface PrintingHomeSection {
  id: string;
  name: string;
  description: string;
  cta_text: string;
  route: string;
  supports_upload: boolean;
  requires_design: boolean;
}

export interface PrintingHome {
  sections: PrintingHomeSection[];
  document_types: DocumentPrintType[];
  service_packages: ServicePackage[];
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

export interface UploadedFile {
  originalName: string;
  url: string;
  publicId: string | null;
  size: number;
  mimeType: string;
}

export interface PrintConfig {
  _id: string;
  userId: string;
  printType: string;
  files: string[];
  colorMode: string;
  pageSize: string;
  printSide: string;
  printOutputType?: string;
  coverPage?: string;
  bindingCover?: string;
  cdRequired?: string;
  copies: number;
  linearGraphSheets?: number;
  semiLogGraphSheets?: number;
  specialInstructions?: string;
  deliveryMethod: 'pickup' | 'delivery';
  shopId?: string;
  servicePackage?: string;
  estimatedPrice: number;
  status: 'draft' | 'ordered';
  createdAt: string;
  updatedAt: string;
}

export interface SavePrintConfigData {
  printType: string;
  files: string[];
  colorMode: string;
  pageSize: string;
  printSide: string;
  printOutputType?: string;
  coverPage?: string;
  bindingCover?: string;
  cdRequired?: string;
  copies: number;
  linearGraphSheets?: number;
  semiLogGraphSheets?: number;
  specialInstructions?: string;
  deliveryMethod: 'pickup' | 'delivery';
  shopId?: string;
  servicePackage?: string;
}

/**
 * Printing Service - Handles all document printing operations
 * Implements all 10 Printing Product APIs with fallback support
 */
class PrintingService {
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
  // 1. Home & Document Types (3 APIs)
  // ============================================

  /**
   * 1.1 Get Printing Home
   * GET /api/products/printing/home
   */
  async getPrintingHome(): Promise<{ success: boolean; data: PrintingHome }> {
    try {
      console.log('🏠 Getting printing home...');
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.PRODUCTS.PRINTING.HOME);
      console.log('✅ Printing home response:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Printing home API failed:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      // Fallback data
      return this.wrapSuccess({
        sections: [
          {
            id: 'document_printing',
            name: 'Document Printing',
            description: 'Print resumes, essays, projects, and personal documents.',
            cta_text: 'Start Document Print',
            route: '/printing/document-printing',
            supports_upload: true,
            requires_design: false,
          },
          {
            id: 'business_printing',
            name: 'Business Printing',
            description: 'Marketing materials, branded reports, business cards, and bulk orders.',
            cta_text: 'Start Business Print',
            route: '/printing/business-printing',
            supports_upload: false,
            requires_design: true,
          },
        ],
        document_types: [],
        service_packages: []
      });
    }
  }

  /**
   * 1.2 Get Document Types
   * GET /api/products/printing/document-types
   */
  async getDocumentTypes(): Promise<{ success: boolean; data: DocumentPrintType[] }> {
    try {
      console.log('📄 Getting document types...');
      const response = await apiClient.get('/api/products/printing/document-types');
      console.log('✅ Document types response:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Document types API failed:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      // Fallback to localStorage or empty array
      const cached = localStorage.getItem('speedcopy_document_types');
      return this.wrapSuccess(cached ? JSON.parse(cached) : []);
    }
  }

  /**
   * 1.3 Get Document Type by ID
   * GET /api/products/printing/document-types/{type}
   */
  async getDocumentType(typeId: string): Promise<{ success: boolean; data: DocumentPrintType }> {
    try {
      console.log('📄 Getting document type:', typeId);
      const response = await apiClient.get(`/api/products/printing/document-types/${typeId}`);
      console.log('✅ Document type response:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Document type API failed:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      // Fallback: Get from all document types
      const allTypes = await this.getDocumentTypes();
      const type = allTypes.data.find(t => t.id === typeId);
      
      if (type) {
        return this.wrapSuccess(type);
      }
      
      throw new Error('Document type not found');
    }
  }

  // ============================================
  // 2. Service Packages (1 API)
  // ============================================

  /**
   * 2.1 Get Service Packages
   * GET /api/products/printing/service-packages
   */
  async getServicePackages(): Promise<{ success: boolean; data: ServicePackage[] }> {
    try {
      console.log('📦 Getting service packages...');
      const response = await apiClient.get('/api/products/printing/service-packages');
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
  // 3. File Upload (1 API)
  // ============================================

  /**
   * 3.1 Upload Files
   * POST /api/products/printing/upload
   */
  async uploadFiles(files: File[]): Promise<{ success: boolean; data: { files: UploadedFile[] }; message: string }> {
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
  // 4. Configuration (2 APIs)
  // ============================================

  /**
   * 4.1 Save Print Configuration
   * POST /api/products/printing/configure
   */
  async savePrintConfig(data: SavePrintConfigData): Promise<{ success: boolean; data: PrintConfig; message: string }> {
    try {
      console.log('💾 Saving print configuration:', data);
      const response = await apiClient.post('/api/products/printing/configure', data);
      console.log('✅ Print config saved:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Save print config failed:', error);
      throw error;
    }
  }

  /**
   * 4.2 Get Print Configuration
   * GET /api/products/printing/config/{id}
   */
  async getPrintConfig(configId: string): Promise<{ success: boolean; data: PrintConfig }> {
    try {
      console.log('🔍 Getting print config:', configId);
      const response = await apiClient.get(`/api/products/printing/config/${configId}`);
      console.log('✅ Print config response:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Get print config failed:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      // Fallback to localStorage
      const cached = localStorage.getItem(`speedcopy_print_config_${configId}`);
      if (cached) {
        return this.wrapSuccess(JSON.parse(cached));
      }
      
      throw new Error('Print configuration not found');
    }
  }

  // ============================================
  // 5. Pickup Locations (1 API)
  // ============================================

  /**
   * 5.1 Get Pickup Locations
   * GET /api/products/printing/pickup-locations
   */
  async getPickupLocations(params: {
    lat?: number;
    lng?: number;
    radius?: number;
    pincode?: string;
  }): Promise<{ success: boolean; data: PickupLocation[] }> {
    try {
      console.log('📍 Getting pickup locations with params:', params);
      const response = await apiClient.get('/api/products/printing/pickup-locations', { params });
      console.log('✅ Pickup locations response:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Pickup locations API failed:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      // Fallback to empty array
      return this.wrapSuccess([]);
    }
  }

  // ============================================
  // Additional APIs (Already in product.service.ts)
  // ============================================

  /**
   * Get Printing Categories
   * GET /api/products/printing/categories
   */
  async getPrintingCategories(): Promise<{ success: boolean; data: any[] }> {
    try {
      console.log('📂 Getting printing categories...');
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.PRODUCTS.PRINTING.CATEGORIES);
      console.log('✅ Printing categories response:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Printing categories API failed:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      return this.wrapSuccess([]);
    }
  }

  /**
   * Get Printing Products
   * GET /api/products/printing/products
   */
  async getPrintingProducts(params?: {
    page?: number;
    limit?: number;
    category?: string;
  }): Promise<{ success: boolean; data: any }> {
    try {
      console.log('🛍️ Getting printing products with params:', params);
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.PRODUCTS.PRINTING.PRODUCTS, { params });
      console.log('✅ Printing products response:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Printing products API failed:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      return this.wrapSuccess({ products: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } });
    }
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Estimate price for print configuration
   */
  estimatePrice(data: SavePrintConfigData): number {
    const { printType, copies = 1, colorMode, deliveryMethod, servicePackage } = data;

    // Base price per page (rough estimate)
    const colorMultiplier = colorMode === 'color' ? 3 : 1;
    const basePricePerCopy: Record<string, number> = {
      standard_printing: 2,
      soft_binding: 15,
      spiral_binding: 20,
      thesis_binding: 80,
    };

    let total = (basePricePerCopy[printType] || 2) * copies * colorMultiplier;

    // Add delivery package price
    if (deliveryMethod === 'delivery' && servicePackage) {
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
   * Validate print configuration
   */
  validatePrintConfig(data: SavePrintConfigData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.printType) errors.push('Print type is required');
    if (!data.files || data.files.length === 0) errors.push('At least one file is required');
    if (!data.colorMode) errors.push('Color mode is required');
    if (!data.pageSize) errors.push('Page size is required');
    if (!data.printSide) errors.push('Print side is required');
    if (!data.copies || data.copies < 1) errors.push('Number of copies must be at least 1');
    if (!data.deliveryMethod) errors.push('Delivery method is required');

    if (data.deliveryMethod === 'pickup' && !data.shopId) {
      errors.push('Shop ID is required for pickup orders');
    }

    if (data.deliveryMethod === 'delivery' && !data.servicePackage) {
      errors.push('Service package is required for delivery orders');
    }

    if (data.printType === 'standard_printing' && !data.printOutputType) {
      errors.push('Print output type is required for standard printing');
    }

    if (data.printType === 'soft_binding' && !data.coverPage) {
      errors.push('Cover page is required for soft binding');
    }

    if (data.printType === 'thesis_binding') {
      if (!data.bindingCover) errors.push('Binding cover is required for thesis binding');
      if (!data.cdRequired) errors.push('CD requirement is required for thesis binding');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get print type name
   */
  getPrintTypeName(typeId: string): string {
    const names: Record<string, string> = {
      standard_printing: 'Standard Printing',
      soft_binding: 'Soft Binding',
      spiral_binding: 'Spiral Binding',
      thesis_binding: 'Thesis Binding',
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
}

export default new PrintingService();
