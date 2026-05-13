import { request } from './apiClient';

export type AdminDashboardResponse = {
  totalOrders?: number;
  totalRevenue?: number;
  totalUsers?: number;
  totalProducts?: number;
  pendingOrders?: number;
  completedOrders?: number;
  cancelledOrders?: number;
  refundCount?: number;
  walletBalance?: number;
  ordersByStatus?: Record<string, number>;
  recentOrders?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

export const getAdminDashboard = async (): Promise<AdminDashboardResponse> => {
  return await request('/admin/dashboard');
};

export const getAdminOrders = async (params?: {
  status?: string;
  vendorId?: string;
  userId?: string;
  page?: number;
  limit?: number;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/orders${query}`);
};

export const getAdminOrderById = async (id: string) => {
  return await request(`/admin/orders/${id}`);
};

export const reassignOrderVendor = async (id: string, data: { vendorId: string; storeId?: string }) => {
  return await request(`/admin/orders/${id}/reassign-vendor`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const cancelAdminOrder = async (id: string, reason?: string) => {
  return await request(`/admin/orders/${id}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
};

export const refundAdminOrder = async (id: string, refundId?: string) => {
  return await request(`/admin/orders/${id}/refund`, {
    method: 'PATCH',
    body: JSON.stringify({ refundId }),
  });
};

export const getAdminVendors = async (params?: {
  isApproved?: boolean;
  isSuspended?: boolean;
  page?: number;
  limit?: number;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/vendors${query}`);
};

export const getAdminVendorById = async (id: string) => {
  return await request(`/admin/vendors/${id}`);
};

export const suspendAdminVendor = async (id: string, reason?: string) => {
  return await request(`/admin/vendors/${id}/suspend`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
};

export const resumeAdminVendor = async (id: string, reason?: string) => {
  return await request(`/admin/vendors/${id}/suspend`, {
    method: 'PATCH',
    body: JSON.stringify({ isSuspended: false, reason }),
  });
};

export const approveAdminVendor = async (id: string, reason?: string) => {
  return await request(`/admin/vendors/${id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({ approved: true, reason }),
  });
};

export const rejectAdminVendor = async (id: string, reason?: string) => {
  return await request(`/admin/vendors/${id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({ approved: false, reason }),
  });
};

export const setAdminVendorPriority = async (id: string, priority: number) => {
  return await request(`/admin/vendors/${id}/priority`, {
    method: 'PATCH',
    body: JSON.stringify({ priority }),
  });
};

export const createAdminVendor = async (data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  location?: string;
  tier?: 'gold' | 'silver' | 'bronze';
}) => {
  return await request('/admin/vendors', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getAdminCustomers = async (params?: {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/customers${query}`);
};

export type AdminCustomerDetailResponse = {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinedDate: string;
  riskScore: number;
  status: string;
  orders: {
    total: number;
    completed: number;
    avgOrderValue: number;
    recentOrders: Array<{
      id: string;
      date: string;
      amount: number;
      status: string;
      type?: string;
    }>;
  };
  wallet: {
    balance: number;
    totalSpent: number;
    refundsReceived: number;
    transactions: Array<{
      id: string;
      date: string;
      amount: number;
      type: string;
      description: string;
      balance?: number;
    }>;
  };
  support: {
    ticketsRaised: number;
    openTickets: number;
    avgResolutionTime: number;
    tickets: Array<{
      id: string;
      date: string;
      subject: string;
      status: string;
      priority: string;
    }>;
  };
  activityLog: Array<{
    timestamp: string;
    action: string;
    type: string;
  }>;
  [key: string]: unknown;
};

export const getAdminCustomerById = async (id: string): Promise<AdminCustomerDetailResponse> => {
  return await request(`/admin/customers/${id}`);
};

export const restrictAdminCustomer = async (id: string, isActive: boolean, reason?: string) => {
  return await request(`/admin/customers/${id}/restrict`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive, reason }),
  });
};

export type AdminStaffResponse = {
  staff?: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    active: boolean;
    requiresApproval: boolean;
    permissions: string[];
    lastLogin?: string;
    createdAt: string;
  }>;
  [key: string]: unknown;
};

