import apiClient from './api.service';
import { API_CONFIG } from '../config/api.config';

// ============================================
// TypeScript Interfaces - Match Backend Schema
// ============================================

export interface OrderItem {
  productId: string;
  productName: string;
  variantId?: string;
  variantIndex?: number;
  variantSnapshot?: any;
  flowType: 'printing' | 'gifting' | 'shopping';
  productSlug?: string;
  sku?: string;
  thumbnail?: string;
  mrp?: number;
  salePrice?: number;
  badge?: string;
  printConfig?: {
    paperSize?: string;
    paperType?: string;
    colorOption?: string;
    bindingType?: string;
    sides?: string;
    copies?: number;
    pages?: number;
  };
  printConfigId?: string;
  designId?: string;
  uploadedFileUrl?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ShippingAddress {
  fullName?: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  pincode: string;
  country?: string;
  landmark?: string;
}

export interface OrderTimeline {
  status: string;
  note: string;
  timestamp: string;
}

export interface OrderClarification {
  isRequired: boolean;
  status: 'none' | 'requested' | 'responded' | 'resolved' | 'expired';
  requestedByRole?: string;
  question?: string;
  response?: string;
  requestedAt?: string;
  respondedAt?: string;
  dueAt?: string;
}

export interface OrderEditWindow {
  isEditable: boolean;
  editableUntil?: string;
  lockedReason?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  status: string;
  paymentStatus: 'unpaid' | 'paid' | 'refunded' | 'failed';
  paymentId?: string;
  vendorId?: string;
  storeId?: string;
  riderId?: string;
  deliveryStatus?: string;
  deliveryEtaMinutes?: number;
  deliveryDistanceKm?: number;
  customerFacingStatus: string;
  assignedAt?: string;
  acceptedAt?: string;
  productionStartedAt?: string;
  qcAt?: string;
  readyAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  refundId?: string;
  pickupShopId?: string;
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  total: number;
  notes?: string;
  failureReason?: string;
  couponCode?: string;
  clarification: OrderClarification;
  editWindow: OrderEditWindow;
  timeline: OrderTimeline[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderData {
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  subtotal: number;
  discount?: number;
  deliveryCharge?: number;
  total: number;
  paymentMethod?: string;
  notes?: string;
  pickupShopId?: string;
  couponCode?: string;
}

export interface OrderSummary {
  total_orders: number;
  active_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  status_counts: Record<string, number>;
  recent_orders: Order[];
}

export interface TrackingView {
  orderNumber: string;
  status: string;
  customerFacingStatus: string;
  paymentStatus: string;
  timeline: OrderTimeline[];
  shippingAddress: ShippingAddress;
  editWindow: OrderEditWindow;
  clarification: OrderClarification;
  estimatedDelivery: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateBeforeProductionData {
  shippingAddress?: Partial<ShippingAddress>;
  notes?: string;
  cancelOrder?: boolean;
  reason?: string;
}

/**
 * Order Service - Handles all order management operations
 * Implements all 12 Order Management APIs with fallback support
 */
class OrderService {
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
  // Cart Methods (Existing)
  // ============================================

  async getCart() {
    try {
      console.log('🛒 Getting cart...');
      const response = await apiClient.get('/api/orders/cart');
      console.log('✅ Cart response:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Cart API failed:', error);
      
      // Fallback to localStorage
      const localCart = localStorage.getItem('speedcopy_cart');
      return this.wrapSuccess(localCart ? JSON.parse(localCart) : { items: [] });
    }
  }

  async addToCart(data: {
    productId: string;
    productName?: string;
    flowType?: string;
    quantity: number;
    unitPrice?: number;
    totalPrice?: number;
    variantId?: string;
    designId?: string;
    thumbnail?: string;
    designPreview?: string;
    designJson?: string;
    designName?: string;
    options?: any;
  }) {
    try {
      console.log('➕ Adding to cart:', data);
      const response = await apiClient.post('/api/orders/cart', data);
      console.log('✅ Added to cart:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Add to cart API failed:', error);
      
      // Fallback to localStorage
      const localCart = localStorage.getItem('speedcopy_cart');
      const cart = localCart ? JSON.parse(localCart) : { items: [] };
      
      // Ensure cart.items exists and is an array
      if (!cart.items || !Array.isArray(cart.items)) {
        cart.items = [];
      }
      
      cart.items.push({ ...data, _id: `cart_${Date.now()}` });
      localStorage.setItem('speedcopy_cart', JSON.stringify(cart));
      
      return this.wrapSuccess(cart, 'Added to cart (offline mode)');
    }
  }

  async updateCartItem(itemId: string, quantity: number) {
    try {
      console.log('✏️ Updating cart item:', itemId, 'quantity:', quantity);
      const response = await apiClient.patch(`/api/orders/cart/${itemId}`, { quantity });
      console.log('✅ Cart item updated:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Update cart item API failed:', error);
      throw error;
    }
  }

  async removeCartItem(itemId: string) {
    try {
      console.log('➖ Removing cart item:', itemId);
      const response = await apiClient.delete(`/api/orders/cart/${itemId}`);
      console.log('✅ Cart item removed:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Remove cart item API failed:', error);
      throw error;
    }
  }

  // ============================================
  // 1. Create Orders (3 APIs - printing, gifting, shopping)
  // ============================================

  /**
   * 1.1 Create General Order
   * POST /api/orders
   */
  async createOrder(data: CreateOrderData): Promise<{ success: boolean; data: Order; message: string }> {
    try {
      console.log('📦 Creating order:', { ...data, items: `${data.items.length} items` });
      console.log('📦 Full order data:', JSON.stringify(data, null, 2));
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.ORDERS.CREATE, data);
      console.log('✅ Order created:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Create order failed:', error);
      console.error('❌ Error response:', error?.response?.data);
      console.error('❌ Error status:', error?.response?.status);
      console.error('❌ Error message:', error?.message);
      
      // Log validation errors if present
      if (error?.response?.data?.errors) {
        console.error('❌ Validation errors:', error.response.data.errors);
        error.response.data.errors.forEach((err: any, index: number) => {
          console.error(`   ${index + 1}. ${err.field || 'Field'}: ${err.message || err}`);
        });
      }
      
      throw error;
    }
  }

  /**
   * 1.2 Create Printing Order
   * POST /api/printing/orders
   */
  async createPrintingOrder(data: CreateOrderData): Promise<{ success: boolean; data: Order; message: string }> {
    try {
      console.log('🖨️ Creating printing order:', { ...data, items: `${data.items.length} items` });
      const response = await apiClient.post('/api/printing/orders', data);
      console.log('✅ Printing order created:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Printing order API failed, using general order endpoint:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      // Fallback to general order endpoint
      return this.createOrder(data);
    }
  }

  /**
   * 1.3 Create Gifting Order
   * POST /api/gifting/orders
   */
  async createGiftingOrder(data: CreateOrderData): Promise<{ success: boolean; data: Order; message: string }> {
    try {
      console.log('🎁 Creating gifting order:', { ...data, items: `${data.items.length} items` });
      const response = await apiClient.post('/api/gifting/orders', data);
      console.log('✅ Gifting order created:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Gifting order API failed, using general order endpoint:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      // Fallback to general order endpoint
      return this.createOrder(data);
    }
  }

  /**
   * 1.4 Create Shopping Order
   * POST /api/shopping/orders
   */
  async createShoppingOrder(data: CreateOrderData): Promise<{ success: boolean; data: Order; message: string }> {
    try {
      console.log('🛍️ Creating shopping order:', { ...data, items: `${data.items.length} items` });
      const response = await apiClient.post('/api/shopping/orders', data);
      console.log('✅ Shopping order created:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Shopping order API failed, using general order endpoint:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      // Fallback to general order endpoint
      return this.createOrder(data);
    }
  }

  // ============================================
  // 2. View Orders (3 APIs)
  // ============================================

  /**
   * 2.1 Get My Orders (Paginated)
   * GET /api/orders/my-orders
   */
  async getMyOrders(params?: { 
    page?: number; 
    limit?: number; 
    status?: string;
    search?: string;
  }): Promise<{ success: boolean; data: { orders: Order[]; meta: any } }> {
    try {
      console.log('📋 Getting my orders with params:', params);
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.ORDERS.MY_ORDERS, { params });
      console.log('✅ My orders response:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ My orders API failed:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      // Fallback to localStorage
      const localOrders = localStorage.getItem('speedcopy_orders');
      const orders = localOrders ? JSON.parse(localOrders) : [];
      
      return this.wrapSuccess({
        orders,
        meta: {
          page: params?.page || 1,
          limit: params?.limit || 10,
          total: orders.length,
          totalPages: Math.ceil(orders.length / (params?.limit || 10))
        }
      });
    }
  }

  /**
   * 2.2 Get Order by ID
   * GET /api/orders/{id}
   */
  async getOrderById(orderId: string): Promise<{ success: boolean; data: Order }> {
    try {
      console.log('🔍 Getting order by ID:', orderId);
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.ORDERS.ORDER_BY_ID(orderId));
      console.log('✅ Order by ID response:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Get order by ID failed:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      // Fallback to localStorage
      const localOrders = localStorage.getItem('speedcopy_orders');
      const orders = localOrders ? JSON.parse(localOrders) : [];
      const order = orders.find((o: Order) => o._id === orderId);
      
      if (order) {
        return this.wrapSuccess(order);
      }
      
      throw new Error('Order not found');
    }
  }

  /**
   * 2.3 Get Order Summary
   * GET /api/orders/summary
   */
  async getOrderSummary(): Promise<{ success: boolean; data: OrderSummary }> {
    try {
      console.log('📊 Getting order summary...');
      const response = await apiClient.get('/api/orders/summary');
      console.log('✅ Order summary response:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Order summary API failed:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      // Fallback to localStorage
      const localOrders = localStorage.getItem('speedcopy_orders');
      const orders: Order[] = localOrders ? JSON.parse(localOrders) : [];
      
      const summary: OrderSummary = {
        total_orders: orders.length,
        active_orders: orders.filter(o => !['delivered', 'cancelled', 'refunded'].includes(o.status)).length,
        delivered_orders: orders.filter(o => o.status === 'delivered').length,
        cancelled_orders: orders.filter(o => o.status === 'cancelled').length,
        status_counts: orders.reduce((acc, o) => {
          acc[o.status] = (acc[o.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        recent_orders: orders.slice(0, 5)
      };
      
      return this.wrapSuccess(summary);
    }
  }

  // ============================================
  // 3. Track Orders (1 API)
  // ============================================

  /**
   * 3.1 Track Order
   * GET /api/orders/{id}/track
   */
  async trackOrder(orderId: string): Promise<{ success: boolean; data: TrackingView }> {
    try {
      console.log('📍 Tracking order:', orderId);
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.ORDERS.TRACK(orderId));
      console.log('✅ Track order response:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Track order API failed:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      // Fallback - get order by ID and construct tracking view
      const orderResponse = await this.getOrderById(orderId);
      const order = orderResponse.data;
      
      const trackingView: TrackingView = {
        orderNumber: order.orderNumber,
        status: order.status,
        customerFacingStatus: order.customerFacingStatus,
        paymentStatus: order.paymentStatus,
        timeline: order.timeline,
        shippingAddress: order.shippingAddress,
        editWindow: order.editWindow,
        clarification: order.clarification,
        estimatedDelivery: order.deliveryEtaMinutes || 0,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      };
      
      return this.wrapSuccess(trackingView);
    }
  }

  // ============================================
  // 4. Update Orders (3 APIs)
  // ============================================

  /**
   * 4.1 Get Edit Window
   * GET /api/orders/{id}/edit-window
   */
  async getEditWindow(orderId: string): Promise<{ success: boolean; data: OrderEditWindow }> {
    try {
      console.log('⏰ Getting edit window for order:', orderId);
      const response = await apiClient.get(`/api/orders/${orderId}/edit-window`);
      console.log('✅ Edit window response:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ Get edit window API failed:', error);
      
      if (!this.isRouteNotFoundError(error)) throw error;
      
      // Fallback - get order and return edit window
      const orderResponse = await this.getOrderById(orderId);
      return this.wrapSuccess(orderResponse.data.editWindow);
    }
  }

  /**
   * 4.2 Update Before Production
   * PATCH /api/orders/{id}/before-production
   */
  async updateBeforeProduction(
    orderId: string, 
    data: UpdateBeforeProductionData
  ): Promise<{ success: boolean; data: Order; message: string }> {
    try {
      console.log('✏️ Updating order before production:', orderId, data);
      const response = await apiClient.patch(`/api/orders/${orderId}/before-production`, data);
      console.log('✅ Order updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Update before production failed:', error);
      throw error;
    }
  }

  /**
   * 4.3 Cancel Order (using updateBeforeProduction)
   */
  async cancelOrder(orderId: string, reason?: string): Promise<{ success: boolean; data: Order; message: string }> {
    return this.updateBeforeProduction(orderId, {
      cancelOrder: true,
      reason: reason || 'Cancelled by customer'
    });
  }

  // ============================================
  // 5. Reorder (1 API)
  // ============================================

  /**
   * 5.1 Reorder
   * POST /api/orders/{id}/reorder
   */
  async reorder(orderId: string): Promise<{ success: boolean; data: Order; message: string }> {
    try {
      console.log('🔄 Reordering:', orderId);
      const response = await apiClient.post(`/api/orders/${orderId}/reorder`);
      console.log('✅ Reorder created:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Reorder failed:', error);
      throw error;
    }
  }

  // ============================================
  // 6. Clarifications (1 API)
  // ============================================

  /**
   * 6.1 Respond to Clarification
   * POST /api/orders/{id}/clarification/respond
   */
  async respondClarification(
    orderId: string, 
    response: string
  ): Promise<{ success: boolean; data: Order; message: string }> {
    try {
      console.log('💬 Responding to clarification for order:', orderId);
      const apiResponse = await apiClient.post(`/api/orders/${orderId}/clarification/respond`, { response });
      console.log('✅ Clarification response submitted:', apiResponse.data);
      return apiResponse.data;
    } catch (error) {
      console.error('❌ Respond clarification failed:', error);
      throw error;
    }
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Check if order can be edited
   */
  async canEditOrder(orderId: string): Promise<boolean> {
    try {
      const response = await this.getEditWindow(orderId);
      return response.data.isEditable;
    } catch (error) {
      console.error('Failed to check edit window:', error);
      return false;
    }
  }

  /**
   * Check if order has pending clarification
   */
  async hasPendingClarification(orderId: string): Promise<boolean> {
    try {
      const response = await this.getOrderById(orderId);
      return response.data.clarification.isRequired && 
             response.data.clarification.status === 'requested';
    } catch (error) {
      console.error('Failed to check clarification status:', error);
      return false;
    }
  }

  /**
   * Get orders by status
   */
  async getOrdersByStatus(status: string): Promise<Order[]> {
    try {
      const response = await this.getMyOrders({ status });
      return response.data.orders;
    } catch (error) {
      console.error('Failed to get orders by status:', error);
      return [];
    }
  }

  /**
   * Get active orders (not delivered/cancelled)
   */
  async getActiveOrders(): Promise<Order[]> {
    try {
      const response = await this.getMyOrders();
      return response.data.orders.filter(
        order => !['delivered', 'cancelled', 'refunded'].includes(order.status)
      );
    } catch (error) {
      console.error('Failed to get active orders:', error);
      return [];
    }
  }
}

export default new OrderService();
