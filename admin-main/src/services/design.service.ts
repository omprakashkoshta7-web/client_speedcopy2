import { request } from '../api/apiClient';

interface DesignData {
  productId: string;
  flowType: string;
  canvasJson?: any;
  designName?: string;
  thumbnail?: string;
}

interface BlankDesignData {
  productId: string;
  flowType: string;
  dimensions?: {
    width: number;
    height: number;
    unit: string;
  };
}

interface TemplateDesignData {
  productId: string;
  templateId: string;
  flowType: string;
}

class DesignService {
  // Get premium templates for a product
  async getPremiumTemplates(productId?: string, category?: string) {
    const params = new URLSearchParams();
    if (productId) params.append('productId', productId);
    if (category) params.append('category', category);
    
    return request<any>(`/designs/templates/premium?${params.toString()}`);
  }

  // Get all templates with filters
  async getTemplates(filters?: {
    flowType?: string;
    category?: string;
    isPremium?: boolean;
    productId?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.flowType) params.append('flowType', filters.flowType);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.isPremium !== undefined) params.append('isPremium', String(filters.isPremium));
    if (filters?.productId) params.append('productId', filters.productId);

    return request<any>(`/designs/templates?${params.toString()}`);
  }

  // Create a blank canvas design
  async createBlankDesign(data: BlankDesignData) {
    return request<any>('/designs/blank', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Create a design from a premium template
  async createFromTemplate(data: TemplateDesignData) {
    return request<any>('/designs/from-template', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Save a design
  async saveDesign(data: DesignData) {
    return request<any>('/designs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Get all user designs
  async getMyDesigns(filters?: {
    productId?: string;
    finalized?: boolean;
    savedOnly?: boolean;
  }) {
    const params = new URLSearchParams();
    if (filters?.productId) params.append('productId', filters.productId);
    if (filters?.finalized !== undefined) params.append('finalized', String(filters.finalized));
    if (filters?.savedOnly !== undefined) params.append('savedOnly', String(filters.savedOnly));

    return request<any>(`/designs?${params.toString()}`);
  }

  // Get design by ID
  async getDesignById(designId: string) {
    return request<any>(`/designs/${designId}`);
  }

  // Update a design
  async updateDesign(designId: string, data: any) {
    return request<any>(`/designs/${designId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Mark design as approved
  async markDesignApproved(designId: string, orderId?: string) {
    return request<any>(`/designs/${designId}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ orderId }),
    });
  }

  // ─── New Customization APIs ───────────────────────────────────────────────

  // Get template config for a variant
  async getTemplateConfig(variantId: string) {
    return request<any>(`/designs/template-config/${variantId}`);
  }

  // Get all templates for a variant
  async getTemplatesByVariant(variantId: string) {
    return request<any>(`/designs/templates/by-variant/${variantId}`);
  }

  // Get all templates for a product
  async getTemplatesByProduct(productId: string) {
    return request<any>(`/designs/templates/by-product/${productId}`);
  }

  // Get a single template by ID
  async getTemplateById(templateId: string) {
    return request<any>(`/designs/templates/${templateId}`);
  }

  // Create customization draft
  async createCustomization(data: { variantId: string; templateId?: string }) {
    return request<any>('/designs/customizations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Get customization draft
  async getCustomization(id: string) {
    return request<any>(`/designs/customizations/${id}`);
  }

  // Upload asset to customization
  async uploadCustomizationAsset(id: string, file: File) {
    const formData = new FormData();
    formData.append('image', file);
    return request<any>(`/designs/customizations/${id}/assets`, {
      method: 'POST',
      body: formData,
    });
  }

  // Update customization slot
  async updateCustomizationSlot(id: string, slotId: string, data: any) {
    return request<any>(`/designs/customizations/${id}/slots/${slotId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Render preview
  async renderCustomizationPreview(id: string) {
    return request<any>(`/designs/customizations/${id}/render-preview`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  // Finalize customization
  async finalizeCustomization(id: string, orderId?: string) {
    return request<any>(`/designs/customizations/${id}/finalize`, {
      method: 'POST',
      body: JSON.stringify(orderId ? { orderId } : {}),
    });
  }
}

export default new DesignService();
