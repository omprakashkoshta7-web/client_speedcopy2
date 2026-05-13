// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_GATEWAY_URL || 'https://gateway-202671058278.asia-east1.run.app',
  TIMEOUT: 30000,
  ENDPOINTS: {
    // Auth
    AUTH: {
      REGISTER: '/api/auth/register',
      LOGIN: '/api/auth/login',
      VERIFY_TOKEN: '/api/auth/verify',
      SEND_PHONE_OTP: '/api/auth/phone/send-otp',
      VERIFY_PHONE_OTP: '/api/auth/phone/verify-otp',
      ME: '/api/auth/me',
    },
    // User
    USER: {
      PROFILE: '/api/users/profile',
      ADDRESSES: '/api/users/addresses',
    },
    // Products
    PRODUCTS: {
      GENERAL: {
        LIST: '/api/products',
        BY_ID: (id: string) => `/api/products/${id}`,
        BY_SLUG: (slug: string) => `/api/products/slug/${slug}`,
      },
      CATEGORIES: {
        LIST: '/api/products/categories',
        BY_SLUG: (slug: string) => `/api/products/categories/${slug}`,
        SUBCATEGORIES: (categoryId: string) => `/api/products/categories/${categoryId}/subcategories`,
      },
      BUSINESS_PRINTING: {
        HOME: '/api/business-printing/home',
        TYPES: '/api/business-printing/types',
        CATEGORIES: '/api/business-printing/categories',
        PRODUCTS: '/api/business-printing/products',
        PRODUCT_BY_ID: (id: string) => `/api/business-printing/products/${id}`,
        PICKUP_LOCATIONS: '/api/business-printing/pickup-locations',
        CONFIGURE: '/api/business-printing/configure',
        CONFIG_BY_ID: (id: string) => `/api/business-printing/config/${id}`,
      },
      PRINTING: {
        HOME: '/api/products/printing/home',
        CATEGORIES: '/api/products/printing/categories',
        PRODUCTS: '/api/products/printing/products',
        DOCUMENT_TYPES: '/api/products/printing/document-types',
        DOCUMENT_TYPE_BY_ID: (type: string) => `/api/products/printing/document-types/${type}`,
        SERVICE_PACKAGES: '/api/products/printing/service-packages',
        UPLOAD: '/api/products/printing/upload',
        CONFIGURE: '/api/products/printing/configure',
        CONFIG_BY_ID: (id: string) => `/api/products/printing/config/${id}`,
        PICKUP_LOCATIONS: '/api/products/printing/pickup-locations',
      },
      GIFTING: {
        HOME: '/api/gifting/home',
        CATEGORIES: '/api/gifting/categories',
        PRODUCTS: '/api/gifting/products',
        SEARCH: '/api/gifting/search',
        PRODUCT_BY_ID: (id: string) => `/api/gifting/products/${id}`,
      },
      SHOPPING: {
        HOME: '/api/shopping/home',
        CATEGORIES: '/api/shopping/categories',
        PRODUCTS: '/api/shopping/products',
        SEARCH: '/api/shopping/search',
        DEALS: '/api/shopping/deals',
        TRENDING: '/api/shopping/trending',
        PRODUCT_BY_ID: (id: string) => `/api/shopping/products/${id}`,
      },
    },
    // Orders
    ORDERS: {
      CREATE: '/api/orders',
      MY_ORDERS: '/api/orders/my-orders',
      ORDER_BY_ID: (id: string) => `/api/orders/${id}`,
      TRACK: (id: string) => `/api/orders/${id}/track`,
    },
    // Payment
    PAYMENT: {
      CREATE: '/api/wallet/razorpay/initiate',
      VERIFY: '/api/wallet/razorpay/verify',
      INITIATE: '/api/wallet/razorpay/initiate',
    },
    // Finance
    FINANCE: {
      WALLET: '/api/wallet',
      WALLET_BALANCE: '/api/wallet/balance',
      WALLET_OVERVIEW: '/api/wallet/overview',
      LEDGER: '/api/wallet/ledger',
      TRANSACTION_HISTORY: '/api/wallet/transactions',
      TOPUP_CONFIG: '/api/wallet/topup-config',
      TOPUP_PREVIEW: '/api/wallet/topup-preview',
      ADD_FUNDS: '/api/wallet/add-funds',
      RAZORPAY_INITIATE: '/api/wallet/razorpay/initiate',
      RAZORPAY_VERIFY: '/api/wallet/razorpay/verify',
      REFERRALS: '/api/referrals',
      REFERRAL_SUMMARY: '/api/referrals/summary',
      APPLY_REFERRAL: '/api/referrals/apply',
    },
    // Notifications
    NOTIFICATIONS: {
      GET_ALL: '/api/notifications',
      GET_SUMMARY: '/api/notifications/summary',
      MARK_READ: (id: string) => `/api/notifications/${id}/read`,
      MARK_ALL_READ: '/api/notifications/read-all',
    },
    // Tickets — Internal service path via gateway
   TICKETS: { 
      CREATE: '/api/notifications/tickets', 
      UPLOADS: '/api/notifications/tickets/uploads', 
      GET_ALL: '/api/notifications/tickets', 
      GET_SUMMARY: '/api/notifications/tickets/summary', 
      GET_HELP_CENTER: '/api/notifications/help-center', 
      GET_BY_ID: (id: string) => `/api/notifications/tickets/${id}`, 
      REPLY: (id: string) => `/api/notifications/tickets/${id}/reply`, 
      ASSIGN: (id: string) => `/api/notifications/tickets/${id}/assign`, 
      UPDATE_STATUS: (id: string) => `/api/notifications/tickets/${id}/status`, 
      ESCALATE: (id: string) => `/api/notifications/tickets/${id}/escalate`, 
    },
    // Vendors
    VENDORS: {
      NEARBY_STORES: '/api/vendor/stores/nearby',
    },
    // Wishlist
    WISHLIST: {
      GET: '/api/users/wishlist',
      ADD: '/api/users/wishlist',
      REMOVE: (productId: string) => `/api/users/wishlist/${productId}`,
      CLEAR: '/api/users/wishlist',
    },
    // Cart - Unified
    CART: {
      GET: '/api/orders/cart',
      ADD: '/api/orders/cart',
      UPDATE: (itemId: string) => `/api/orders/cart/${itemId}`,
      REMOVE: (itemId: string) => `/api/orders/cart/${itemId}`,
      CLEAR: '/api/orders/cart/clear',
      COUPON: '/api/orders/cart/apply-coupon',
      // Printing Cart
      PRINTING_GET: '/api/orders/cart',
      PRINTING_ADD: '/api/orders/cart',
      PRINTING_UPDATE: (itemId: string) => `/api/orders/cart/${itemId}`,
      PRINTING_REMOVE: (itemId: string) => `/api/orders/cart/${itemId}`,
      PRINTING_CLEAR: '/api/orders/cart/clear',
      PRINTING_COUPON: '/api/orders/cart/apply-coupon',
      // Gifting Cart
      GIFTING_GET: '/api/gifting-cart',
      GIFTING_ADD: '/api/gifting-cart/add',
      GIFTING_REMOVE: (itemId: string) => `/api/gifting-cart/${itemId}`,
      // Shopping Cart
      SHOPPING_GET: '/api/shopping-cart',
      SHOPPING_ADD: '/api/shopping-cart/add',
      SHOPPING_REMOVE: (itemId: string) => `/api/shopping-cart/${itemId}`,
    },
    // Delivery
    DELIVERY: {
      TRACK: (orderId: string) => `/api/delivery/track/${orderId}`,
    },
    // Designs
    DESIGNS: {
      TEMPLATES_PREMIUM: '/api/designs/templates/premium',
      TEMPLATES: '/api/designs/templates',
      FROM_TEMPLATE: '/api/designs/from-template',
      BLANK: '/api/designs/blank',
      SAVE: '/api/designs',
      MY_DESIGNS: '/api/designs',
      DESIGN_BY_ID: (id: string) => `/api/designs/${id}`,
      UPDATE_DESIGN: (id: string) => `/api/designs/${id}`,
      APPROVE_DESIGN: (id: string) => `/api/designs/${id}/approve`,
      PRODUCT_FRAMES: (productId: string) => `/api/designs/product/${productId}/frames`,
      // Customization endpoints
      TEMPLATES_BY_VARIANT: (variantId: string) => `/api/designs/templates/by-variant/${variantId}`,
      TEMPLATES_BY_PRODUCT: (productId: string) => `/api/designs/templates/by-product/${productId}`,
      TEMPLATE_CONFIG: (variantId: string) => `/api/designs/template-config/${variantId}`,
      TEMPLATE_BY_ID: (templateId: string) => `/api/designs/templates/${templateId}`,
      CUSTOMIZATIONS: '/api/designs/customizations',
      CUSTOMIZATION_BY_ID: (id: string) => `/api/designs/customizations/${id}`,
      CUSTOMIZATION_ASSETS: (id: string) => `/api/designs/customizations/${id}/assets`,
      CUSTOMIZATION_SLOT: (id: string, slotId: string) => `/api/designs/customizations/${id}/slots/${slotId}`,
      CUSTOMIZATION_PREVIEW: (id: string) => `/api/designs/customizations/${id}/render-preview`,
      CUSTOMIZATION_FINALIZE: (id: string) => `/api/designs/customizations/${id}/finalize`,
    },
  },
} as const;

export default API_CONFIG;