export const getAdminStaff = async (params?: {
  page?: number;
  limit?: number;
}): Promise<AdminStaffResponse> => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/staff${query}`);
};

export const createAdminStaff = async (data: { 
  name: string; 
  email: string; 
  phone?: string;
  password: string;
  role?: string;
  team?: string;
  permissions?: string[];
  scopes?: string[];
}) => {
  return await request('/admin/staff', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      password: data.password,
      role: data.role || 'staff',
      team: data.team || 'ops',
      permissions: data.permissions || [],
      scopes: data.scopes || [],
    }),
  });
};

export const updateAdminStaffRole = async (id: string, role: string) => {
  return await request(`/admin/staff/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
};

export const updateAdminStaffStatus = async (id: string, isActive: boolean, reason?: string) => {
  return await request(`/admin/staff/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive, reason }),
  });
};

export const deleteAdminStaff = async (id: string) => {
  return await request(`/admin/staff/${id}`, {
    method: 'DELETE',
  });
};

export type AdminControlStateResponse = {
  vendor_kill_switch?: boolean;
  system_kill_switch?: boolean;
  feature_flags?: Array<{
    id: string;
    name: string;
    desc: string;
    enabled: boolean;
  }>;
  [key: string]: unknown;
};

export const getAdminControlState = async (): Promise<AdminControlStateResponse> => {
  return await request('/admin/control');
};

export const setOrderIntake = async (enabled: boolean) => {
  return await request('/admin/control/order-intake', {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
};

export const setCityPause = async (city: string, paused: boolean, reason?: string): Promise<{
  pausedCities: string[];
  pausedCityDetails: Array<{ city: string; reason: string; pausedAt: string }>;
}> => {
  const body: Record<string, unknown> = { city, paused };
  if (reason) body.reason = reason;
  return await request('/admin/control/city-pause', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
};

export const setFeatureFlags = async (flags: Record<string, boolean>) => {
  return await request('/admin/control/feature-flags', {
    method: 'PATCH',
    body: JSON.stringify(flags),
  });
};

export type AdminReportsResponse = {
  revenue_by_day?: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  orders_by_flow?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  sla_compliance?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  orders_by_status?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  [key: string]: unknown;
};

export const getAdminReports = async (params?: {
  from?: string;
  to?: string;
  sla_metrics?: boolean;
}): Promise<AdminReportsResponse> => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/reports${query}`);
};

export const getAdminAuditLogs = async () => {
  return await request('/admin/audit-logs');
};

// Delivery partner management
export const getAdminDeliveryPartners = async (params?: {
  status?: string;
  city?: string;
  page?: number;
  limit?: number;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/delivery/partners${query}`);
};

export const getAdminDeliveryPartnerById = async (id: string) => {
  return await request(`/admin/delivery/partners/${id}`);
};

export const createAdminDeliveryPartner = async (data: { name: string; email?: string; phone?: string; vehicleType?: string; zoneAssignments?: string[] }) => {
  const payload: any = {
    name: data.name || '',
    email: data.email || `${(data.name || 'partner').replace(/\s+/g, '').toLowerCase()}@speedcopy.delivery`,
    phone: data.phone || '0000000000',
    vehicleType: data.vehicleType || 'bike',
    zoneAssignments: Array.isArray(data.zoneAssignments) ? data.zoneAssignments : [],
  };

  return await request('/admin/delivery/partners', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const updateAdminDeliveryPartner = async (id: string, data: Record<string, unknown>) => {
  const payload: any = {};
  
  if ((data as any).name) payload.name = (data as any).name;
  if ((data as any).phone) payload.phone = (data as any).phone;
  if ((data as any).vehicleType) payload.vehicleType = (data as any).vehicleType;

  return await request(`/admin/delivery/partners/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

export const deleteAdminDeliveryPartner = async (id: string) => {
  return await request(`/admin/delivery/partners/${id}`, {
    method: 'DELETE',
  });
};

export const suspendAdminDeliveryPartner = async (id: string, suspend = true) => {
  const path = `/admin/delivery/partners/${id}/${suspend ? 'suspend' : 'resume'}`;
  const options: any = { method: 'PATCH' };
  if (suspend) {
    options.body = JSON.stringify({ reason: 'suspended via admin UI' });
  }
  return await request(path, options);
};

export const setAdminDeliveryPayoutRate = async (id: string, rate: string) => {
  return await request(`/admin/delivery/partners/${id}/payout-rate`, {
    method: 'PATCH',
    body: JSON.stringify({ rate }),
  });
};

// Additional functions for compatibility
export type AdminCategoriesResponse = {
  categories?: Array<{
    id: string;
    name: string;
    description: string;
    active: boolean;
    products: number;
    subcategories: Array<{
      id: string;
      name: string;
      products: number;
    }>;
  }>;
  [key: string]: unknown;
};

export const getProductCategories = async (params?: {
  page?: number;
  limit?: number;
  flowType?: string;
}): Promise<AdminCategoriesResponse> => {
  const allParams = { showAll: 'true', ...params };
  const query = '?' + new URLSearchParams(
    Object.entries(allParams).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString();
  return await request(`/products/categories${query}`);
};

export const createProductCategory = async (data: {
  name: string;
  slug: string;
  description: string;
  icon: string;
  image?: string;
  flowType: string;
}) => {
  return await request('/products/categories', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      slug: data.slug,
      description: data.description,
      icon: data.icon,
      image: data.image || '',
      flowType: data.flowType,
    }),
  });
};

