const DEFAULT_GATEWAY_URL = "https://gateway-202671058278.asia-south1.run.app";

const withApiPrefix = (url: string) => {
  const trimmed = url.replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
};

export const API_BASE_URL = withApiPrefix(import.meta.env.VITE_API_URL || DEFAULT_GATEWAY_URL);

// Finance Service runs on a separate gateway
export const FINANCE_BASE_URL = withApiPrefix(
  import.meta.env.VITE_FINANCE_API_URL || import.meta.env.VITE_API_URL || DEFAULT_GATEWAY_URL
);
export const DEFAULT_GATEWAY_API_BASE_URL = withApiPrefix(DEFAULT_GATEWAY_URL);

export const API_ENDPOINTS = {
  // Auth endpoints
  auth: {
    login: "/vendor/auth/login",
    mfaVerify: "/vendor/auth/mfa/verify",
    logout: "/vendor/auth/logout",
    session: "/vendor/auth/session",
    verify: "/auth/verify",
    me: "/auth/me",
  },

  vendor: {
    // Profile
    profile: "/vendor/org/profile",
    legal: "/vendor/org/legal",
    agreement: "/vendor/org/agreement",

    // Vendor-Org (alternate org routes)
    vendorOrgLegal: "/vendor/vendor-org/legal",
    vendorOrgAgreement: "/vendor/vendor-org/agreement",

    // Stores
    storesNearby: "/vendor/stores/nearby",
    stores: "/vendor/stores",
    storeById: (id: string) => `/vendor/stores/${id}`,
    storeStatus: (id: string) => `/vendor/stores/${id}/status`,
    storeAvailability: (id: string) => `/vendor/stores/${id}/availability`,
    storeCapacity: (id: string) => `/vendor/stores/${id}/capacity`,
    storeCapabilities: (id: string) => `/vendor/stores/${id}/capabilities`,
    storeDelete: (id: string) => `/vendor/stores/${id}`,

    // Staff
    staff: "/vendor/staff",
    staffById: (id: string) => `/vendor/staff/${id}`,
    staffStatus: (id: string) => `/vendor/staff/${id}/status`,
    staffAssignStores: (id: string) => `/vendor/staff/${id}/assign-stores`,

    // Orders
    ordersAssigned: "/vendor/orders/assigned",
    ordersQueue: "/vendor/orders/queue",
    orderById: (id: string) => `/vendor/orders/${id}`,
    acceptOrder: (id: string) => `/vendor/orders/${id}/accept`,
    rejectOrder: (id: string) => `/vendor/orders/${id}/reject`,
    updateOrderStatus: (id: string) => `/vendor/orders/${id}/status`,
    startProduction: (id: string) => `/vendor/orders/${id}/start-production`,
    markQcPending: (id: string) => `/vendor/orders/${id}/qc-pending`,
    markReadyForPickup: (id: string) => `/vendor/orders/${id}/ready-for-pickup`,
    qcUpload: (id: string) => `/vendor/orders/${id}/qc-upload`,
    markReady: (id: string) => `/vendor/orders/${id}/ready`,
    handoverComplete: (id: string) => `/vendor/orders/${id}/handover-complete`,

    // Analytics / Dashboard
    dashboard: "/vendor/dashboard",
    performance: "/vendor/analytics/performance",

    // Finance - Wallet (primary paths)
    walletSummary: "/vendor/finance/wallet/summary",
    walletStoreWise: "/vendor/finance/wallet/store-wise",
    walletDeductions: "/vendor/finance/wallet/deductions",

    // Finance - Wallet (alias paths)
    walletSummaryAlias: "/vendor/wallet/summary",
    walletStoreWiseAlias: "/vendor/wallet/store-wise",
    walletDeductionsAlias: "/vendor/wallet/deductions",

    // Finance - Closure (primary paths)
    closureDaily: "/vendor/finance/closure/daily",
    closureWeekly: "/vendor/finance/closure/weekly",
    closureMonthly: "/vendor/finance/closure/monthly",

    // Finance - Closure (alias paths)
    closureDailyAlias: "/vendor/closure/daily",
    closureWeeklyAlias: "/vendor/closure/weekly",
    closureMonthlyAlias: "/vendor/closure/monthly",

    // Finance - Payouts (primary paths)
    payoutsSchedule: "/vendor/finance/payouts/schedule",
    payoutsHistory: "/vendor/finance/payouts/history",

    // Finance - Payouts (alias paths)
    payoutsScheduleAlias: "/vendor/payouts/schedule",
    payoutsHistoryAlias: "/vendor/payouts/history",

    // Finance - Summary (dashboard)
    financeSummary: "/vendor/finance/wallet/summary",

    // Finance Service gateway (routes via /api/finance, not /api/vendor)
    financeServiceSummary: "/finance/vendor/finance/summary",
    financeServicePayoutHistory: "/finance/vendor/finance/payout-history",

    // Scoring (primary paths)
    rejectionsHistory: "/vendor/scoring/rejections/history",
    performanceScore: "/vendor/scoring/performance-score",

    // Scoring (alias paths)
    rejectionsHistoryAlias: "/vendor/rejections/history",
    performanceScoreAlias: "/vendor/performance-score",
    performanceScoreVendorAlias: "/vendor/vendor/performance-score",

    // Order Service Score + Closure
    ordersScore: "/vendor/orders/score",
    ordersClosure: "/vendor/orders/closure",

    // Delivery Partners
    deliveryPartnersAvailable: "/vendor/delivery-partners/available",

    // Support Tickets (primary paths)
    supportTickets: "/vendor/support/tickets",
    supportTicketById: (id: string) => `/vendor/support/tickets/${id}`,
    supportTicketReply: (id: string) => `/vendor/support/tickets/${id}/reply`,
    supportTicketSummary: "/vendor/support/tickets/summary",

    // Support Tickets (alias paths)
    tickets: "/vendor/tickets",
    ticketById: (id: string) => `/vendor/tickets/${id}`,
    ticketReply: (id: string) => `/vendor/tickets/${id}/reply`,
    ticketSummary: "/vendor/tickets/summary",
  },
} as const;
