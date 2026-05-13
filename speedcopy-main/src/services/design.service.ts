import apiClient from './api.service';
import { API_CONFIG } from '../config/api.config';
import { normalizeImageUrl } from '../utils/image.utils';
import { isRouteNotFoundError, wrapSuccess } from './api-response.utils';

// Template interface matching backend schema
export interface DesignTemplate {
  _id: string;
  name: string;
  category: string;
  flowType: 'gifting' | 'business_printing' | 'shopping';
  isPremium: boolean;
  productId?: string;
  canvasJson: any;
  previewImage?: string;
  dimensions?: {
    width?: number;
    height?: number;
    unit?: string;
  };
  isActive?: boolean;
  tags?: string[];
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Design interface matching backend schema
export interface SavedDesign {
  _id: string;
  userId: string;
  productId: string;
  name: string;
  canvasJson: any;
  previewImage?: string;
  flowType: 'gifting' | 'business_printing' | 'shopping';
  designType: 'premium' | 'normal';
  templateId?: string;
  dimensions?: {
    width?: number;
    height?: number;
    unit?: string;
  };
  isFinalized: boolean;
  isSaved: boolean;
  lastApprovedOrderId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Request interfaces
interface SaveDesignData {
  productId: string;
  name?: string;
  canvasJson: any;
  previewImage?: string;
  flowType: 'gifting' | 'business_printing' | 'shopping';
  designType?: 'premium' | 'normal';
  templateId?: string;
  dimensions?: {
    width: number;
    height: number;
    unit: string;
  };
  isFinalized?: boolean;
  isSaved?: boolean;
}

interface BlankDesignData {
  productId: string;
  flowType: 'gifting' | 'business_printing' | 'shopping';
  dimensions?: {
    width: number;
    height: number;
    unit: string;
  };
}

interface TemplateDesignData {
  productId: string;
  templateId: string;
  flowType: 'gifting' | 'business_printing' | 'shopping';
}

interface UpdateDesignData {
  name?: string;
  canvasJson?: any;
  previewImage?: string;
  isFinalized?: boolean;
  isSaved?: boolean;
  dimensions?: {
    width: number;
    height: number;
    unit: string;
  };
}

// Frame interface - matches backend getProductFrames response exactly
export interface Frame {
  _id: string;
  id: string;           // same as _id (backend sends both)
  name: string;         // design.name
  frameName: string;    // same as name (backend sends both)
  canvasJson: any;      // fabric canvas JSON
  thumbnail?: string;   // design.previewImage
  image?: string;       // same as thumbnail (backend sends both)
  dimensions?: {
    width?: number;
    height?: number;
    unit?: string;
  };
}

// Variant template config — real backend response from GET /api/designs/template-config/:variantId
// Returns: { variant: {...}, template: { id, name, canvas, slots, assets, previewConfig, rules } }
export interface TemplateSlot {
  slotId: string;
  name: string;
  type: 'image' | 'text';
  geometry: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    shape?: 'rectangle' | 'circle' | 'custom';
    path?: string;
  };
  behavior?: {
    movable?: boolean;
    resizable?: boolean;
    cropEnabled?: boolean;
    zoomEnabled?: boolean;
    rotateEnabled?: boolean;
  };
  imageConfig?: {
    fitMode?: 'cover' | 'contain' | 'fill';
    minZoom?: number;
    maxZoom?: number;
    acceptedMimeTypes?: string[];
    maxFileSizeMb?: number;
    minResolution?: { width: number; height: number };
  };
  textConfig?: {
    minLength?: number;
    maxLength?: number;
    allowedFonts?: string[];
    defaultFontFamily?: string;
    defaultFontSize?: number;
    minFontSize?: number;
    maxFontSize?: number;
    fontWeight?: string;
    color?: string;
    alignment?: 'left' | 'center' | 'right';
    letterSpacing?: number;
    lineHeight?: number;
  };
  zIndex?: number;
  required?: boolean;
}

export interface TemplateConfig {
  id: string;
  name: string;
  slug: string;
  version: number;
  assets: {
    editorBaseImage: string;
    overlayImage?: string;
    maskImage?: string;
    mockupSceneImage?: string;
  };
  canvas: {
    width: number;
    height: number;
    unit: string;
    dpi?: number;
    printWidth?: number;
    printHeight?: number;
  };
  slots: TemplateSlot[];
  previewConfig?: {
    renderer?: string;
    livePreview?: boolean;
    mockups?: any[];
  };
  rules?: {
    allowFreeDesign?: boolean;
    requiredSlots?: string[];
    minResolution?: { width: number; height: number };
  };
}

export interface TemplateConfigResponse {
  variant: {
    id: string;
    productId: string;
    name: string;
    slug: string;
    sku: string;
    price: number;
    mrp?: number;
    salePrice?: number;
    currency: string;
    attributes: Record<string, string>;
    previewImages: Array<{ url: string; type?: string }>;
    templateIds?: string[];
    defaultTemplateId?: string;
  };
  template: TemplateConfig | null;
  availableTemplatesCount?: number;
  defaultTemplateId?: string;
  templates?: PublishedTemplateSummary[];
}

// Variant template config — kept for backward compat
export interface VariantTemplateConfig {
  variantId: string;
  templateId?: string;
  canvasJson?: any;
  dimensions?: {
    width: number;
    height: number;
    unit: string;
  };
  layers?: Array<{
    name: string;
    type: string;
    editable: boolean;
  }>;
  previewImage?: string;
  [key: string]: any;
}

// Real UserCustomization model from backend
export interface SlotCustomization {
  slotId: string;
  type: 'image' | 'text';
  asset?: {
    assetId?: string;
    originalUrl?: string;
    processedUrl?: string;
    mimeType?: string;
    width?: number;
    height?: number;
    sizeBytes?: number;
  };
  transform?: {
    x?: number;
    y?: number;
    scale?: number;
    rotation?: number;
    zoom?: number;
  };
  crop?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    unit?: 'px' | 'percent';
  };
  text?: {
    value?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    alignment?: 'left' | 'center' | 'right' | '';
  };
  updatedAt?: string;
}