export const updateProductCategory = async (id: string, data: {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  image?: string;
  flowType?: string;
  active?: boolean;
  isActive?: boolean;
}) => {
  return await request(`/products/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: data.name,
      slug: data.slug,
      description: data.description,
      icon: data.icon,
      image: data.image,
      flowType: data.flowType,
      isActive: data.isActive ?? data.active,
    }),
  });
};

export const deleteProductCategory = async (id: string) => {
  return await request(`/products/categories/${id}`, {
    method: 'DELETE',
  });
};

export const createProduct = async (data: {
  name: string;
  category: string;
  basePrice: number;
  unit?: string;
  description?: string;
  flowType?: string;
  slug?: string;
}) => {
  const baseSlug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  const uniqueId = crypto.randomUUID?.()?.slice(0, 8) || Math.random().toString(36).slice(2, 10);
  const payload = {
    ...data,
    slug: `${baseSlug}-${uniqueId}`,
  };
  
  return await request('/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const updateProduct = async (id: string, data: {
  name?: string;
  category?: string;
  basePrice?: number;
  unit?: string;
  description?: string;
  active?: boolean;
  flowType?: string;
}) => {
  return await request(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteProduct = async (id: string) => {
  return await request(`/products/${id}`, {
    method: 'DELETE',
  });
};

export const getProducts = async (params?: {
  flowType?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/products${query}`);
};

// ─── Business Printing ────────────────────────────────────────────────────────

