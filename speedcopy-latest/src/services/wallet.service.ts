import apiClient from './api.service';
import { API_CONFIG } from '../config/api.config';

// ── Interfaces matching exact backend response ──────────────────────────────

export interface WalletObject {
  _id: string;
  userId: string;
  userType: string;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerEntry {
  _id: string;
  walletId: string;
  userId: string;
  type: 'credit' | 'debit';
  category: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId: string;
  referenceType: string;
  description: string;
  metadata: any;
  createdAt: string;
}

export interface WalletBalance {
  balance: number;
  currency: string;
  lastUpdated?: string;
}

export interface WalletLedger {
  entries: LedgerEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RazorpayInitiateResponse {
  keyId: string;
  razorpayOrderId: string;
  amount: number;   // paise mein
  currency: string;
  mock?: boolean;
}

export interface RazorpayVerifyResponse {
  wallet: WalletObject;
  entry: LedgerEntry;
}

// Legacy compat
export interface Transaction extends LedgerEntry {
  status: string;
}

export interface TopupConfig {
  minAmount: number;
  maxAmount: number;
  processingFee: number;
  feePercentage: number;
  paymentMethods: string[];
  limits: { daily: number; monthly: number };
}

export interface TopupPreview {
  amount: number;
  processingFee: number;
  total: number;
  currency: string;
}

// ── Service ─────────────────────────────────────────────────────────────────

class WalletService {

  private wrapSuccess<T>(data: T) {
    return { success: true, data };
  }

  // ── 1. GET /api/wallet ───────────────────────────────────────────────────
  async getBalance(): Promise<{ success: boolean; data: WalletBalance }> {
    try {
      const res = await apiClient.get(API_CONFIG.ENDPOINTS.FINANCE.WALLET);
      // Response: { success, data: { _id, balance, currency, ... } }
      const wallet: WalletObject = res.data?.data || res.data;
      return this.wrapSuccess({
        balance: Number(wallet?.balance) || 0,
        currency: wallet?.currency || 'INR',
        lastUpdated: wallet?.updatedAt || new Date().toISOString(),
      });
    } catch (err: any) {
      console.warn('⚠️ GET /api/wallet failed:', err?.response?.status);
      return this.wrapSuccess({ balance: 0, currency: 'INR', lastUpdated: new Date().toISOString() });
    }
  }

  // ── 2. GET /api/wallet/overview ──────────────────────────────────────────
  // Returns wallet + recent_entries + topup_presets + payment_methods
  async getOverview(): Promise<{ success: boolean; data: any }> {
    try {
      const res = await apiClient.get(API_CONFIG.ENDPOINTS.FINANCE.WALLET_OVERVIEW);
      return this.wrapSuccess(res.data?.data || res.data);
    } catch (err: any) {
      console.warn('⚠️ GET /api/wallet/overview failed:', err?.response?.status);
      // Fallback to basic wallet
      return this.getBalance().then(b => this.wrapSuccess({
        wallet: { balance: b.data.balance, currency: b.data.currency },
        recent_entries: [],
        topup_presets: [50, 100, 500, 1000],
        payment_methods: [],
      }));
    }
  }

  // ── 3. GET /api/wallet/topup-config ─────────────────────────────────────
  async getTopupConfig(): Promise<{ success: boolean; data: TopupConfig }> {
    try {
      const res = await apiClient.get(API_CONFIG.ENDPOINTS.FINANCE.TOPUP_CONFIG);
      const d = res.data?.data || res.data;
      return this.wrapSuccess({
        minAmount: d?.min_amount ?? 10,
        maxAmount: d?.max_amount ?? 50000,
        processingFee: 0,
        feePercentage: d?.processing_fee_pct ?? 0,
        paymentMethods: (d?.payment_methods || []).map((m: any) => m.id || m),
        limits: { daily: 25000, monthly: 100000 },
      });
    } catch {
      return this.wrapSuccess({
        minAmount: 10, maxAmount: 50000, processingFee: 0, feePercentage: 0,
        paymentMethods: ['upi', 'card', 'netbanking'],
        limits: { daily: 25000, monthly: 100000 },
      });
    }
  }

