import { API_ENDPOINTS } from "../config/api";
import { apiRequest, ApiError, getAuthToken } from "./api";
import { API_BASE_URL, DEFAULT_GATEWAY_API_BASE_URL, FINANCE_BASE_URL } from "../config/api";
import type {
  ApiEnvelope,
  AuthUser,
  PaginatedVendorOrders,
  VendorOrder,
  VendorPerformance,
  VendorProfile,
  VendorStaff,
  VendorStore,
  CreateStorePayload,
  UpdateStoreCapacityPayload,
  StoreCapabilities,
  NearbyStoresResponse,
  SupportSummaryResponse,
  SupportTicket,
  SupportTicketListResponse,
  VendorWalletSummary,
  VendorStoreWiseEarnings,
  VendorWalletDeductionsResponse,
  VendorClosure,
  VendorPayoutSchedule,
  VendorPayoutHistory,
  VendorFinanceSummaryResponse,
  VendorFinancePayoutHistoryResponse,
  VendorPerformanceScore,
  VendorDetailedScore,
  VendorOrderClosure,
} from "../types/vendor";

export const OWNER_PERMISSIONS = [
  "view_all",
  "edit_all",
  "financial_access",
  "user_management",
  "org_settings",
  "store_management",
  "staff_management",
  "edit_operations",
  "edit_production",
  "job_management",
] as const;

// ============================================
// AUTH APIs
// ============================================

export async function loginVendor(email: string, password: string) {
  return apiRequest<ApiEnvelope<{ user: AuthUser; token: string }>>(
    API_ENDPOINTS.auth.login,
    {
      method: "POST",
      body: JSON.stringify({ email, password }), // spec: no role field
    }
  );
}

export async function verifyMfa(code: string) {
  return apiRequest<ApiEnvelope<{ verified: boolean }>>(
    API_ENDPOINTS.auth.mfaVerify,
    {
      method: "POST",
      body: JSON.stringify({ otp: code }), // spec: field name is "otp"
    }
  );
}

export async function logoutVendor() {
  return apiRequest<ApiEnvelope<null>>(API_ENDPOINTS.auth.logout, {
    method: "POST",
  });
}

export async function getVendorSession() {
  return apiRequest<ApiEnvelope<{ user: AuthUser }>>(API_ENDPOINTS.auth.session);
}

export async function verifyVendorFirebaseToken(idToken: string) {
  return apiRequest<
    ApiEnvelope<{
      user: AuthUser;
    }>
  >(API_ENDPOINTS.auth.verify, {
    method: "POST",
    body: JSON.stringify({ idToken, role: "vendor" }),
  });
}

export async function getCurrentUser() {
  return apiRequest<ApiEnvelope<{ user: AuthUser }>>(API_ENDPOINTS.auth.me);
}

// ============================================
// ORGANIZATION APIs
// ============================================

export async function getVendorProfile() {
  return apiRequest<ApiEnvelope<VendorProfile>>(API_ENDPOINTS.vendor.profile);
}

