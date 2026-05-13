/**
 * Discount Utility Functions
 * Backend-driven discount system for SpeedCopy products
 */

import { type Product } from '../services/product.service';

export interface DiscountInfo {
  hasDiscount: boolean;
  discountPct: number;
  currentPrice: number;
  originalPrice: number | null;
  showStrikethrough: boolean;
  badge: string | null;
  badgeColor: string;
  badgeText: string;
  savings: number;
}

export interface PriceDisplay {
  currentPrice: string;
  originalPrice: string | null;
  showStrikethrough: boolean;
  formattedSavings: string | null;
}

/**
 * Calculate discount information from product data
 */
export const calculateDiscountInfo = (product: Product): DiscountInfo => {
  const discountPct = Number(product.discount_pct || 0);
  const currentPrice = product.sale_price ?? product.mrp ?? 0;
  const originalPrice = product.mrp ?? currentPrice;
  const hasDiscount = discountPct > 0 && originalPrice > currentPrice;
  const savings = hasDiscount ? originalPrice - currentPrice : 0;

  // Determine badge info
  let badge = product.badge || null;
  let badgeText = '';
  let badgeColor = '';

  if (discountPct > 0) {
    badgeText = `${discountPct}% OFF`;
    badgeColor = 'bg-red-500';
    badge = 'sale';
  } else if (product.badge === 'new') {
    badgeText = 'NEW';
    badgeColor = 'bg-blue-500';
  } else if (product.badge === 'trending') {
    badgeText = 'TRENDING';
    badgeColor = 'bg-orange-500';
  } else if (product.badge === 'bestseller') {
    badgeText = 'BESTSELLER';
    badgeColor = 'bg-green-500';
  } else if (product.badge === 'deal') {
    badgeText = 'DEAL';
    badgeColor = 'bg-purple-500';
  } else if (product.is_deal_of_day) {
    badgeText = 'DEAL OF THE DAY';
    badgeColor = 'bg-gradient-to-r from-red-500 to-orange-500';
  }

  return {
    hasDiscount,
    discountPct,
    currentPrice,
    originalPrice: hasDiscount ? originalPrice : null,
    showStrikethrough: hasDiscount,
    badge,
    badgeColor,
    badgeText,
    savings
  };
};

/**
 * Format price display with currency
 */
export const formatPriceDisplay = (discountInfo: DiscountInfo): PriceDisplay => {
  const currentPrice = `₹${discountInfo.currentPrice.toLocaleString('en-IN')}`;
  const originalPrice = discountInfo.originalPrice 
    ? `₹${discountInfo.originalPrice.toLocaleString('en-IN')}` 
    : null;
  const formattedSavings = discountInfo.savings > 0 
    ? `Save ₹${discountInfo.savings.toLocaleString('en-IN')}` 
    : null;

  return {
    currentPrice,
    originalPrice,
    showStrikethrough: discountInfo.showStrikethrough,
    formattedSavings
  };
};

/**
 * Check if product has any special deal
 */
export const hasSpecialDeal = (product: Product): boolean => {
  return product.is_deal_of_day || 
         (product.discount_pct && product.discount_pct > 20) ||
         product.badge === 'deal';
};

/**
 * Get deal expiry countdown
 */
export const getDealCountdown = (product: Product): string | null => {
  if (!product.deal_expires_at) return null;
  
  const expiryTime = new Date(product.deal_expires_at).getTime();
  const currentTime = new Date().getTime();
  const timeLeft = expiryTime - currentTime;
  
  if (timeLeft <= 0) return 'Deal Expired';
  
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h left`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  } else {
    return `${minutes}m left`;
  }
};

/**
 * Sort products by discount percentage (highest first)
 */
export const sortByDiscount = (products: Product[]): Product[] => {
  return [...products].sort((a, b) => {
    const discountA = Number(a.discount_pct || 0);
    const discountB = Number(b.discount_pct || 0);
    return discountB - discountA;
  });
};

/**
 * Filter products with discounts only
 */
export const filterDiscountedProducts = (products: Product[]): Product[] => {
  return products.filter(product => {
    const discountPct = Number(product.discount_pct || 0);
    return discountPct > 0;
  });
};

/**
 * Get discount badge CSS classes
 */
export const getDiscountBadgeClasses = (badgeColor: string): string => {
  const baseClasses = 'absolute top-2 left-2 px-2 py-1 text-xs font-bold text-white rounded-md shadow-lg z-10';
  return `${baseClasses} ${badgeColor}`;
};

/**
 * Calculate bulk discount if applicable
 */
export const calculateBulkDiscount = (product: Product, quantity: number): DiscountInfo => {
  const baseDiscount = calculateDiscountInfo(product);
  
  // If product has bulk pricing and quantity meets minimum
  if (product.bulk_price && product.min_bulk_qty && quantity >= product.min_bulk_qty) {
    const bulkPrice = product.bulk_price;
    const regularPrice = product.sale_price ?? product.mrp ?? 0;
    const bulkSavings = (regularPrice - bulkPrice) * quantity;
    const bulkDiscountPct = Math.round(((regularPrice - bulkPrice) / regularPrice) * 100);
    
    return {
      ...baseDiscount,
      currentPrice: bulkPrice,
      discountPct: Math.max(baseDiscount.discountPct, bulkDiscountPct),
      savings: baseDiscount.savings + bulkSavings,
      badgeText: `BULK ${bulkDiscountPct}% OFF`,
      badgeColor: 'bg-indigo-500'
    };
  }
  
  return baseDiscount;
};

/**
 * Check if product is on sale
 */
export const isOnSale = (product: Product): boolean => {
  return calculateDiscountInfo(product).hasDiscount;
};

/**
 * Get price comparison text
 */
export const getPriceComparisonText = (product: Product): string | null => {
  const discountInfo = calculateDiscountInfo(product);
  
  if (!discountInfo.hasDiscount) return null;
  
  if (discountInfo.discountPct >= 50) {
    return 'Huge Savings!';
  } else if (discountInfo.discountPct >= 30) {
    return 'Great Deal!';
  } else if (discountInfo.discountPct >= 15) {
    return 'Good Savings';
  } else {
    return 'On Sale';
  }
};