  // ── 4. POST /api/wallet/topup-preview ───────────────────────────────────
  async previewTopup(amount: number): Promise<{ success: boolean; data: TopupPreview }> {
    try {
      const res = await apiClient.post(API_CONFIG.ENDPOINTS.FINANCE.TOPUP_PREVIEW, { amount });
      const d = res.data?.data || res.data;
      return this.wrapSuccess({
        amount: d?.amount ?? amount,
        processingFee: d?.processing_fee ?? 0,
        total: d?.total_payable ?? amount,
        currency: d?.currency ?? 'INR',
      });
    } catch {
      return this.wrapSuccess({ amount, processingFee: 0, total: amount, currency: 'INR' });
    }
  }

  // ── 5. POST /api/wallet/add-funds ────────────────────────────────────────
  async addFunds(amount: number, paymentMethod: string): Promise<{ success: boolean; data: any }> {
    const res = await apiClient.post(API_CONFIG.ENDPOINTS.FINANCE.ADD_FUNDS, { amount, paymentMethod });
    return res.data;
  }

  // ── 6. POST /api/wallet/razorpay/initiate ────────────────────────────────
  async initiateRazorpay(
    amount: number,
    orderId?: string
  ): Promise<{ success: boolean; data: RazorpayInitiateResponse }> {
    console.log('🚀 Initiating Razorpay for ₹', amount);
    const res = await apiClient.post(API_CONFIG.ENDPOINTS.FINANCE.RAZORPAY_INITIATE, {
      orderId: orderId || `wallet_topup_${Date.now()}`,
      amount,          // rupees — backend converts to paise
      currency: 'INR',
    });
    console.log('✅ Razorpay initiate response:', res.data);
    const d = res.data?.data || res.data;
    return this.wrapSuccess({
      keyId: d?.keyId || d?.key_id || this.getRazorpayKey(),
      razorpayOrderId: d?.razorpayOrderId || d?.razorpay_order_id || '',
      amount: d?.amount || Math.round(amount * 100),   // paise
      currency: d?.currency || 'INR',
      mock: d?.mock || false,
    });
  }

  // ── 7. POST /api/wallet/razorpay/verify ──────────────────────────────────
  async verifyRazorpay(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    amountPaise?: number   // paise mein (live mode only)
  ): Promise<{ success: boolean; data: RazorpayVerifyResponse }> {
    console.log('🔐 Verifying Razorpay payment...');
    const res = await apiClient.post(API_CONFIG.ENDPOINTS.FINANCE.RAZORPAY_VERIFY, {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      amount: amountPaise,
    });
    console.log('✅ Verify response:', res.data);
    return res.data;
  }

  // ── 8. GET /api/wallet/ledger ────────────────────────────────────────────
  async getLedger(params?: {
    page?: number;
    limit?: number;
    category?: string;
  }): Promise<{ success: boolean; data: WalletLedger }> {
    try {
      const res = await apiClient.get(API_CONFIG.ENDPOINTS.FINANCE.LEDGER, { params });
      const d = res.data?.data || res.data;
      return this.wrapSuccess({
        entries: d?.entries || [],
        pagination: {
          page: d?.meta?.page ?? params?.page ?? 1,
          limit: d?.meta?.limit ?? params?.limit ?? 20,
          total: d?.meta?.total ?? 0,
          totalPages: d?.meta?.totalPages ?? 1,
        },
      });
    } catch (err: any) {
      console.warn('⚠️ GET /api/wallet/ledger failed:', err?.response?.status);
      return this.wrapSuccess({
        entries: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
    }
  }

  // Alias used by WalletPage
  async getTransactionHistory(params?: {
    page?: number;
    limit?: number;
    category?: string;
  }): Promise<{ success: boolean; data: WalletLedger }> {
    return this.getLedger(params);
  }

  // ── Utilities ────────────────────────────────────────────────────────────
  private getRazorpayKey(): string {
    const env: any = (import.meta as any)?.env || {};
    return env.VITE_RAZORPAY_KEY_ID || env.VITE_RAZORPAY_KEY || 'rzp_test_6vdMK3ln1NsDMj';
  }

  async validateTopupAmount(amount: number): Promise<{ valid: boolean; message?: string }> {
    const cfg = await this.getTopupConfig();
    if (amount < cfg.data.minAmount)
      return { valid: false, message: `Minimum topup amount is ₹${cfg.data.minAmount}` };
    if (amount > cfg.data.maxAmount)
      return { valid: false, message: `Maximum topup amount is ₹${cfg.data.maxAmount}` };
    return { valid: true };
  }

  async getPaymentMethods() {
    const cfg = await this.getTopupConfig();
    return cfg.data.paymentMethods;
  }
}

export default new WalletService();