export const getBusinessPrintingProducts = async (params?: {
  type?: string;
  page?: number;
  limit?: number;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/business-printing/products${query}`);
};

export const adminUploadImage = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('image', file);
  const token = localStorage.getItem('admin_token');
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'}/admin-shop/catalog/uploads`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await response.json();
  return { url: data?.data?.url || data?.url || '' };
};

export const createBusinessPrintingProduct = async (data: {
  name: string;
  businessPrintType: string;
  basePrice: number;
  description?: string;
  images?: string[];
  thumbnail?: string;
  designMode?: string;
  isFeatured?: boolean;
  isActive?: boolean;
}) => {
  const baseSlug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  const uniqueId = crypto.randomUUID?.()?.slice(0, 8) || Math.random().toString(36).slice(2, 10);
  return await request('/products', {
    method: 'POST',
    body: JSON.stringify({ ...data, flowType: 'printing', slug: `${baseSlug}-${uniqueId}` }),
  });
};

export const updateBusinessPrintingProduct = async (id: string, data: Record<string, unknown>) => {
  return await request(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteBusinessPrintingProduct = async (id: string) => {
  return await request(`/products/${id}`, {
    method: 'DELETE',
  });
};

export const createBusinessPrintingServicePackage = async (data: {
  name: string;
  description: string;
  deliveryDays: string;
  price: number;
  isDefault?: boolean;
}) => {
  return await request('/business-printing/service-packages', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getWalletOverview = async () => {
  return await request('/admin/finance/summary');
};

export const getWalletLedger = async (params?: {
  page?: number;
  limit?: number;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/wallet/ledger${query}`);
};

export const getAdminFinanceSummary = async () => {
  return await request('/admin/finance/summary');
};

export const processAdminRefund = async (orderId: string, data: {
  amount: number;
  customerId: string;
  reason?: string;
}) => {
  return await request(`/admin/orders/${orderId}/refund`, {
    method: 'PATCH',
    body: JSON.stringify({ refundId: `refund_${Date.now()}`, reason: data.reason }),
  });
};

export const updateAdminOrderStatus = async (id: string, data: Record<string, unknown>) => {
  return await request(`/admin/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const updateAdminControl = async (path: string, payload: Record<string, unknown>) => {
  return await request(`/admin/control/${path}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
};

export const getTickets = async (params?: {
  page?: number;
  limit?: number;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/tickets${query}`);
};

export const getTicketSummary = async () => {
  return await request('/admin/tickets/stats');
};

export const getAuthMe = async () => {
  return await request('/auth/me');
};

// ─── TICKET MANAGEMENT ─────────────────────────────────────

export const resolveTicket = async (ticketId: string, resolution: string, resolutionNotes?: string) => {
  return await request(`/admin/tickets/${ticketId}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify({ resolution, resolutionNotes }),
  });
};

export const assignTicket = async (ticketId: string, staffId: string) => {
  return await request(`/admin/tickets/${ticketId}/assign`, {
    method: 'PATCH',
    body: JSON.stringify({ assignedTo: staffId }),
  });
};

export const addTicketMessage = async (ticketId: string, content: string) => {
  return await request(`/admin/tickets/${ticketId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message: content }),
  });
};

export const getTicketStats = async (params?: { from?: string; to?: string }) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/tickets/stats${query}`);
};

export const getAgentPerformance = async (params?: { from?: string; to?: string }) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/tickets/agents/performance${query}`);
};

export const getTicketDetail = async (ticketId: string) => {
  return await request(`/admin/tickets/${ticketId}`);
};

export const escalateTicket = async (ticketId: string, reason: string) => {
  return await request(`/admin/tickets/${ticketId}/escalate`, {
    method: 'PATCH',
    body: JSON.stringify({ message: reason }),
  });
};

// ─── SLA MANAGEMENT ────────────────────────────────────────

export const getSLARisks = async (params?: {
  status?: string;
  severity?: string;
  page?: number;
  limit?: number;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/sla/risks${query}`);
};

export const escalateOrder = async (orderId: string, note: string, priority?: string, assignTo?: string) => {
  return await request(`/admin/sla/${orderId}/escalate`, {
    method: 'POST',
    body: JSON.stringify({ note, priority, assignTo }),
  });
};

export const compensateOrder = async (orderId: string, compensationType: string, compensationValue: number, reason?: string) => {
  return await request(`/admin/sla/${orderId}/compensate`, {
    method: 'POST',
    body: JSON.stringify({ compensationType, compensationValue, reason }),
  });
};

export const getSLAPolicies = async () => {
  return await request('/admin/sla/policies');
};

export const createSLAPolicy = async (data: {
  name: string;
  description?: string;
  flowType: string;
  fromStatus: string;
  toStatus: string;
  maxMinutes: number;
  warningMinutes: number;
  escalationLevel?: string;
  compensationType: string;
  compensationValue: number;
}) => {
  return await request('/admin/sla/policies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getSLAMetrics = async (params?: { from?: string; to?: string }) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/sla/metrics${query}`);
};

export const getSLABreaches = async (params?: {
  vendorId?: string;
  page?: number;
  limit?: number;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/sla/breaches${query}`);
};

// ─── DELIVERY PARTNER ENHANCEMENTS ─────────────────────────

export const assignDeliveryZones = async (partnerId: string, zones: any[]) => {
  return await request(`/admin/delivery/partners/${partnerId}/zones`, {
    method: 'POST',
    body: JSON.stringify({ zones }),
  });
};

export const setDeliveryPayoutRate = async (partnerId: string, payoutRate: number, effectiveFrom?: string) => {
  return await request(`/admin/delivery/partners/${partnerId}/payout-rate`, {
    method: 'PATCH',
    body: JSON.stringify({ payoutRate, effectiveFrom }),
  });
};

export const getDeliverySLAMetrics = async (params?: {
  partnerId?: string;
  from?: string;
  to?: string;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/delivery/sla-metrics${query}`);
};

export const getDeliveryPartnerAnalytics = async (partnerId: string, params?: {
  from?: string;
  to?: string;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/delivery/partners/${partnerId}/analytics${query}`);
};

export const resumeDeliveryPartner = async (partnerId: string) => {
  return await request(`/admin/delivery/partners/${partnerId}/resume`, {
    method: 'PATCH',
  });
};

// ─── SHOP / GIFTING PRODUCT DISCOUNT ──────────────────────

export const patchProductDiscount = async (
  id: string,
  flowType: 'shop' | 'gifting',
  data: {
    mrp?: number;
    sale_price?: number;
    discount_pct?: number;
    badge?: string | null;
    note?: string;
  }
) => {
  const base = flowType === 'gifting' ? '/admin/gifting/products' : '/admin/shop/products';
  return await request(`${base}/${id}/discount`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const bulkDiscountProducts = async (data: {
  product_ids: string[];
  discount_pct?: number;
  badge?: string;
  note?: string;
  flowType?: 'shop' | 'gifting';
}) => {
  const base = data.flowType === 'gifting' ? '/admin/gifting/products' : '/admin/shop/products';
  return await request(`${base}/bulk-discount`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const getProductDiscountHistory = async (id: string, flowType?: 'shop' | 'gifting') => {
  const base = flowType === 'gifting' ? '/admin/gifting/products' : '/admin/shop/products';
  return await request(`${base}/${id}/discount-history`);
};

// ─── COUPON MANAGEMENT ─────────────────────────────────────

export const getCoupons = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/coupons${query}`);
};

export const createCoupon = async (data: {
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount?: number;
  minOrderValue?: number;
  applicableFlows?: string[];
  usageLimit?: number;
  perUserLimit?: number;
  isActive?: boolean;
  expiresAt?: string;
}) => {
  return await request('/admin/coupons', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateCoupon = async (id: string, data: {
  code?: string;
  description?: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  maxDiscount?: number;
  minOrderValue?: number;
  applicableFlows?: string[];
  usageLimit?: number;
  perUserLimit?: number;
  isActive?: boolean;
  expiresAt?: string;
}) => {
  return await request(`/admin/coupons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteCoupon = async (id: string) => {
  return await request(`/admin/coupons/${id}`, {
    method: 'DELETE',
  });
};

export const getCouponUsage = async (id: string) => {
  return await request(`/admin/coupons/${id}/usage`);
};

export const toggleCoupon = async (id: string, isActive: boolean) => {
  return await updateCoupon(id, { isActive });
};

// ─── Profiles API ──────────────────────────────────────────

export const getAdminProfiles = async (params?: {
  status?: string;
  team?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/profiles${query}`);
};

export const createAdminProfile = async (data: {
  fullName: string;
  emailAddress: string;
  password: string;
  role?: string;
  team?: string;
  permissions?: string[];
  scopes?: string[];
  phone?: string;
}) => {
  return await request('/admin/profiles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getAdminProfileById = async (id: string) => {
  return await request(`/admin/profiles/${id}`);
};

export const updateAdminProfile = async (id: string, data: {
  fullName?: string;
  emailAddress?: string;
  phone?: string;
  role?: string;
  team?: string;
  permissions?: string[];
  scopes?: string[];
  isActive?: boolean;
}) => {
  return await request(`/admin/profiles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const deleteAdminProfile = async (id: string) => {
  return await request(`/admin/profiles/${id}`, {
    method: 'DELETE',
  });
};

export const getMyAdminProfile = async () => {
  return await request('/admin/profile');
};

export const updateMyAdminProfile = async (data: {
  fullName?: string;
  emailAddress?: string;
  phone?: string;
  role?: string;
  team?: string;
}) => {
  return await request('/admin/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

// ─── REPORTS — Referrals & Export ──────────────────────────────────────────

export const getAdminReferralsReport = async (params?: { from?: string; to?: string }) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/reports/referrals${query}`);
};

export const exportAdminReport = async (params: {
  type: 'orders' | 'invoices' | 'revenue' | 'audit_logs' | 'audit' | 'referrals';
  format?: 'json' | 'csv' | 'excel' | 'xlsx' | 'pdf';
  from?: string;
  to?: string;
  limit?: number;
}): Promise<Response> => {
  const token = localStorage.getItem('admin_token');
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
  const query = '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString();
  // Return raw Response so caller can handle blob (CSV/PDF) or JSON
  return fetch(`${API_BASE_URL}/admin/reports/export${query}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};

export const getComplianceSummary = async () => {
  return await request('/admin/control/compliance-summary');
};

// ─── RISK CASES ─────────────────────────────────────────────────────────────

export const getRiskCases = async (params?: {
  status?: string;
  severity?: string;
  category?: string;
  entityType?: string;
  assignedTo?: string;
  identityId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined) acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/risk/cases${query}`);
};

export const getRiskCasesSummary = async () => {
  return await request('/admin/risk/cases/summary');
};

export const getRiskCaseById = async (id: string) => {
  return await request(`/admin/risk/cases/${id}`);
};

export const createRiskCase = async (data: {
  subject: string;
  entityType?: string;
  entityId?: string;
  category?: string;
  severity?: string;
  status?: string;
  description?: string;
  evidence?: string[];
  assignedTo?: string;
  tags?: string[];
}) => {
  return await request('/admin/risk/cases', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateRiskCase = async (id: string, data: {
  subject?: string;
  entityType?: string;
  entityId?: string;
  category?: string;
  severity?: string;
  status?: string;
  description?: string;
  assignedTo?: string;
  tags?: string[];
  resolution?: string;
  evidence?: string[];
  note?: string;
}) => {
  return await request(`/admin/risk/cases/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const addRiskCaseAction = async (id: string, data: {
  action?: string;
  note?: string;
  metadata?: Record<string, unknown>;
}) => {
  return await request(`/admin/risk/cases/${id}/actions`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// ─── PRODUCT TYPES ──────────────────────────────────────────────────────────

export const getProductTypes = async (params?: { page?: number; limit?: number }) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [k, v]) => { if (v !== undefined) acc[k] = String(v); return acc; }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/products/product-types${query}`);
};

export const createProductType = async (data: {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
}) => {
  return await request('/products/product-types', { method: 'POST', body: JSON.stringify(data) });
};

export const updateProductType = async (id: string, data: Record<string, unknown>) => {
  return await request(`/products/product-types/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
};

export const deleteProductType = async (id: string) => {
  return await request(`/products/product-types/${id}`, { method: 'DELETE' });
};

// ─── VARIANTS ───────────────────────────────────────────────────────────────

export const getAdminVariants = async (params?: {
  productId?: string;
  page?: number;
  limit?: number;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [k, v]) => { if (v !== undefined) acc[k] = String(v); return acc; }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/products/variants${query}`);
};

export const getAdminVariantsByProduct = async (productId: string) => {
  return await request(`/products/variants/product/${productId}`);
};

export const createAdminVariant = async (data: {
  product: string;          // Backend expects 'product' (ObjectId)
  productTypeId?: string;
  name: string;
  sku: string;
  price: number;
  mrp?: number;
  specifications?: Record<string, string>;
  isActive?: boolean;
}) => {
  return await request('/products/variants', { method: 'POST', body: JSON.stringify(data) });
};

export const updateAdminVariant = async (id: string, data: Record<string, unknown>) => {
  return await request(`/products/variants/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
};

export const deleteAdminVariant = async (id: string) => {
  return await request(`/products/variants/${id}`, { method: 'DELETE' });
};

// ─── PUBLIC CATALOG DISCOVERY ────────────────────────────────────────────────

export const getPublicProductTypes = async () => {
  return await request('/products/product-types');
};

export const getPublicVariants = async (params?: {
  productId?: string;
  categoryId?: string;
  productTypeId?: string;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [k, v]) => { if (v !== undefined) acc[k] = String(v); return acc; }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/products/variants${query}`);
};

export const getPublicVariantsByProduct = async (productId: string) => {
  return await request(`/products/variants/product/${productId}`);
};

// ─── ADMIN SHOPPING PRODUCTS ─────────────────────────────────────────────────

export const getAdminShoppingProducts = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [k, v]) => { if (v !== undefined) acc[k] = String(v); return acc; }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin/shop/products${query}`);
};

export const createAdminShoppingProduct = async (data: Record<string, unknown>) => {
  return await request('/admin/shop/products', { method: 'POST', body: JSON.stringify(data) });
};

export const updateAdminShoppingProduct = async (id: string, data: Record<string, unknown>) => {
  return await request(`/admin/shop/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
};

// ─── TEMPLATE DEFINITIONS ───────────────────────────────────────────────────

export const getTemplateDefinitions = async (params?: { variantId?: string; page?: number; limit?: number }) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [k, v]) => { if (v !== undefined) acc[k] = String(v); return acc; }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/designs/admin/template-definitions${query}`);
};

export const createTemplateDefinition = async (data: {
  variantId: string;
  name: string;
  version?: number;
  assets?: {
    editorBaseImage?: string;
    overlayImage?: string;
    maskImage?: string;
    mockupSceneImage?: string;
  };
  canvas?: { width: number; height: number; unit?: string; dpi?: number };
  slots?: Array<{
    slotId: string;
    name: string;
    type: 'image' | 'text';
    geometry: { x: number; y: number; width: number; height: number; shape?: string };
    behavior?: {
      movable?: boolean;
      resizable?: boolean;
      cropEnabled?: boolean;
      zoomEnabled?: boolean;
      rotateEnabled?: boolean;
    };
    imageConfig?: {
      fitMode?: string;
      minZoom?: number;
      maxZoom?: number;
      acceptedMimeTypes?: string[];
      maxFileSizeMb?: number;
    };
    textConfig?: {
      maxLength?: number;
      minLength?: number;
      allowedFonts?: string[];
      defaultFont?: string;
      defaultFontSize?: number;
      defaultColor?: string;
      allowedAlignments?: string[];
    };
    required?: boolean;
  }>;
  previewConfig?: { renderer?: string; livePreview?: boolean };
  rules?: { allowFreeDesign?: boolean };
}) => {
  return await request('/designs/admin/template-definitions', { method: 'POST', body: JSON.stringify(data) });
};

export const updateTemplateDefinition = async (id: string, data: Record<string, unknown>) => {
  return await request(`/designs/admin/template-definitions/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
};

export const publishTemplateDefinition = async (id: string) => {
  return await request(`/designs/admin/template-definitions/${id}/publish`, { method: 'POST' });
};

// ─── DESIGN SYSTEM (Public & User Customization) ────────────────────────────

// Template Configuration (Public)
export const getTemplateConfig = async (variantId: string) => {
  return await request(`/designs/template-config/${variantId}`);
};

// User Customization Flow
export const createCustomization = async (data: {
  variantId: string;
  templateDefinitionId?: string;
  customData?: Record<string, unknown>;
}) => {
  return await request('/designs/customizations', { method: 'POST', body: JSON.stringify(data) });
};

export const getCustomization = async (id: string) => {
  return await request(`/designs/customizations/${id}`);
};

export const uploadCustomizationAsset = async (id: string, formData: FormData) => {
  return await request(`/designs/customizations/${id}/assets`, {
    method: 'POST',
    body: formData,
    headers: {}, // Let browser set Content-Type for FormData
  });
};

export const updateCustomizationSlot = async (id: string, slotId: string, data: Record<string, unknown>) => {
  return await request(`/designs/customizations/${id}/slots/${slotId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const renderCustomizationPreview = async (id: string, options?: {
  format?: string;
  quality?: number;
  width?: number;
  height?: number;
}) => {
  return await request(`/designs/customizations/${id}/render-preview`, {
    method: 'POST',
    body: JSON.stringify(options || {}),
  });
};

export const finalizeCustomization = async (id: string, data?: {
  finalizeOptions?: Record<string, unknown>;
}) => {
  return await request(`/designs/customizations/${id}/finalize`, {
    method: 'POST',
    body: JSON.stringify(data || {}),
  });
};



// ─── PUBLIC SHOPPING & GIFTING PRODUCTS ──────────────────────────────────────

// Shopping Products (Public)
export const getShopProducts = async (params?: {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [k, v]) => { if (v !== undefined) acc[k] = String(v); return acc; }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/shop/products${query}`);
};

export const getShopProductBySlug = async (slug: string) => {
  return await request(`/shop/products/${slug}`);
};

export const getShoppingProducts = async (params?: {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [k, v]) => { if (v !== undefined) acc[k] = String(v); return acc; }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/shopping/products${query}`);
};

export const getShoppingProductByIdentifier = async (identifier: string) => {
  return await request(`/shopping/products/${identifier}`);
};

// Gifting Products (Public)
export const getGiftingProducts = async (params?: {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  occasion?: string;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [k, v]) => { if (v !== undefined) acc[k] = String(v); return acc; }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/gifting/products${query}`);
};

export const getGiftingProductByIdentifier = async (identifier: string) => {
  return await request(`/gifting/products/${identifier}`);
};

// ─── CART MANAGEMENT ─────────────────────────────────────────────────────────

export const getCart = async () => {
  return await request('/cart');
};

export const addToCart = async (data: {
  productId: string;
  variantId?: string;
  quantity: number;
  customizationId?: string;
  flowType?: 'shop' | 'gifting';
}) => {
  return await request('/cart', { method: 'POST', body: JSON.stringify(data) });
};

export const updateCartItem = async (itemId: string, data: {
  quantity?: number;
  customizationId?: string;
}) => {
  return await request(`/cart/${itemId}`, { method: 'PATCH', body: JSON.stringify(data) });
};

export const removeCartItem = async (itemId: string) => {
  return await request(`/cart/${itemId}`, { method: 'DELETE' });
};

export const clearCart = async () => {
  return await request('/cart/clear', { method: 'DELETE' });
};

export const applyCouponToCart = async (data: {
  couponCode: string;
}) => {
  return await request('/cart/apply-coupon', { method: 'POST', body: JSON.stringify(data) });
};

// ─── ADMIN SHOPPING & GIFTING PRODUCTS ───────────────────────────────────────

// Admin Shopping Products
export const getAdminShopProducts = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [k, v]) => { if (v !== undefined) acc[k] = String(v); return acc; }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin-shop/shop/products${query}`);
};

export const createAdminShopProduct = async (data: Record<string, unknown>) => {
  return await request('/admin-shop/shop/products', { method: 'POST', body: JSON.stringify(data) });
};

export const updateAdminShopProduct = async (id: string, data: Record<string, unknown>) => {
  return await request(`/admin-shop/shop/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
};

export const patchAdminShopProductDiscount = async (id: string, data: {
  mrp?: number;
  sale_price?: number;
  discount_pct?: number;
  badge?: string | null;
}) => {
  return await request(`/admin-shop/shop/products/${id}/discount`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const deleteAdminShopProduct = async (id: string) => {
  return await request(`/admin-shop/shop/products/${id}`, { method: 'DELETE' });
};

// Admin Gifting Products
export const getAdminGiftingProducts = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  occasion?: string;
}) => {
  const query = params ? '?' + new URLSearchParams(
    Object.entries(params).reduce((acc, [k, v]) => { if (v !== undefined) acc[k] = String(v); return acc; }, {} as Record<string, string>)
  ).toString() : '';
  return await request(`/admin-shop/gifting/products${query}`);
};

export const createAdminGiftingProduct = async (data: Record<string, unknown>) => {
  return await request('/admin-shop/gifting/products', { method: 'POST', body: JSON.stringify(data) });
};

export const updateAdminGiftingProduct = async (id: string, data: Record<string, unknown>) => {
  return await request(`/admin-shop/gifting/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
};

export const patchAdminGiftingProductDiscount = async (id: string, data: {
  mrp?: number;
  sale_price?: number;
  discount_pct?: number;
  badge?: string | null;
}) => {
  return await request(`/admin-shop/gifting/products/${id}/discount`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const deleteAdminGiftingProduct = async (id: string) => {
  return await request(`/admin-shop/gifting/products/${id}`, { method: 'DELETE' });
};

// ─── MEDIA & FILE MANAGEMENT ─────────────────────────────────────────────────

export const uploadCatalogImage = async (formData: FormData) => {
  return await request('/admin-shop/catalog/uploads/images', {
    method: 'POST',
    body: formData,
    headers: {},
  });
};

// Alias — same controller
export const uploadCatalogFile = async (formData: FormData) => {
  return await request('/admin-shop/catalog/uploads', {
    method: 'POST',
    body: formData,
    headers: {},
  });
};

// Legacy aliases kept for backward compat
export const uploadCategoryImages = uploadCatalogImage;
export const uploadBusinessPrintingFile = uploadCatalogFile;
export const uploadPrintingFile = uploadCatalogFile;




