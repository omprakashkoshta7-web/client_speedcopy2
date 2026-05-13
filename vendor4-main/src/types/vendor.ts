export type PortalRole = "Owner" | "Manager" | "Staff";

export interface VendorSession {
  userId: string;
  email: string;
  role: PortalRole;
  vendorOrgId: string;
  storeScope: string[];
  permissions: string[];
  token: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  isActive?: boolean;
  vendorOrgId?: string;
  portalRole?: string;
  permissions?: string[];
  storeScope?: string[];
}

export interface VendorProfile {
  _id?: string;
  userId?: string;
  businessName?: string;
  businessType?: string;
  gstNumber?: string;
  panNumber?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  logo?: string;
  website?: string;
  legalDocuments?: {
    gstCertificate?: string;
    panCard?: string;
    companyRegistrationCertificate?: string;
  };
  legalVerified?: boolean;
  isApproved?: boolean;
  approvedAt?: string | null;
  isSuspended?: boolean;
  suspendedReason?: string | null;
  priority?: number;
  healthScore?: number;
  agreementStatus?: "pending" | "active" | "expired" | "terminated";
  agreementAcceptedAt?: string | null;
  bankDetails?: {
    accountName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

// ── Store ────────────────────────────────────────────────────────────────────
// GET /api/vendor/stores, GET /api/vendor/stores/:id
export interface VendorStore {
  _id: string;
  vendorId: string;
  userId: string;
  name: string;
  internalCode?: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  location?: {
    lat?: number;
    lng?: number;
  };
  phone?: string;
  email?: string;
  workingHours?: string;           // e.g. "9:00 AM - 9:00 PM"
  operatingHours?: {
    open?: string;                 // e.g. "09:00"
    close?: string;                // e.g. "21:00"
  };
  workingDays?: string[];          // ["Mon","Tue","Wed","Thu","Fri","Sat"]
  capacity?: {
    maxOrdersPerDay?: number;      // default 50
    currentLoad?: number;          // default 0
    dailyLimit?: number;           // default 50
    maxConcurrentOrders?: number;  // default 10
  };
  supportedFlows?: string[];       // enum: "printing" | "gifting" | "shopping"
  assignmentZones?: string[];
  isActive: boolean;
  isAvailable: boolean;
  availabilityReason?: string;     // auto-set by backend on availability toggle
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// POST /api/vendor/stores — create payload
export interface CreateStorePayload {
  name: string;                    // required
  address: {
    line1: string;                 // required
    line2?: string;
    city: string;                  // required
    state: string;                 // required
    pincode: string;               // required
  };
  location?: {
    lat?: number;
    lng?: number;
  };
  phone?: string;
  email?: string;
  workingHours?: string;
  operatingHours?: { open?: string; close?: string };
  workingDays?: string[];
  capacity?: {
    maxOrdersPerDay?: number;
    currentLoad?: number;
    dailyLimit?: number;
    maxConcurrentOrders?: number;
  };
  supportedFlows?: string[];
  internalCode?: string;
  assignmentZones?: string[];
}

// PUT /api/vendor/stores/:id/capacity — flat fields (not nested under "capacity")
export interface UpdateStoreCapacityPayload {
  maxOrdersPerDay?: number;
  currentLoad?: number;
  dailyLimit?: number;
  maxConcurrentOrders?: number;
}

// GET /api/vendor/stores/:id/capabilities
// Note: maxOrdersPerDay & currentLoad come from store top-level field, not capacity.*
export interface StoreCapabilities {
  supportedFlows: string[];
  maxOrdersPerDay: number;  // from store.maxOrdersPerDay (top-level), 0 if not set
  currentLoad: number;      // from store.currentLoad (top-level), 0 if not set
}

// GET /api/vendor/stores/nearby — public endpoint
export interface NearbyStore {
  _id: string;
  name: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  location: { lat: number; lng: number };
  workingHours?: string;
  supportedFlows?: string[];
  capacity?: {
    maxOrdersPerDay?: number;
    currentLoad?: number;
    dailyLimit?: number;
    maxConcurrentOrders?: number;
  };
  distance: number;  // meters, from MongoDB $geoNear
}

export interface NearbyStoresResponse {
  stores: NearbyStore[];
  totalFound: number;
  searchLocation: { lat: number; lng: number };
  searchRadius: number;
}

export interface VendorStaff {
  _id: string;
  vendorId: string;
  storeId?: string;
  assignedStoreIds?: string[];
  authUserId?: string;
  name: string;
  email?: string;
  phone?: string;
  role: "manager" | "operator" | "qc";
  permissions?: string[];
  isFinancialAccessEnabled?: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface VendorPerformance {
  totalStores: number;
  activeStores: number;
  totalStaff: number;
  capacitySnapshot?: Array<{
    name: string;
    capacity?: {
      maxOrdersPerDay?: number;
      currentLoad?: number;
      dailyLimit?: number;
      maxConcurrentOrders?: number;
    };
    isAvailable?: boolean;
    availabilityReason?: string;
  }>;
}

export interface VendorOrderItem {
  productId?: string;
  productName?: string;
  flowType?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  printConfig?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface VendorOrderTimelineEntry {
  status: string;
  note?: string;
  timestamp?: string;
  _id?: string;
}

export interface VendorOrder {
  _id: string;
  orderNumber?: string;
  userId?: string;
  vendorId?: string;
  storeId?: string | null;
  riderId?: string;
  status: string;
  paymentStatus?: string;
  deliveryStatus?: string;
  customerFacingStatus?: string;
  total?: number;
  subtotal?: number;
  discount?: number;
  deliveryCharge?: number;
  items?: VendorOrderItem[];
  notes?: string;
  shippingAddress?: {
    fullName?: string;
    phone?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  assignedAt?: string;
  acceptedAt?: string;
  productionStartedAt?: string;
  qcAt?: string;
  readyAt?: string;
  deliveredAt?: string;
  createdAt?: string;
  updatedAt?: string;
  timeline?: VendorOrderTimelineEntry[];
  assignmentHistory?: Array<{
    vendorId?: string;
    storeId?: string | null;
    assignedBy?: string;
    reason?: string;
    assignedAt?: string;
    _id?: string;
  }>;
}

export interface PaginatedVendorOrders {
  orders: VendorOrder[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

export interface VendorPayout {
  _id: string;
  vendorId: string;
  amount: number;
  platformFee?: number;
  netAmount?: number;
  currency?: string;
  status: "pending" | "processing" | "paid" | "failed";
  orderIds?: string[];
  transferId?: string;
  transactionId?: string;
  bankAccount?: string;
  ordersIncluded?: number;
  transferredAt?: string;
  payoutDate?: string;
  failureReason?: string;
  periodStart?: string;
  periodEnd?: string;
  notes?: string;
  breakdown?: {
    platformFee: number;
    gst: number;
    other?: number;
    grossAmount?: number;
    netAmount?: number;
  };
  grossAmount?: number;
  createdAt?: string;
  updatedAt?: string;
  paidAt?: string;
}

// ── Wallet Summary ──────────────────────────────────────────────────────────
// GET /api/vendor/finance/wallet/summary  (alias: /api/vendor/wallet/summary)
export interface VendorWalletSummary {
  balance: number;               // Total vendorPayout sum of all delivered orders
  pendingSettlement: number;     // balance * 0.2 (20% hold)
  availableForWithdrawal: number; // balance * 0.8 (80% available)
}

// ── Store-wise Earnings ──────────────────────────────────────────────────────
// GET /api/vendor/finance/wallet/store-wise  (alias: /api/vendor/wallet/store-wise)
export interface VendorStoreWiseEarnings {
  _id: string;        // storeId from orders collection
  earnings: number;   // Sum of vendorPayout for that store
  orderCount: number; // Total delivered orders for that store
}

// ── Wallet Deduction (Platform Fee) ─────────────────────────────────────────
// GET /api/vendor/finance/wallet/deductions  (alias: /api/vendor/wallet/deductions)
export interface VendorDeduction {
  type: "platform_fee";  // Always "platform_fee"
  amount: number;        // SUM(order.total - order.vendorPayout) across all delivered orders
  orderCount: number;    // Total delivered orders counted
}

export interface VendorWalletDeductionsResponse {
  deductions: VendorDeduction[];
}

// ── Closure (Daily / Weekly / Monthly) ──────────────────────────────────────
// GET /api/vendor/finance/closure/daily|weekly|monthly
// (aliases: /api/vendor/closure/daily|weekly|monthly)
export interface VendorClosure {
  period: "daily" | "weekly" | "monthly";
  from: string;       // Period start ISO date
  to: string;         // Period end ISO date
  earnings: number;   // Sum of vendorPayout for delivered orders in period
  count: number;      // Number of delivered orders in period
  grossSales: number; // Sum of order.total for period
  discount: number;   // Sum of order.discount for period
}

// ── Payout Schedule ──────────────────────────────────────────────────────────
// GET /api/vendor/finance/payouts/schedule  (alias: /api/vendor/payouts/schedule)
export interface VendorPayoutSchedule {
  nextPayoutDate: string;    // Next Sunday's date
  estimatedAmount: number;   // Pending payout netAmount or weekly earnings
  status: "pending" | "processing" | "scheduled";
  payoutId: string;          // Payout document _id if pending payout exists
}

// ── Payout Record — Vendor Service (mapped, last 50, no pagination) ──────────
// GET /api/vendor/finance/payouts/history  (alias: /api/vendor/payouts/history)
export interface VendorPayoutRecord {
  id: string;              // _id mapped
  amount: number;          // netAmount — platform fee ke baad (vendor ko milta hai)
  grossAmount: number;     // total before deductions
  platformFee: number;     // platform ka cut
  status: "pending" | "processing" | "transferred" | "failed";
  periodStart: string | null;
  periodEnd: string | null;
  createdAt: string;
  transferredAt: string | null;  // actual transfer time (null agar nahi hua)
  notes: string;
}

export interface VendorPayoutHistory {
  payouts: VendorPayoutRecord[];
}

// ── Finance Service Payout Summary ──────────────────────────────────────────
// GET /api/finance/vendor/finance/summary
export interface VendorFinanceSummaryResponse {
  pendingPayout: number;      // SUM(netAmount) where status = "pending"
  totalPaid: number;          // SUM(netAmount) where status = "paid"
  totalPayouts: number;       // Total payout documents count
  platformFeePercent: number; // Always 10 (hardcoded)
}

// ── Finance Service Payout History (paginated, full DB fields) ───────────────
// GET /api/finance/vendor/finance/payout-history?page=1&limit=10
export interface VendorFinancePayoutRecord {
  _id: string;
  vendorId: string;
  amount: number;        // gross amount
  platformFee: number;
  netAmount: number;     // amount - platformFee
  currency: string;
  status: "pending" | "processing" | "paid" | "failed";
  orderIds: string[];
  transferId: string;
  transferredAt: string;
  failureReason: string | null;
  periodStart: string;
  periodEnd: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorFinancePayoutHistoryResponse {
  payouts: VendorFinancePayoutRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ── Performance Score ────────────────────────────────────────────────────────
// GET /api/vendor/scoring/performance-score
// (aliases: /api/vendor/performance-score, /api/vendor/vendor/performance-score)
export interface VendorPerformanceScore {
  acceptanceRate: number;  // ((total - rejected) / total) * 100
  completionRate: number;  // (delivered / total) * 100
  overallScore: number;    // (acceptanceRate + completionRate) / 2
}

// ── Detailed Vendor Score (Order Service) ────────────────────────────────────
// GET /api/vendor/orders/score
export interface VendorScoreMetric {
  label: string;
  value: string;
  target: string;
  num: number;
  status: "good" | "needs_attention";
  desc: string;
}

export interface VendorScoreRadarPoint {
  metric: string;
  score: number;
  target: number;
}

export interface VendorScoreTrendPoint {
  week: string;
  score: number;
}

export interface VendorScoreRejection {
  id: string;
  reason: string;
  date: string;
  counted: boolean;
}

export interface VendorScoreTotals {
  total: number;
  accepted: number;
  rejected: number;
  completed: number;
}

export interface VendorDetailedScore {
  overallScore: number;
  routingPriority: "High" | "Medium" | "Low";
  acceptanceRate: number;
  slaCompliance: number;
  metrics: VendorScoreMetric[];
  radarData: VendorScoreRadarPoint[];
  scoreTrend: VendorScoreTrendPoint[];
  rejectionHistory: VendorScoreRejection[];
  totals: VendorScoreTotals;
}

// ── Order Service Closure ─────────────────────────────────────────────────────
// GET /api/vendor/orders/closure?period=daily&date=2026-05-01
export interface VendorOrderClosureSummary {
  totalJobs: number;
  completedJobs: number;
  deliveredJobs: number;
  totalEarnings: number;
  avgOrderValue: number;
}

export interface VendorOrderClosureStoreBreakdown {
  storeId: string;
  jobs: number;
  earnings: number;
  percentage: number;
}

export interface VendorOrderClosureChartPoint {
  period: string;
  earnings: number;
}

export interface VendorOrderClosureJob {
  id: string;
  type: string;
  storeId: string;
  amount: number;
  status: string;
  completedAt: string;
}

export interface VendorOrderClosure {
  summary: VendorOrderClosureSummary;
  storeBreakdown: VendorOrderClosureStoreBreakdown[];
  chartData: VendorOrderClosureChartPoint[];
  jobs: VendorOrderClosureJob[];
}

// ── Legacy / kept for backward compat ───────────────────────────────────────
/** @deprecated Use VendorPayoutRecord instead */
export interface VendorPayout {
  _id: string;
  vendorId: string;
  amount: number;
  platformFee?: number;
  netAmount?: number;
  currency?: string;
  status: "pending" | "processing" | "paid" | "failed";
  orderIds?: string[];
  transferId?: string;
  transactionId?: string;
  bankAccount?: string;
  ordersIncluded?: number;
  transferredAt?: string;
  payoutDate?: string;
  failureReason?: string;
  periodStart?: string;
  periodEnd?: string;
  notes?: string;
  breakdown?: {
    platformFee: number;
    gst: number;
    other?: number;
    grossAmount?: number;
    netAmount?: number;
  };
  grossAmount?: number;
  createdAt?: string;
  updatedAt?: string;
  paidAt?: string;
}

export interface SupportReply {
  _id?: string;
  authorId: string;
  authorRole: "vendor" | "admin" | "staff" | "user";
  message: string;
  attachments?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SupportTicket {
  _id: string;
  userId: string;
  orderId?: string;
  subject: string;
  description: string;
  category: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  createdForRole?: string;
  visibilityScope?: string;
  replies: SupportReply[];
  attachments?: string[];
  resolvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Support list returns array directly, not wrapped object
export type SupportTicketListResponse = SupportTicket[];

export interface SupportSummaryResponse {
  status_counts: Record<string, number>;
  total?: number;
  recent_tickets?: SupportTicket[];
}
