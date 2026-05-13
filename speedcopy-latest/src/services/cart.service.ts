import apiClient from './api.service';
import { API_CONFIG } from '../config/api.config';

// ============================================================================
// CART ITEM INTERFACES
// ============================================================================

export interface CartItem {
  _id: string;
  productId: string;
  productName: string;
  flowType: 'printing' | 'gifting' | 'shopping';
  thumbnail?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  
  // For document printing
  printConfigId?: string;
  
  // For business printing
  businessPrintConfigId?: string;
  
  // For gifting/shopping
  designId?: string;
  designName?: string;
  designPreview?: string;
  variantId?: string;
  variantIndex?: number;
  variantSnapshot?: any;
  productSlug?: string;
  sku?: string;
  mrp?: number;
  salePrice?: number;
  badge?: string;
  freeShipping?: boolean;
}

export interface Cart {
  _id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================================================
// PRINTING CART INTERFACES
// ============================================================================

export interface PrintingCartItem extends CartItem {
  flowType: 'printing';
  printConfigId?: string;
  businessPrintConfigId?: string;
}

export interface AddToPrintingCartData {
  productId: string;
  productName: string;
  flowType: 'printing';
  printConfigId?: string;
  businessPrintConfigId?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  thumbnail?: string;
}

export interface UpdatePrintingCartItemData {
  quantity?: number;
}

// ============================================================================
// GIFTING CART INTERFACES
// ============================================================================

export interface GiftingCartItem extends CartItem {
  flowType: 'gifting';
  designId?: string;
  variantIndex?: number;
}

export interface AddToGiftingCartData {
  product_id: string;
  design_id?: string;
  variant_index?: number;
  qty: number;
}

export interface GiftingCart {
  _id: string;
  user_id: string;
  items: Array<{
    item_id: string;
    product_id: string;
    name: string;
    slug: string;
    thumbnail: string;
    sku: string;
    mrp: number;
    sale_price: number;
    discount_pct: number;
    badge: string;
    qty: number;
    unit_price: number;
    total_price: number;
    design_id?: string;
    variant_index?: number;
    variant?: any;
    in_stock: boolean;
    available_stock: number;
    free_shipping: boolean;
    category: string;
  }>;
  subtotal: number;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// SHOPPING CART INTERFACES
// ============================================================================

export interface ShoppingCartItem extends CartItem {
  flowType: 'shopping';
  variantIndex?: number;
}

export interface AddToShoppingCartData {
  product_id: string;
  variant_index?: number;
  qty: number;
}

export interface ShoppingCart {
  _id: string;
  user_id: string;
  items: Array<{
    item_id: string;
    product_id: string;
    name: string;
    slug: string;
    thumbnail: string;
    sku: string;
    mrp: number;
    sale_price: number;
    discount_pct: number;
    badge: string;
    qty: number;
    unit_price: number;
    total_price: number;
    variant_index?: number;
    variant?: any;
    in_stock: boolean;
    available_stock: number;
    free_shipping: boolean;
    category: string;
    subcategory: string;
  }>;
  subtotal: number;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// COUPON INTERFACES
// ============================================================================

export interface CouponData {
  code: string;
  subtotal: number;
  flowType?: 'printing' | 'gifting' | 'shopping';
}

export interface CouponResponse {
  code: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  discount: number;
  finalAmount: number;
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
// CART SERVICE CLASS
// ============================================================================

class CartService {
  // ========================================================================
  // PRINTING CART METHODS (6 APIs)
  // ========================================================================

  /**
   * Get printing cart items
   * @returns Cart with all printing items
   */
  async getPrintingCart(): Promise<ApiResponse<Cart>> {
    const response = await apiClient.get<ApiResponse<Cart>>(
      `${API_CONFIG.ENDPOINTS.CART.PRINTING_GET}`
    );
    return response.data;
  }

  /**
   * Add document/business printing to cart
   * @param data Cart item data
   * @returns Updated cart
   */
  async addToPrintingCart(data: AddToPrintingCartData): Promise<ApiResponse<Cart>> {
    const response = await apiClient.post<ApiResponse<Cart>>(
      `${API_CONFIG.ENDPOINTS.CART.PRINTING_ADD}`,
      data
    );
    return response.data;
  }

  /**
   * Update printing cart item (quantity or configuration)
   * @param itemId Cart item ID
   * @param data Update data
   * @returns Updated cart
   */
  async updatePrintingCartItem(
    itemId: string,
    data: UpdatePrintingCartItemData
  ): Promise<ApiResponse<Cart>> {
    const response = await apiClient.patch<ApiResponse<Cart>>(
      `${API_CONFIG.ENDPOINTS.CART.PRINTING_UPDATE(itemId)}`,
      data
    );
    return response.data;
  }

  /**
   * Remove item from printing cart
   * @param itemId Cart item ID
   * @returns Updated cart
   */
  async removeFromPrintingCart(itemId: string): Promise<ApiResponse<Cart>> {
    const response = await apiClient.delete<ApiResponse<Cart>>(
      `${API_CONFIG.ENDPOINTS.CART.PRINTING_REMOVE(itemId)}`
    );
    return response.data;
  }

  /**
   * Clear entire printing cart
   * @returns Empty cart
   */
  async clearPrintingCart(): Promise<ApiResponse<Cart>> {
    const response = await apiClient.delete<ApiResponse<Cart>>(
      `${API_CONFIG.ENDPOINTS.CART.PRINTING_CLEAR}`
    );
    return response.data;
  }