export interface Customization {
  id?: string;
  _id: string;
  userId?: string;
  variantId: string;
  variantName?: string;
  templateId: string | TemplateConfig;
  templateName?: string;
  templateVersion: number;
  status: 'draft' | 'preview_generated' | 'print_ready' | 'locked';
  slots: SlotCustomization[];
  previewUrl?: string;
  renderedPreview?: {
    url?: string;
    width?: number;
    height?: number;
    surfaces?: Array<{
      surfaceId: string;
      name: string;
      url: string;
      width: number;
      height: number;
    }>;
    generatedAt?: string;
  };
  printReadyAsset?: {
    url?: string;
    width?: number;
    height?: number;
    dpi?: number;
    format?: string;
    surfaces?: Array<{
      surfaceId: string;
      name: string;
      url: string;
      width: number;
      height: number;
      dpi: number;
      format: string;
      generatedAt: string;
    }>;
    generatedAt?: string;
  };
  lockedOrderId?: string;
  lockedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomizationAsset {
  _id?: string;
  url: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  uploadedAt?: string;
  // From backend upload response
  assetId?: string;
  originalUrl?: string;
  processedUrl?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
}

// Request types — matches backend validator exactly:
// POST /api/designs/customizations accepts: { variantId: string (required), templateId?: ObjectId }
interface CreateCustomizationData {
  variantId: string;
  templateId?: string;
}

// interface UpdateCustomizationData {
//   canvasJson?: any;
//   previewImage?: string;
//   isFinalized?: boolean;
//   assets?: CustomizationAsset[];
//   [key: string]: any;
// }

/**
 * Design Service - Handles all design & template operations
 * Implements all 9 Premium Design APIs with fallback support
 */
class DesignService {
  private normalizeTemplateSummary(template: PublishedTemplateSummary): PublishedTemplateSummary {
    return {
      ...template,
      thumbnail: normalizeImageUrl(template.thumbnail),
      previewImage: normalizeImageUrl(template.previewImage),
    };
  }

  private normalizeTemplateConfigResponse(data: TemplateConfigResponse | null): TemplateConfigResponse | null {
    if (!data) return data;

    const template = data.template
      ? {
          ...data.template,
          assets: {
            ...data.template.assets,
            editorBaseImage: normalizeImageUrl(data.template.assets?.editorBaseImage),
            overlayImage: normalizeImageUrl(data.template.assets?.overlayImage),
            maskImage: normalizeImageUrl(data.template.assets?.maskImage),
            mockupSceneImage: normalizeImageUrl(data.template.assets?.mockupSceneImage),
          },
        }
      : data.template;

    return {
      ...data,
      template,
      variant: data.variant
        ? {
            ...data.variant,
            previewImages: (data.variant.previewImages || []).map((img: any) => ({
              ...img,
              url: normalizeImageUrl(img?.url || img),
            })),
          }
        : data.variant,
      templates: data.templates?.map(t => this.normalizeTemplateSummary(t)),
    };
  }