export async function updateVendorProfile(payload: Partial<VendorProfile>) {
  return apiRequest<ApiEnvelope<VendorProfile>>(API_ENDPOINTS.vendor.profile, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function getLegalDocs() {
  return apiRequest<ApiEnvelope<any>>(API_ENDPOINTS.vendor.legal);
}

export async function uploadLegalDocs(payload: any) {
  return apiRequest<ApiEnvelope<any>>(API_ENDPOINTS.vendor.legal, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Multipart upload — files + text fields
export async function uploadLegalDocsFormData(formData: FormData) {
  const token = getAuthToken();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Do NOT set Content-Type — browser sets it with boundary automatically

  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.vendor.legal}`, {
    method: "POST",
    headers,
    body: formData,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new ApiError(message, response.status);
  }
  if (payload == null) throw new ApiError("Empty response", response.status || 500);
  return payload as ApiEnvelope<any>;
}

export async function getAgreement() {
  return apiRequest<ApiEnvelope<any>>(API_ENDPOINTS.vendor.agreement);
}

// ============================================
// VENDOR-ORG APIs (alternate org routes)
// ============================================

export async function getVendorOrgLegal() {
  return apiRequest<ApiEnvelope<any>>(API_ENDPOINTS.vendor.vendorOrgLegal);
}

export async function uploadVendorOrgLegal(payload: any) {
  return apiRequest<ApiEnvelope<any>>(API_ENDPOINTS.vendor.vendorOrgLegal, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getVendorOrgAgreement() {
  return apiRequest<ApiEnvelope<any>>(API_ENDPOINTS.vendor.vendorOrgAgreement);
}

// ============================================
// STORES APIs
// ============================================

export async function getNearbyStores(params: {
  lat: number;
  lng: number;
  radius?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  query.set("lat", params.lat.toString());
  query.set("lng", params.lng.toString());
  if (params.radius != null) query.set("radius", params.radius.toString());
  if (params.limit  != null) query.set("limit",  params.limit.toString());

  return apiRequest<ApiEnvelope<NearbyStoresResponse>>(
    `${API_ENDPOINTS.vendor.storesNearby}?${query.toString()}`
  );
}

export async function getVendorStores() {
  return apiRequest<ApiEnvelope<VendorStore[]>>(API_ENDPOINTS.vendor.stores);
}

export async function getVendorStore(id: string) {
  return apiRequest<ApiEnvelope<VendorStore>>(API_ENDPOINTS.vendor.storeById(id));
}

export async function createVendorStore(payload: CreateStorePayload) {
  return apiRequest<ApiEnvelope<VendorStore>>(API_ENDPOINTS.vendor.stores, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateVendorStore(id: string, payload: Partial<Omit<VendorStore, "_id" | "vendorId" | "userId" | "createdAt" | "updatedAt" | "deletedAt">>) {
  return apiRequest<ApiEnvelope<VendorStore>>(API_ENDPOINTS.vendor.storeById(id), {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function updateVendorStoreStatus(id: string, isActive: boolean) {
  return apiRequest<ApiEnvelope<VendorStore>>(API_ENDPOINTS.vendor.storeStatus(id), {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

// availabilityReason is auto-set by backend:
//   isAvailable: false → "Marked unavailable by vendor"
//   isAvailable: true  → reason cleared
export async function updateVendorStoreAvailability(id: string, isAvailable: boolean) {
  return apiRequest<ApiEnvelope<VendorStore>>(API_ENDPOINTS.vendor.storeAvailability(id), {
    method: "PATCH",
    body: JSON.stringify({ isAvailable }),
  });
}

// Backend spec: capacity is nested under "capacity" key
// PUT /api/vendor/stores/:id/capacity → { capacity: { maxOrdersPerDay, currentLoad, dailyLimit, maxConcurrentOrders } }
export async function updateVendorStoreCapacity(id: string, payload: UpdateStoreCapacityPayload) {
  return apiRequest<ApiEnvelope<VendorStore>>(API_ENDPOINTS.vendor.storeCapacity(id), {
    method: "PUT",
    body: JSON.stringify({ capacity: payload }),
  });
}

export async function getStoreCapabilities(id: string) {
  return apiRequest<ApiEnvelope<StoreCapabilities>>(API_ENDPOINTS.vendor.storeCapabilities(id));
}

async function requestFromBase<T>(baseUrl: string, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  const token = getAuthToken();

  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(payload?.message || `HTTP ${response.status}: ${response.statusText}`, response.status);
  }

  if (payload == null) {
    throw new ApiError("Empty or invalid server response", response.status || 500);
  }

  return payload as T;
}

export async function deleteVendorStore(id: string) {
  const path = API_ENDPOINTS.vendor.storeDelete(id);

  try {
    return await apiRequest<ApiEnvelope<null>>(path, { method: "DELETE" });
  } catch (err) {
    const canRetryViaGateway =
      err instanceof ApiError &&
      err.status === 404 &&
      /route not found/i.test(err.message) &&
      API_BASE_URL !== DEFAULT_GATEWAY_API_BASE_URL;

    if (canRetryViaGateway) {
      return requestFromBase<ApiEnvelope<null>>(DEFAULT_GATEWAY_API_BASE_URL, path, { method: "DELETE" });
    }

    throw err;
  }
}

// ============================================
// STAFF APIs
// ============================================

export async function getVendorStaff() {
  return apiRequest<ApiEnvelope<VendorStaff[]>>(API_ENDPOINTS.vendor.staff);
}

export async function createVendorStaff(payload: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: "manager" | "operator" | "qc";
  storeId?: string;
  assignedStoreIds?: string[];
}) {
  return apiRequest<ApiEnvelope<VendorStaff>>(API_ENDPOINTS.vendor.staff, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateVendorStaff(id: string, payload: Partial<VendorStaff>) {
  return apiRequest<ApiEnvelope<VendorStaff>>(API_ENDPOINTS.vendor.staffById(id), {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function updateVendorStaffStatus(id: string, isActive: boolean) {
  return apiRequest<ApiEnvelope<VendorStaff>>(API_ENDPOINTS.vendor.staffStatus(id), {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

export async function assignStaffStores(id: string, assignedStoreIds: string[]) {
  return apiRequest<ApiEnvelope<VendorStaff>>(API_ENDPOINTS.vendor.staffAssignStores(id), {
    method: "PATCH",
    body: JSON.stringify({ assignedStoreIds }),
  });
}

// ============================================
// ORDERS APIs
// ============================================

export async function getVendorOrders(status?: string) {
  // If a specific status is requested, fetch only that
  if (status && status !== "all") {
    return apiRequest<ApiEnvelope<PaginatedVendorOrders>>(
      `${API_ENDPOINTS.vendor.ordersAssigned}?status=${encodeURIComponent(status)}`
    );
  }

  // Fetch active + delivered + cancelled in parallel and merge
  const activeStatuses = [
    "assigned_vendor",
    "vendor_accepted",
    "in_production",
    "qc_pending",
    "ready_for_pickup",
    "out_for_delivery",
  ];
  const terminalStatuses = ["delivered", "cancelled"];

  const [activeRes, ...terminalRes] = await Promise.all([
    // Active orders (no filter = all active)
    apiRequest<ApiEnvelope<PaginatedVendorOrders>>(API_ENDPOINTS.vendor.ordersAssigned),
    // Terminal status orders
    ...terminalStatuses.map(s =>
      apiRequest<ApiEnvelope<PaginatedVendorOrders>>(
        `${API_ENDPOINTS.vendor.ordersAssigned}?status=${s}`
      ).catch(() => ({ success: true, message: "", data: { orders: [], meta: {} } } as unknown as ApiEnvelope<PaginatedVendorOrders>))
    ),
  ]);

  // Merge all orders, deduplicate by _id
  const allOrders = [
    ...(activeRes.data.orders || []),
    ...terminalRes.flatMap(r => r.data.orders || []),
  ];
  const seen = new Set<string>();
  const uniqueOrders = allOrders.filter(o => {
    if (seen.has(o._id)) return false;
    seen.add(o._id);
    return true;
  });

  // Sort: active first (by createdAt desc), then terminal
  const activeSet = new Set(activeStatuses);
  uniqueOrders.sort((a, b) => {
    const aActive = activeSet.has(a.status) ? 0 : 1;
    const bActive = activeSet.has(b.status) ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  return {
    ...activeRes,
    data: {
      ...activeRes.data,
      orders: uniqueOrders,
      meta: { ...activeRes.data.meta, total: uniqueOrders.length },
    },
  };
}

export async function getVendorOrder(id: string) {
  return apiRequest<ApiEnvelope<VendorOrder>>(API_ENDPOINTS.vendor.orderById(id));
}

export async function acceptVendorOrder(id: string) {
  return apiRequest<ApiEnvelope<VendorOrder>>(API_ENDPOINTS.vendor.acceptOrder(id), {
    method: "POST",
  });
}

export async function rejectVendorOrder(id: string, reason: string) {
  return apiRequest<ApiEnvelope<VendorOrder>>(API_ENDPOINTS.vendor.rejectOrder(id), {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function updateOrderStatus(id: string, status: string, note?: string) {
  return apiRequest<ApiEnvelope<VendorOrder>>(API_ENDPOINTS.vendor.updateOrderStatus(id), {
    method: "POST",
    body: JSON.stringify({ status, note }),
  });
}

export async function uploadQcImages(id: string, images: string[], note?: string) {
  return apiRequest<ApiEnvelope<VendorOrder>>(API_ENDPOINTS.vendor.qcUpload(id), {
    method: "POST",
    body: JSON.stringify({ images, note }),
  });
}

export async function uploadQcImagesMultipart(id: string, files: File[], note?: string) {
  const formData = new FormData();
  
  // Add files
  files.forEach((file) => {
    formData.append(`images`, file);
  });
  
  // Add note if provided
  if (note) {
    formData.append("note", note);
  }

  const token = getAuthToken();
  const headers = new Headers();
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.vendor.qcUpload(id)}`, {
    method: "POST",
    headers,
    body: formData,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new ApiError(message, response.status);
  }

  if (payload == null) {
    throw new ApiError("Empty or invalid server response", response.status || 500);
  }

  return payload as ApiEnvelope<VendorOrder>;
}

export async function markOrderReady(id: string) {
  return apiRequest<ApiEnvelope<VendorOrder>>(API_ENDPOINTS.vendor.markReady(id), {
    method: "POST",
  });
}

// ============================================
// ANALYTICS APIs
// ============================================

export async function getVendorPerformance() {
  return apiRequest<ApiEnvelope<VendorPerformance>>(API_ENDPOINTS.vendor.performance);
}

// ============================================
// FINANCE APIs - Wallet
// ============================================

export async function getVendorWalletSummary() {
  return apiRequest<ApiEnvelope<VendorWalletSummary>>(API_ENDPOINTS.vendor.walletSummary);
}

export async function getVendorWalletStoreWise() {
  return apiRequest<ApiEnvelope<VendorStoreWiseEarnings[]>>(API_ENDPOINTS.vendor.walletStoreWise);
}

export async function getVendorWalletDeductions() {
  return apiRequest<ApiEnvelope<VendorWalletDeductionsResponse>>(
    API_ENDPOINTS.vendor.walletDeductions
  );
}

// ============================================
// FINANCE APIs - Closure
// ============================================

export async function getVendorClosureDaily(date?: string) {
  const query = date ? `?date=${date}` : "";
  return apiRequest<ApiEnvelope<VendorClosure>>(
    `${API_ENDPOINTS.vendor.closureDaily}${query}`
  );
}

export async function getVendorClosureWeekly(date?: string) {
  const query = date ? `?date=${date}` : "";
  return apiRequest<ApiEnvelope<VendorClosure>>(
    `${API_ENDPOINTS.vendor.closureWeekly}${query}`
  );
}

export async function getVendorClosureMonthly(date?: string) {
  const query = date ? `?date=${date}` : "";
  return apiRequest<ApiEnvelope<VendorClosure>>(
    `${API_ENDPOINTS.vendor.closureMonthly}${query}`
  );
}

// ============================================
// FINANCE APIs - Payouts
// ============================================

export async function getVendorPayoutsSchedule() {
  return apiRequest<ApiEnvelope<VendorPayoutSchedule>>(API_ENDPOINTS.vendor.payoutsSchedule);
}

export async function getVendorPayoutHistory() {
  return apiRequest<ApiEnvelope<VendorPayoutHistory>>(API_ENDPOINTS.vendor.payoutsHistory);
}

// ============================================
// FINANCE SERVICE GATEWAY APIs — /api/finance/vendor/finance/*
// Uses FINANCE_BASE_URL (separate gateway: VITE_FINANCE_API_URL)
// ============================================

async function financeRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const fullUrl = `${FINANCE_BASE_URL}${path}`;
  console.log(`🌐 Finance API Request: ${init.method || "GET"} ${fullUrl}`);

  const response = await fetch(fullUrl, { ...init, headers });
  const payload = await response.json().catch(() => null);
  console.log(`📡 Finance API Response [${response.status}]:`, path, payload);

  if (!response.ok) {
    const message = payload?.message || `HTTP ${response.status}: ${response.statusText}`;
    console.error(`❌ Finance API Error [${response.status}]:`, path, message);
    throw new ApiError(message, response.status);
  }
  if (payload == null) throw new ApiError("Empty or invalid server response", response.status || 500);
  return payload as T;
}

export async function getVendorFinanceServiceSummary() {
  return financeRequest<ApiEnvelope<VendorFinanceSummaryResponse>>(
    API_ENDPOINTS.vendor.financeServiceSummary
  );
}

export async function getVendorFinanceServicePayoutHistory(page = 1, limit = 10) {
  return financeRequest<ApiEnvelope<VendorFinancePayoutHistoryResponse>>(
    `${API_ENDPOINTS.vendor.financeServicePayoutHistory}?page=${page}&limit=${limit}`
  );
}

// ============================================
// SCORING APIs
// ============================================

export async function getVendorRejectionsHistory() {
  return apiRequest<ApiEnvelope<VendorOrder[]>>(API_ENDPOINTS.vendor.rejectionsHistory);
}

export async function getVendorPerformanceScore() {
  return apiRequest<ApiEnvelope<VendorPerformanceScore>>(API_ENDPOINTS.vendor.performanceScore);
}

// GET /api/vendor/orders/score — detailed score from order-service
export async function getVendorDetailedScore() {
  return apiRequest<ApiEnvelope<VendorDetailedScore>>(API_ENDPOINTS.vendor.ordersScore);
}

// GET /api/vendor/orders/closure?period=daily|weekly|monthly&date=YYYY-MM-DD
export async function getVendorOrderClosure(period: "daily" | "weekly" | "monthly" = "daily", date?: string) {
  const params = new URLSearchParams({ period });
  if (date) params.set("date", date);
  return apiRequest<ApiEnvelope<VendorOrderClosure>>(
    `${API_ENDPOINTS.vendor.ordersClosure}?${params.toString()}`
  );
}

// ============================================
// SUPPORT TICKETS APIs — /vendor/support/tickets
// ============================================

export async function getSupportTickets(status?: string) {
  const query = status && status !== "all" ? `?status=${encodeURIComponent(status)}` : "";
  return apiRequest<ApiEnvelope<SupportTicketListResponse>>(
    `${API_ENDPOINTS.vendor.supportTickets}${query}`
  );
}

export async function getSupportSummary() {
  return apiRequest<ApiEnvelope<SupportSummaryResponse>>(
    API_ENDPOINTS.vendor.supportTicketSummary
  );
}

export async function getSupportTicket(id: string) {
  return apiRequest<ApiEnvelope<SupportTicket>>(
    API_ENDPOINTS.vendor.supportTicketById(id)
  );
}

export async function createSupportTicket(payload: {
  subject: string;
  description: string;
  category?: string;
  orderId?: string;
}) {
  return apiRequest<ApiEnvelope<SupportTicket>>(API_ENDPOINTS.vendor.supportTickets, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function replySupportTicket(id: string, message: string) {
  return apiRequest<ApiEnvelope<SupportTicket>>(
    API_ENDPOINTS.vendor.supportTicketReply(id),
    {
      method: "POST",
      body: JSON.stringify({ message }),
    }
  );
}

// ============================================
// FINANCE ALIAS APIs — /vendor/wallet/*, /vendor/closure/*, /vendor/payouts/*
// These are alternate paths that mirror the /vendor/finance/* routes
// ============================================

export async function getVendorWalletSummaryAlias() {
  return apiRequest<ApiEnvelope<VendorWalletSummary>>(API_ENDPOINTS.vendor.walletSummaryAlias);
}

export async function getVendorWalletStoreWiseAlias() {
  return apiRequest<ApiEnvelope<VendorStoreWiseEarnings[]>>(API_ENDPOINTS.vendor.walletStoreWiseAlias);
}

export async function getVendorWalletDeductionsAlias() {
  return apiRequest<ApiEnvelope<VendorWalletDeductionsResponse>>(
    API_ENDPOINTS.vendor.walletDeductionsAlias
  );
}

export async function getVendorClosureDailyAlias(date?: string) {
  const query = date ? `?date=${date}` : "";
  return apiRequest<ApiEnvelope<VendorClosure>>(
    `${API_ENDPOINTS.vendor.closureDailyAlias}${query}`
  );
}

export async function getVendorClosureWeeklyAlias(date?: string) {
  const query = date ? `?date=${date}` : "";
  return apiRequest<ApiEnvelope<VendorClosure>>(
    `${API_ENDPOINTS.vendor.closureWeeklyAlias}${query}`
  );
}

export async function getVendorClosureMonthlyAlias(date?: string) {
  const query = date ? `?date=${date}` : "";
  return apiRequest<ApiEnvelope<VendorClosure>>(
    `${API_ENDPOINTS.vendor.closureMonthlyAlias}${query}`
  );
}

export async function getVendorPayoutsScheduleAlias() {
  return apiRequest<ApiEnvelope<VendorPayoutSchedule>>(API_ENDPOINTS.vendor.payoutsScheduleAlias);
}

export async function getVendorPayoutHistoryAlias() {
  return apiRequest<ApiEnvelope<VendorPayoutHistory>>(API_ENDPOINTS.vendor.payoutsHistoryAlias);
}

// ============================================
// SCORING ALIAS APIs — /vendor/rejections/history, /vendor/performance-score
// ============================================

export async function getVendorRejectionsHistoryAlias() {
  return apiRequest<ApiEnvelope<VendorOrder[]>>(API_ENDPOINTS.vendor.rejectionsHistoryAlias);
}

export async function getVendorPerformanceScoreAlias() {
  return apiRequest<ApiEnvelope<VendorPerformanceScore>>(API_ENDPOINTS.vendor.performanceScoreAlias);
}

export async function getVendorPerformanceScoreVendorAlias() {
  return apiRequest<ApiEnvelope<VendorPerformanceScore>>(API_ENDPOINTS.vendor.performanceScoreVendorAlias);
}

// ============================================
// SUPPORT TICKET ALIAS APIs — /vendor/tickets/*
// These mirror /vendor/support/tickets/* routes
// ============================================

export async function getTickets(status?: string) {
  const query = status && status !== "all" ? `?status=${encodeURIComponent(status)}` : "";
  return apiRequest<ApiEnvelope<SupportTicketListResponse>>(
    `${API_ENDPOINTS.vendor.tickets}${query}`
  );
}

export async function getTicketsSummary() {
  return apiRequest<ApiEnvelope<SupportSummaryResponse>>(
    API_ENDPOINTS.vendor.ticketSummary
  );
}

export async function getTicket(id: string) {
  return apiRequest<ApiEnvelope<SupportTicket>>(
    API_ENDPOINTS.vendor.ticketById(id)
  );
}

export async function createTicket(payload: {
  subject: string;
  description: string;
  category?: string;
  orderId?: string;
}) {
  return apiRequest<ApiEnvelope<SupportTicket>>(API_ENDPOINTS.vendor.tickets, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function replyTicket(id: string, message: string) {
  return apiRequest<ApiEnvelope<SupportTicket>>(
    API_ENDPOINTS.vendor.ticketReply(id),
    {
      method: "POST",
      body: JSON.stringify({ message }),
    }
  );
}

// ============================================
// Legacy compatibility
// ============================================

export async function getVendorFinanceSummary() {
  return getVendorWalletSummary();
}

export async function getVendorScore() {
  return getVendorPerformanceScore();
}

export async function getVendorClosure(period = "daily", date?: string) {
  if (period === "weekly") return getVendorClosureWeekly(date);
  if (period === "monthly") return getVendorClosureMonthly(date);
  return getVendorClosureDaily(date);
}

export async function startVendorProduction(id: string) {
  // Spec: PATCH /api/vendor/orders/:id/start-production
  return apiRequest<ApiEnvelope<VendorOrder>>(API_ENDPOINTS.vendor.startProduction(id), {
    method: "PATCH",
  });
}

export async function markVendorQcPending(id: string) {
  // Spec: PATCH /api/vendor/orders/:id/qc-pending
  return apiRequest<ApiEnvelope<VendorOrder>>(API_ENDPOINTS.vendor.markQcPending(id), {
    method: "PATCH",
  });
}

export async function markVendorReadyForPickup(id: string) {
  // Spec: PATCH /api/vendor/orders/:id/ready-for-pickup (primary)
  // Fallback: POST /api/vendor/orders/:id/ready (alias)
  return apiRequest<ApiEnvelope<VendorOrder>>(API_ENDPOINTS.vendor.markReadyForPickup(id), {
    method: "PATCH",
  }).catch(() => markOrderReady(id)); // fallback to alias if 404
}

// GET /api/vendor/delivery-partners/available
// Backend returns: id (not _id), name, phone, vehicleType, zoneAssignments, rating, totalTrips
export interface DeliveryPartner {
  id?: string;                     // Rider ID (backend uses 'id' not '_id')
  _id?: string;                    // Fallback for _id
  name: string;                    // Rider name
  phone: string;                   // Phone number
  vehicleType: string;             // bike, scooter, car, etc.
  zoneAssignments: string[];       // Zones assigned to rider
  rating: number;                  // Rating (0-5)
  totalTrips: number;              // Total completed trips
  isAvailable?: boolean;           // Optional: availability status
  email?: string;                  // Optional: rider email
  isApproved?: boolean;            // Optional: approval status
  [key: string]: unknown;          // Allow extra fields from backend
}

export async function getAvailableDeliveryPartners(params?: { search?: string; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.limit) q.set("limit", String(params.limit));
  const qs = q.toString();
  return apiRequest<ApiEnvelope<DeliveryPartner[]>>(
    `${API_ENDPOINTS.vendor.deliveryPartnersAvailable}${qs ? `?${qs}` : ""}`
  );
}
// Call after vendor physically hands package to rider
// POST /api/vendor/orders/:order_id/handover-complete
export async function handoverComplete(id: string, payload?: { riderId?: string; note?: string }) {
  try {
    return await apiRequest<ApiEnvelope<VendorOrder>>(API_ENDPOINTS.vendor.handoverComplete(id), {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  } catch (err) {
    // If handover-complete endpoint fails (500/404), fallback to status update
    if (err instanceof ApiError && (err.status === 500 || err.status === 404)) {
      return updateOrderStatus(id, "out_for_delivery", payload?.note || "Handed over to rider");
    }
    throw err;
  }
}