  /**
   * Apply coupon code to printing cart
   * @param couponData Coupon code and subtotal
   * @returns Discount details
   */
  async applyPrintingCoupon(couponData: CouponData): Promise<ApiResponse<CouponResponse>> {
    const response = await apiClient.post<ApiResponse<CouponResponse>>(
      `${API_CONFIG.ENDPOINTS.CART.PRINTING_COUPON}`,
      { ...couponData, flowType: 'printing' }
    );
    return response.data;
  }

  // ========================================================================
  // GIFTING CART METHODS (3 APIs)
  // ========================================================================

  /**
   * Get gifting cart items
   * @returns Gifting cart with all items
   */
  async getGiftingCart(): Promise<ApiResponse<GiftingCart>> {
    const response = await apiClient.get<ApiResponse<GiftingCart>>(
      `${API_CONFIG.ENDPOINTS.CART.GIFTING_GET}`
    );
    return response.data;
  }

  /**
   * Add gift product to cart
   * @param data Gift product data
   * @returns Updated gifting cart
   */
  async addToGiftingCart(data: AddToGiftingCartData): Promise<ApiResponse<GiftingCart>> {
    const response = await apiClient.post<ApiResponse<GiftingCart>>(
      `${API_CONFIG.ENDPOINTS.CART.GIFTING_ADD}`,
      data
    );
    return response.data;
  }

  /**
   * Remove gift item from cart
   * @param itemId Cart item ID
   * @returns Updated gifting cart
   */
  async removeFromGiftingCart(itemId: string): Promise<ApiResponse<GiftingCart>> {
    const response = await apiClient.delete<ApiResponse<GiftingCart>>(
      `${API_CONFIG.ENDPOINTS.CART.GIFTING_REMOVE(itemId)}`
    );
    return response.data;
  }

  // ========================================================================
  // SHOPPING CART METHODS (3 APIs)
  // ========================================================================

  /**
   * Get shopping cart items
   * @returns Shopping cart with all items
   */
  async getShoppingCart(): Promise<ApiResponse<ShoppingCart>> {
    const response = await apiClient.get<ApiResponse<ShoppingCart>>(
      `${API_CONFIG.ENDPOINTS.CART.SHOPPING_GET}`
    );
    return response.data;
  }

  /**
   * Add shopping product to cart
   * @param data Shopping product data
   * @returns Updated shopping cart
   */
  async addToShoppingCart(data: AddToShoppingCartData): Promise<ApiResponse<ShoppingCart>> {
    const response = await apiClient.post<ApiResponse<ShoppingCart>>(
      `${API_CONFIG.ENDPOINTS.CART.SHOPPING_ADD}`,
      data
    );
    return response.data;
  }

  /**
   * Remove shopping item from cart
   * @param itemId Cart item ID
   * @returns Updated shopping cart
   */
  async removeFromShoppingCart(itemId: string): Promise<ApiResponse<ShoppingCart>> {
    const response = await apiClient.delete<ApiResponse<ShoppingCart>>(
      `${API_CONFIG.ENDPOINTS.CART.SHOPPING_REMOVE(itemId)}`
    );
    return response.data;
  }

  // ========================================================================
  // UNIFIED CART METHODS (for all types)
  // ========================================================================

  /**
   * Get unified cart (all items from all flows)
   * @returns Cart with mixed items
   */
  async getUnifiedCart(): Promise<ApiResponse<Cart>> {
    const response = await apiClient.get<ApiResponse<Cart>>(
      `${API_CONFIG.ENDPOINTS.CART.GET}`
    );
    return response.data;
  }

  /**
   * Add item to unified cart
   * @param data Cart item data
   * @returns Updated cart
   */
  async addToCart(data: any): Promise<ApiResponse<Cart>> {
    const response = await apiClient.post<ApiResponse<Cart>>(
      `${API_CONFIG.ENDPOINTS.CART.ADD}`,
      data
    );
    return response.data;
  }

  /**
   * Update cart item in unified cart
   * @param itemId Cart item ID
   * @param quantity New quantity
   * @returns Updated cart
   */
  async updateCartItem(itemId: string, quantity: number): Promise<ApiResponse<Cart>> {
    const response = await apiClient.patch<ApiResponse<Cart>>(
      `${API_CONFIG.ENDPOINTS.CART.UPDATE(itemId)}`,
      { quantity }
    );
    return response.data;
  }

  /**
   * Remove item from unified cart
   * @param itemId Cart item ID
   * @returns Updated cart
   */
  async removeFromCart(itemId: string): Promise<ApiResponse<Cart>> {
    const response = await apiClient.delete<ApiResponse<Cart>>(
      `${API_CONFIG.ENDPOINTS.CART.REMOVE(itemId)}`
    );
    return response.data;
  }

  /**
   * Clear entire unified cart
   * @returns Empty cart
   */
  async clearCart(): Promise<ApiResponse<Cart>> {
    const response = await apiClient.delete<ApiResponse<Cart>>(
      `${API_CONFIG.ENDPOINTS.CART.CLEAR}`
    );
    return response.data;
  }

  /**
   * Apply coupon to unified cart
   * @param couponData Coupon code and subtotal
   * @returns Discount details
   */
  async applyCoupon(couponData: CouponData): Promise<ApiResponse<CouponResponse>> {
    const response = await apiClient.post<ApiResponse<CouponResponse>>(
      `${API_CONFIG.ENDPOINTS.CART.COUPON}`,
      couponData
    );
    return response.data;
  }
}

export default new CartService();