  /**
   * 1. Get Premium Templates ⭐
   * GET /api/designs/templates/premium
   */
  async getPremiumTemplates(params?: {
    productId?: string;
    category?: string;
  }): Promise<{ success: boolean; data: DesignTemplate[] }> {
    try {
      console.log('🎨 Getting premium templates with params:', params);
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.DESIGNS.TEMPLATES_PREMIUM, { params });
      console.log('✅ Premium templates response:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Premium templates API failed, using fallback...', error);
      
      if (!isRouteNotFoundError(error)) throw error;
      
      // Fallback to regular templates with premium filter
      try {
        const fallbackResponse = await apiClient.get(API_CONFIG.ENDPOINTS.DESIGNS.TEMPLATES, { 
          params: { ...params, isPremium: true } 
        });
        return fallbackResponse.data;
      } catch (fallbackError) {
        console.warn('⚠️ Fallback also failed, returning empty array');
        return wrapSuccess([]);
      }
    }
  }

  /**
   * 2. Get All Templates (with Premium Filter)
   * GET /api/designs/templates?isPremium=true
   */
  async getTemplates(filters?: {
    flowType?: 'gifting' | 'business_printing' | 'shopping';
    category?: string;
    isPremium?: boolean;
    productId?: string;
  }): Promise<{ success: boolean; data: DesignTemplate[] }> {
    try {
      console.log('📋 Getting templates with filters:', filters);
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.DESIGNS.TEMPLATES, { params: filters });
      console.log('✅ Templates response:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Templates API failed:', error);
      
      if (!isRouteNotFoundError(error)) throw error;
      
      // Return empty array as fallback
      return wrapSuccess([]);
    }
  }

  /**
   * 3. Create Design from Premium Template ⭐
   * POST /api/designs/from-template
   */
  async createFromTemplate(data: TemplateDesignData): Promise<{ success: boolean; data: SavedDesign; message: string }> {
    try {
      console.log('🎯 Creating design from template:', data);
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.DESIGNS.FROM_TEMPLATE, data);
      console.log('✅ Template design created:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Template creation failed:', error);
      
      if (!isRouteNotFoundError(error)) throw error;
      
      // Fallback: Create a basic design structure
      const fallbackDesign: SavedDesign = {
        _id: `design_${Date.now()}`,
        userId: 'current_user',
        productId: data.productId,
        name: 'Premium Design',
        canvasJson: { objects: [], background: '#ffffff' },
        flowType: data.flowType,
        designType: 'premium',
        templateId: data.templateId,
        isFinalized: false,
        isSaved: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return {
        success: true,
        data: fallbackDesign,
        message: 'Design created with fallback template'
      };
    }
  }

  /**
   * 4. Create Blank Canvas
   * POST /api/designs/blank
   */
  async createBlankDesign(data: BlankDesignData): Promise<{ success: boolean; data: SavedDesign; message: string }> {
    try {
      console.log('🎨 Creating blank design:', data);
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.DESIGNS.BLANK, data);
      console.log('✅ Blank design created:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Blank design creation failed:', error);
      
      if (!isRouteNotFoundError(error)) throw error;
      
      // Fallback: Create a basic blank design structure
      const fallbackDesign: SavedDesign = {
        _id: `design_${Date.now()}`,
        userId: 'current_user',
        productId: data.productId,
        name: 'Blank Canvas',
        canvasJson: { 
          objects: [], 
          background: '#ffffff',
          width: data.dimensions?.width || 600,
          height: data.dimensions?.height || 400
        },
        flowType: data.flowType,
        designType: 'normal',
        dimensions: data.dimensions || { width: 600, height: 400, unit: 'px' },
        isFinalized: false,
        isSaved: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return {
        success: true,
        data: fallbackDesign,
        message: 'Blank design created with fallback'
      };
    }
  }

  /**
   * 5. Save Design
   * POST /api/designs
   */
  async saveDesign(data: SaveDesignData): Promise<{ success: boolean; data: SavedDesign; message: string }> {
    try {
      console.log('💾 Saving design:', { ...data, canvasJson: '[Canvas JSON]' });
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.DESIGNS.SAVE, data);
      console.log('✅ Design saved:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Design save failed:', error);
      
      if (!isRouteNotFoundError(error)) throw error;
      
      // Fallback: Save to localStorage
      const designId = `design_${Date.now()}`;
      const fallbackDesign: SavedDesign = {
        _id: designId,
        userId: 'current_user',
        productId: data.productId,
        name: data.name || 'Untitled Design',
        canvasJson: data.canvasJson,
        previewImage: data.previewImage,
        flowType: data.flowType,
        designType: data.designType || 'normal',
        templateId: data.templateId,
        dimensions: data.dimensions,
        isFinalized: data.isFinalized || false,
        isSaved: data.isSaved !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save to localStorage as fallback
      const savedDesigns = JSON.parse(localStorage.getItem('speedcopy_saved_designs') || '[]');
      savedDesigns.push(fallbackDesign);
      localStorage.setItem('speedcopy_saved_designs', JSON.stringify(savedDesigns));
      
      return {
        success: true,
        data: fallbackDesign,
        message: 'Design saved locally (offline mode)'
      };
    }
  }

  /**
   * 6. Get My Designs
   * GET /api/designs?productId=product_123
   */
  async getMyDesigns(filters?: {
    productId?: string;
    finalized?: boolean;
    savedOnly?: boolean;
  }): Promise<{ success: boolean; data: SavedDesign[] }> {
    try {
      console.log('📂 Getting my designs with filters:', filters);
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.DESIGNS.MY_DESIGNS, { params: filters });
      console.log('✅ My designs response:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ My designs API failed:', error);
      
      if (!isRouteNotFoundError(error)) throw error;
      
      // Fallback: Get from localStorage
      const savedDesigns = JSON.parse(localStorage.getItem('speedcopy_saved_designs') || '[]');
      let filteredDesigns = savedDesigns;
      
      if (filters?.productId) {
        filteredDesigns = filteredDesigns.filter((d: SavedDesign) => d.productId === filters.productId);
      }
      if (filters?.finalized !== undefined) {
        filteredDesigns = filteredDesigns.filter((d: SavedDesign) => d.isFinalized === filters.finalized);
      }
      if (filters?.savedOnly) {
        filteredDesigns = filteredDesigns.filter((d: SavedDesign) => d.isSaved === true);
      }
      
      return wrapSuccess(filteredDesigns);
    }
  }

  /**
   * 7. Get Design by ID
   * GET /api/designs/{id}
   */
  async getDesignById(designId: string): Promise<{ success: boolean; data: SavedDesign }> {
    try {
      console.log('🔍 Getting design by ID:', designId);
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.DESIGNS.DESIGN_BY_ID(designId));
      console.log('✅ Design by ID response:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Get design by ID failed:', error);
      
      if (!isRouteNotFoundError(error)) throw error;
      
      // Fallback: Search in localStorage
      const savedDesigns = JSON.parse(localStorage.getItem('speedcopy_saved_designs') || '[]');
      const design = savedDesigns.find((d: SavedDesign) => d._id === designId);
      
      if (design) {
        return wrapSuccess(design);
      }
      
      throw new Error('Design not found');
    }
  }

  /**
   * 8. Update Design
   * PUT /api/designs/{id}
   */
  async updateDesign(designId: string, data: UpdateDesignData): Promise<{ success: boolean; data: SavedDesign; message: string }> {
    try {
      console.log('✏️ Updating design:', designId, { ...data, canvasJson: '[Canvas JSON]' });
      const response = await apiClient.put(API_CONFIG.ENDPOINTS.DESIGNS.UPDATE_DESIGN(designId), data);
      console.log('✅ Design updated:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Design update failed:', error);
      
      if (!isRouteNotFoundError(error)) throw error;
      
      // Fallback: Update in localStorage
      const savedDesigns = JSON.parse(localStorage.getItem('speedcopy_saved_designs') || '[]');
      const designIndex = savedDesigns.findIndex((d: SavedDesign) => d._id === designId);
      
      if (designIndex !== -1) {
        savedDesigns[designIndex] = {
          ...savedDesigns[designIndex],
          ...data,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem('speedcopy_saved_designs', JSON.stringify(savedDesigns));
        
        return {
          success: true,
          data: savedDesigns[designIndex],
          message: 'Design updated locally (offline mode)'
        };
      }
      
      throw new Error('Design not found for update');
    }
  }

  /**
   * 9. Approve Design
   * PATCH /api/designs/{id}/approve
   */
  async markDesignApproved(designId: string, orderId?: string): Promise<{ success: boolean; data: SavedDesign; message: string }> {
    try {
      console.log('✅ Approving design:', designId, 'for order:', orderId);
      const response = await apiClient.patch(API_CONFIG.ENDPOINTS.DESIGNS.APPROVE_DESIGN(designId), { orderId });
      console.log('✅ Design approved:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Design approval failed:', error);
      
      if (!isRouteNotFoundError(error)) throw error;
      
      // Fallback: Mark as approved in localStorage
      const savedDesigns = JSON.parse(localStorage.getItem('speedcopy_saved_designs') || '[]');
      const designIndex = savedDesigns.findIndex((d: SavedDesign) => d._id === designId);
      
      if (designIndex !== -1) {
        savedDesigns[designIndex] = {
          ...savedDesigns[designIndex],
          isFinalized: true,
          lastApprovedOrderId: orderId,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem('speedcopy_saved_designs', JSON.stringify(savedDesigns));
        
        return {
          success: true,
          data: savedDesigns[designIndex],
          message: 'Design approved locally (offline mode)'
        };
      }
      
      throw new Error('Design not found for approval');
    }
  }

  // Additional utility methods for backward compatibility
  /**
   * Get Product Frames
   * GET /api/designs/product/:productId/frames
   * Public route - no auth required
   * Backend returns: { success, data: [{ _id, id, name, frameName, canvasJson, thumbnail, image, dimensions }] }
   */
  async getProductFrames(productId: string): Promise<{ success: boolean; data: Frame[] }> {
    try {
      console.log('🖼️ Getting frames for product:', productId);
      const url = API_CONFIG.ENDPOINTS.DESIGNS.PRODUCT_FRAMES(productId);
      const response = await apiClient.get(url);
      console.log('✅ Product frames response:', response.data);

      // Backend wraps in { success, data: [...] }
      const frames: Frame[] = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
        ? response.data
        : [];

      return { success: true, data: frames };
    } catch (error) {
      console.warn('⚠️ Product frames API not available, using fallback:', error);
      return { success: false, data: [] };
    }
  }

  async loadProductFrames(productId: string): Promise<Frame[]> {
    try {
      const response = await this.getProductFrames(productId);
      return response.data || [];
    } catch (error) {
      console.error('Failed to load product frames:', error);
      return [];
    }
  }

  // Utility methods for premium design workflow
  async isPremiumTemplate(templateId: string): Promise<boolean> {
    try {
      const templates = await this.getPremiumTemplates();
      return templates.data.some(t => t._id === templateId);
    } catch (error) {
      console.warn('Could not verify premium template status:', error);
      return false;
    }
  }

  async getTemplatesByCategory(category: string, isPremium?: boolean): Promise<DesignTemplate[]> {
    try {
      const response = await this.getTemplates({ category, isPremium });
      return response.data;
    } catch (error) {
      console.error('Failed to get templates by category:', error);
      return [];
    }
  }

  async getTemplatesByProductLegacy(productId: string, isPremium?: boolean): Promise<DesignTemplate[]> {
    try {
      const response = await this.getTemplates({ productId, isPremium });
      return response.data;
    } catch (error) {
      console.error('Failed to get templates by product:', error);
      return [];
    }
  }

  // ─── Variant Template Config ────────────────────────────────────────────────

  /**
   * GET /api/designs/template-config/:variantId  (public — no auth)
   * Returns full template config with canvas, slots, assets.
   * 200 → product is customizable, show "Customize Now"
   * 404 → no published template, hide customization CTA
   */
  async getTemplateConfig(variantId: string): Promise<{ success: boolean; data: TemplateConfigResponse | null }> {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.DESIGNS.TEMPLATE_CONFIG(variantId));
      const data = response.data?.data ?? response.data ?? null;
      return { success: true, data: this.normalizeTemplateConfigResponse(data) };
    } catch (error: any) {
      if (error?.response?.status === 404 || error?.response?.status === 400) {
        return { success: false, data: null };
      }
      console.warn('⚠️ Template config error for variant:', variantId, error?.response?.status);
      return { success: false, data: null };
    }
  }

  // ─── Customizations ─────────────────────────────────────────────────────────

  /**
   * POST /api/designs/customizations  🔒 auth required
   * Body: { variantId: string, templateId?: string }
   * Creates a new draft customization session tied to the user.
   */
  async createCustomization(data: CreateCustomizationData): Promise<{ success: boolean; data: Customization; message: string }> {
    try {
      console.log('🎨 Creating customization session:', data);
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.DESIGNS.CUSTOMIZATIONS, data);
      const result = response.data?.data ?? response.data;
      const normalized = this.normalizeCustomizationResponse(result);
      return { success: true, data: normalized, message: response.data?.message || 'Customization created' };
    } catch (error) {
      console.error('❌ Create customization failed:', error);
      throw error;
    }
  }

  private normalizeCustomizationResponse(data: any): Customization {
    if (!data) return data;
    return {
      ...data,
      _id: data.id || data._id,
    };
  }

  /**
   * GET /api/designs/customizations/:id  🔒 auth required
   * Fetch a customization by ID (must be owned by the current user).
   */
  async getCustomization(id: string): Promise<{ success: boolean; data: Customization }> {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.DESIGNS.CUSTOMIZATION_BY_ID(id));
      const data = response.data?.data ?? response.data;
      return { success: true, data: this.normalizeCustomizationResponse(data) };
    } catch (error) {
      console.error('❌ Get customization failed:', error);
      throw error;
    }
  }

  /**
   * POST /api/designs/customizations/:id/assets  🔒 auth required
   * Upload an image asset. multipart/form-data, field name: "image"
   * Returns: { asset: { assetId, originalUrl, mimeType, width, height, sizeBytes } }
   */
  async uploadCustomizationAsset(
    id: string,
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<{ success: boolean; data: CustomizationAsset }> {
    try {
      console.log('📤 Uploading asset to customization:', id, file.name);
      const formData = new FormData();
      formData.append('image', file); // backend expects field name "image"

      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.DESIGNS.CUSTOMIZATION_ASSETS(id),
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (evt) => {
            if (onProgress && evt.total) {
              onProgress(Math.round((evt.loaded * 100) / evt.total));
            }
          },
        }
      );
      // Backend returns: { success, data: { asset: {...} }, message }
      const asset: CustomizationAsset = response.data?.data?.asset;
      console.log('✅ Asset uploaded:', asset);
      return { success: true, data: asset };
    } catch (error) {
      console.error('❌ Asset upload failed:', error);
      throw error;
    }
  }

  /**
   * PATCH /api/designs/customizations/:id/slots/:slotId  🔒 auth required
   * Update a single slot with image asset or text content.
   * For image: { type: 'image', asset: {...}, transform: {...}, crop: {...} }
   * For text:  { type: 'text', text: { value, fontFamily, fontSize, color, alignment } }
   */
  async updateCustomizationSlot(
    id: string,
    slotId: string,
    data: {
      type: 'image' | 'text' | 'graphic';
      asset?: SlotCustomization['asset'];
      transform?: SlotCustomization['transform'];
      crop?: SlotCustomization['crop'];
      text?: SlotCustomization['text'];
      graphic?: any;
    }
  ): Promise<{ success: boolean; data: Customization }> {
    try {
      const response = await apiClient.patch(
        API_CONFIG.ENDPOINTS.DESIGNS.CUSTOMIZATION_SLOT(id, slotId),
        data
      );
      const result = response.data?.data ?? response.data;
      return { success: true, data: result };
    } catch (error) {
      console.error('❌ Update slot failed:', error);
      throw error;
    }
  }

  /**
   * POST /api/designs/customizations/:id/render-preview  🔒 auth required
   * Validates required slots and renders a preview image via sharp.
   * Returns updated customization with renderedPreview.url populated.
   */
  async renderCustomizationPreview(id: string): Promise<{ success: boolean; data: Customization }> {
    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.DESIGNS.CUSTOMIZATION_RENDER(id),
        {}
      );
      const data = response.data?.data ?? response.data;
      return { success: true, data: this.normalizeCustomizationResponse(data) };
    } catch (error) {
      console.error('❌ Render preview failed:', error);
      throw error;
    }
  }

  /**
   * POST /api/designs/customizations/:id/finalize  🔒 auth required
   * Body: { orderId?: string }
   * Generates print-ready asset, locks the customization (status → 'locked').
   * Returns customization with printReadyAsset.url populated.
   */
  async finalizeCustomization(
    id: string,
    orderId?: string
  ): Promise<{ success: boolean; data: Customization; message: string }> {
    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.DESIGNS.CUSTOMIZATION_FINALIZE(id),
        orderId ? { orderId } : {}
      );
      const data = response.data?.data ?? response.data;
      return { success: true, data: this.normalizeCustomizationResponse(data), message: response.data?.message || 'Customization finalized' };
    } catch (error) {
      console.error('❌ Finalize customization failed:', error);
throw error;
    }
  }

  /**
   * List user's customizations
   * GET /api/designs/customizations
   */
  async listCustomizations(params?: {
    status?: string;
    variantId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ success: boolean; data: { customizations: Customization[]; pagination: any } }> {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.DESIGNS.CUSTOMIZATIONS, { params });
      const data = response.data?.data ?? response.data;
      const customizations = Array.isArray(data?.customizations) 
        ? data.customizations.map((c: any) => this.normalizeCustomizationResponse(c))
        : [];
      return { 
        success: true, 
        data: { 
          customizations, 
          pagination: data?.pagination || { page: 1, limit: 20, total: 0, pages: 0 } 
        } 
      };
    } catch (error) {
      console.error('❌ List customizations failed:', error);
      return { success: true, data: { customizations: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } } };
    }
  }

  /**
   * GET /api/customizations/:id/slots
   * Fetch all slots for a customization with current state including hasAsset flag
   */
  async getCustomizationSlots(id: string): Promise<{ success: boolean; data: { id: string; variantId: string; templateId: string; slots: any[] } }> {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.DESIGNS.CUSTOMIZATION_SLOTS(id));
      return { success: true, data: response.data?.data ?? response.data };
    } catch (error) {
      console.error('❌ Get customization slots failed:', error);
      throw error;
    }
  }

  /**
   * Delete a customization
   * DELETE /api/customizations/:id
   */
  async deleteCustomization(id: string): Promise<{ success: boolean; message: string }> {
    try {
      await apiClient.delete(API_CONFIG.ENDPOINTS.DESIGNS.CUSTOMIZATION_BY_ID(id));
      return { success: true, message: 'Customization deleted' };
    } catch (error) {
      console.error('❌ Delete customization failed:', error);
      throw error;
    }
  }

  /**
   * Update Customization — NOTE: backend has no PATCH /customizations/:id route.
   * Canvas state is persisted via slot updates (updateCustomizationSlot).
   * This method saves to localStorage only as a local draft backup.
   */
  async updateCustomization(id: string, data: Record<string, any>): Promise<{ success: boolean; data: any; message: string }> {
    try {
      const drafts = JSON.parse(localStorage.getItem('speedcopy_customization_drafts') || '{}');
      drafts[id] = { ...drafts[id], ...data, updatedAt: new Date().toISOString() };
      localStorage.setItem('speedcopy_customization_drafts', JSON.stringify(drafts));
      return { success: true, data: drafts[id], message: 'Draft saved locally' };
    } catch {
      return { success: false, data: null, message: 'Local save failed' };
    }
  }

  // ─── New APIs from handoff doc ───────────────────────────────────────────────

  /**
   * GET /api/designs/templates/by-variant/:variantId  (public)
   * Returns all published templates for a variant.
   * Use when one variant has multiple designs — show a picker before editor.
   * Response: { variant: {...}, templates: [...] }
   */
  async getTemplatesByVariant(variantId: string): Promise<{
    success: boolean;
    data: {
      variant: {
        id: string;
        productId: string;
        name: string;
        defaultTemplateId?: string;
      };
      templates: PublishedTemplateSummary[];
    } | null;
  }> {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.DESIGNS.TEMPLATES_BY_VARIANT(variantId)
      );
      const data = response.data?.data ?? response.data ?? null;
      return {
        success: true,
        data: data
          ? {
              ...data,
              templates: (data.templates || []).map((t: PublishedTemplateSummary) => this.normalizeTemplateSummary(t)),
            }
          : data,
      };
    } catch (error: any) {
      if (error?.response?.status === 404) return { success: false, data: null };
      console.warn('⚠️ getTemplatesByVariant failed:', error?.response?.status);
      return { success: false, data: null };
    }
  }

  /**
   * GET /api/designs/templates/by-product/:productId  (public)
   * Returns published templates across all variants of a product.
   * Use on product detail page to preload design count.
   */
  async getTemplatesByProduct(productId: string): Promise<{
    success: boolean;
    data: PublishedTemplateSummary[];
  }> {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.DESIGNS.TEMPLATES_BY_PRODUCT(productId)
      );
      const raw = response.data?.data ?? response.data;
      const templates = Array.isArray(raw) ? raw : raw?.templates ?? [];
      return { success: true, data: templates.map((t: PublishedTemplateSummary) => this.normalizeTemplateSummary(t)) };
    } catch (error: any) {
      console.warn('⚠️ getTemplatesByProduct failed:', error?.response?.status);
      return { success: false, data: [] };
    }
  }

  /**
   * GET /api/designs/templates/:id  (public)
   * Fetch one published template by id.
   * Use when frontend already knows which template the user selected.
   */
  async getTemplateById(templateId: string): Promise<{
    success: boolean;
    data: PublishedTemplateSummary | null;
  }> {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.DESIGNS.TEMPLATE_BY_ID(templateId)
      );
      const data = response.data?.data ?? response.data ?? null;
      return { success: true, data: data ? this.normalizeTemplateSummary(data) : data };
    } catch (error: any) {
      if (error?.response?.status === 404) return { success: false, data: null };
      console.warn('⚠️ getTemplateById failed:', error?.response?.status);
      return { success: false, data: null };
    }
  }

  // ─── Admin Template Lifecycle APIs ───────────────────────────────────────

  /**
   * GET /api/designs/admin/template-definitions/:id  🔒 admin required
   * Fetch one admin template record by ID.
   */
  async getAdminTemplate(templateId: string): Promise<{
    success: boolean;
    data: AdminTemplateDefinition | null;
  }> {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.DESIGNS.ADMIN_TEMPLATE(templateId)
      );
      const data = response.data?.data ?? response.data ?? null;
      return { success: true, data };
    } catch (error: any) {
      if (error?.response?.status === 404) return { success: false, data: null };
      console.warn('⚠️ getAdminTemplate failed:', error?.response?.status);
      return { success: false, data: null };
    }
  }

  /**
   * GET /api/designs/admin/template-definitions/:id/validation  🔒 admin required
   * Validate whether template is publish-ready.
   */
  async validateAdminTemplate(templateId: string): Promise<{
    success: boolean;
    data: TemplateValidationResult | null;
  }> {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.DESIGNS.ADMIN_TEMPLATE_VALIDATION(templateId)
      );
      const data = response.data?.data ?? response.data ?? null;
      return { success: true, data };
    } catch (error: any) {
      console.warn('⚠️ validateAdminTemplate failed:', error?.response?.status);
      return { success: false, data: null };
    }
  }

  /**
   * POST /api/designs/admin/template-definitions/:id/duplicate  🔒 admin required
   * Duplicate an existing template.
   */
  async duplicateAdminTemplate(
    templateId: string,
    data?: { name?: string; variantId?: string }
  ): Promise<{
    success: boolean;
    data: AdminTemplateDefinition | null;
    message: string;
  }> {
    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.DESIGNS.ADMIN_TEMPLATE_DUPLICATE(templateId),
        data || {}
      );
      const result = response.data?.data ?? response.data;
      return { success: true, data: result, message: response.data?.message || 'Template duplicated' };
    } catch (error: any) {
      console.warn('⚠️ duplicateAdminTemplate failed:', error?.response?.status);
      throw error;
    }
  }

  /**
   * POST /api/designs/admin/template-definitions/:id/unpublish  🔒 admin required
   * Move published template back to draft state.
   */
  async unpublishAdminTemplate(templateId: string): Promise<{
    success: boolean;
    data: AdminTemplateDefinition | null;
    message: string;
  }> {
    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.DESIGNS.ADMIN_TEMPLATE_UNPUBLISH(templateId)
      );
      const result = response.data?.data ?? response.data;
      return { success: true, data: result, message: response.data?.message || 'Template unpublished' };
    } catch (error: any) {
      console.warn('⚠️ unpublishAdminTemplate failed:', error?.response?.status);
      throw error;
    }
  }

  /**
   * PATCH /api/designs/admin/template-definitions/:id/status  🔒 admin required
   * Explicitly set template status.
   */
  async updateAdminTemplateStatus(
    templateId: string,
    status: 'draft' | 'published' | 'archived'
  ): Promise<{
    success: boolean;
    data: AdminTemplateDefinition | null;
    message: string;
  }> {
    try {
      const response = await apiClient.patch(
        API_CONFIG.ENDPOINTS.DESIGNS.ADMIN_TEMPLATE_STATUS(templateId),
        { status }
      );
      const result = response.data?.data ?? response.data;
      return { success: true, data: result, message: response.data?.message || 'Status updated' };
    } catch (error: any) {
      console.warn('⚠️ updateAdminTemplateStatus failed:', error?.response?.status);
      throw error;
    }
  }
}

// ─── Supplementary types for new APIs ────────────────────────────────────────

export interface PublishedTemplateSummary {
  _id?: string;
  id: string;
  name: string;
  slug: string;
  version: number;
  status: 'published' | 'draft' | 'archived';
  thumbnail?: string;
  previewImage?: string;
  variantId: string;
  isDefault?: boolean;
  isPremium?: boolean;
  dimensions?: {
    width?: number;
    height?: number;
    unit?: string;
  };
  tags?: string[];
}

export interface TemplateValidationResult {
  canPublish: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    slotCount: number;
    requiredSlotCount: number;
  };
}

export interface AdminTemplateDefinition {
  _id: string;
  name: string;
  slug: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  variantId?: string;
  productId?: string;
  assets?: {
    editorBaseImage?: string;
    overlayImage?: string;
    maskImage?: string;
    mockupSceneImage?: string;
  };
  canvas?: {
    width: number;
    height: number;
    unit: string;
    dpi?: number;
  };
  slots?: TemplateSlot[];
  createdAt?: string;
  updatedAt?: string;
}

export default new DesignService();
