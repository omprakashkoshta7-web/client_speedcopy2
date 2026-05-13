import apiClient from './api.service';
import { API_CONFIG } from '../config/api.config';

class FinanceService {
  private isNotFoundError(error: any) {
    return error?.response?.status === 404;
  }

  private isRouteNotFoundError(error: any) {
    return this.isNotFoundError(error)
      && error?.response?.data?.message === 'Route not found';
  }

  private async getWalletBundle() {
    const response = await apiClient.get('/api/app/wallet');
    return response.data;
  }

  private extractWalletBundle(bundle: any) {
    return bundle?.data || bundle || {};
  }

  private wrapSuccess(data: any) {
    return {
      success: true,
      data,
    };
  }

  // 1. Get Wallet Balance - Current balance dekhna
  async getWalletBalance() {
    try {
      // Use /api/wallet instead of /api/wallet/balance (which doesn't exist)
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.FINANCE.WALLET);
      const walletData = response.data?.data || response.data;
      return {
        success: true,
        data: { balance: walletData.balance || 0 }
      };
    } catch (error) {
      if (!this.isRouteNotFoundError(error)) throw error;

      const bundle = this.extractWalletBundle(await this.getWalletBundle());
      const wallet = bundle?.overview?.wallet || bundle?.overview || {};
      return this.wrapSuccess({ balance: wallet.balance || 0 });
    }
  }

  // Get wallet (existing method - maintains compatibility)
  async getWallet() {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.FINANCE.WALLET);
      return response.data;
    } catch (error) {
      if (!this.isRouteNotFoundError(error)) throw error;

      const bundle = this.extractWalletBundle(await this.getWalletBundle());
      const wallet = bundle?.overview?.wallet || bundle?.overview || {};
      return this.wrapSuccess(wallet);
    }
  }

  // 2. Get Wallet Overview - Detailed stats (total spent, refunds)
  async getWalletOverview() {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.FINANCE.WALLET_OVERVIEW
      );
      return response.data;
    } catch (error) {
      if (!this.isRouteNotFoundError(error)) throw error;

      const bundle = this.extractWalletBundle(await this.getWalletBundle());
      return this.wrapSuccess(bundle?.overview || {});
    }
  }

  // 3. Get Wallet Ledger - Transaction history (paginated)
  async getLedger(params?: { page?: number; limit?: number; type?: string }) {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.FINANCE.LEDGER,
        { params }
      );
      return response.data;
    } catch (error) {
      if (!this.isRouteNotFoundError(error)) throw error;

      const bundle = this.extractWalletBundle(await this.getWalletBundle());
      return this.wrapSuccess(bundle?.ledger || {});
    }
  }

  // 4. Get Topup Config - Topup options aur limits
  async getTopupConfig() {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.FINANCE.TOPUP_CONFIG);
      return response.data;
    } catch (error) {
      if (!this.isRouteNotFoundError(error)) throw error;

      const bundle = this.extractWalletBundle(await this.getWalletBundle());
      const topupConfig = bundle?.topup_config || bundle?.overview || {};
      return this.wrapSuccess(topupConfig);
    }
  }

  // 5. Preview Topup - Topup amount + fees calculate karna
  async previewTopup(amount: number) {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.FINANCE.TOPUP_PREVIEW, { amount });
      return response.data;
    } catch (error) {
      // Fallback calculation if API not available
      const processingFee = 0; // 0% fee as per current implementation
      const total = amount + processingFee;
      return this.wrapSuccess({
        amount,
        processingFee,
        total,
        currency: 'INR'
      });
    }
  }

  // 6. Add Funds - Wallet mein paise add karna
  async addFunds(amount: number, paymentMethod: string) {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.FINANCE.ADD_FUNDS, {
        amount,
        paymentMethod,
      });
      return response.data;
    } catch (error) {
      if (!this.isNotFoundError(error)) throw error;

      const response = await apiClient.post('/api/app/wallet/add-funds', {
        amount,
        paymentMethod,
      });
      return response.data;
    }
  }

  // 7. Initiate Razorpay - Razorpay payment start karna
  async initiateRazorpayPayment(amount: number, orderId?: string) {
    console.log('🚀 Finance service initiating Razorpay for amount:', amount);
    
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.FINANCE.RAZORPAY_INITIATE, { 
        amount,
        orderId: orderId || `wallet_topup_${Date.now()}`,
        currency: 'INR'
      });
      
      console.log('✅ Finance API response:', response.data);
      
      // Handle different response structures
      const responseData = response.data?.data || response.data;
      
      return {
        success: true,
        data: responseData,
        keyId: responseData?.keyId || responseData?.key_id || responseData?.key || this.getEnvRazorpayKey(),
        razorpayOrderId: responseData?.razorpayOrderId || responseData?.razorpay_order_id || responseData?.orderId || orderId,
        amount: responseData?.amount || Math.round(amount * 100),
        currency: responseData?.currency || 'INR',
        mock: responseData?.mock || false,
        clientSideFallback: responseData?.clientSideFallback || false
      };
    } catch (error) {
      console.warn('⚠️ Finance API failed, trying payment service...', error);
      
      // Fallback to existing payment create endpoint
      try {
        const response = await apiClient.post(API_CONFIG.ENDPOINTS.PAYMENT.CREATE, {
          orderId: orderId || `wallet_topup_${Date.now()}`,
          amount,
          currency: 'INR'
        });
        
        console.log('✅ Payment API fallback response:', response.data);
        
        const responseData = response.data?.data || response.data;
        
        return {
          success: true,
          data: responseData,
          keyId: responseData?.keyId || responseData?.key_id || responseData?.key || this.getEnvRazorpayKey(),
          razorpayOrderId: responseData?.razorpayOrderId || responseData?.razorpay_order_id || responseData?.orderId || orderId,
          amount: responseData?.amount || Math.round(amount * 100),
          currency: responseData?.currency || 'INR',
          mock: responseData?.mock || false,
          clientSideFallback: responseData?.clientSideFallback || false
        };
      } catch (fallbackError) {
        console.warn('⚠️ Both APIs failed, using env configuration...', fallbackError);
        
        // If both APIs fail, use environment configuration
        const envKey = this.getEnvRazorpayKey();
        return {
          success: true,
          data: {},
          keyId: envKey,
          razorpayOrderId: orderId || `wallet_topup_${Date.now()}`,
          amount: Math.round(amount * 100),
          currency: 'INR',
          mock: !envKey || envKey.startsWith('mock_'),
          clientSideFallback: true
        };
      }
    }
  }

  private getEnvRazorpayKey(): string {
    const env: any = (import.meta as any)?.env || {};
    const keyId = env.VITE_RAZORPAY_KEY_ID || env.VITE_RAZORPAY_KEY || 'rzp_test_6vdMK3ln1NsDMj';
    console.log('🔑 Finance service using Razorpay key:', keyId ? `${keyId.substring(0, 8)}...` : 'Not found');
    return keyId;
  }

  // 8. Verify Razorpay - Payment verify karke wallet credit karna
  async verifyRazorpayPayment(orderId: string, paymentId: string, signature: string, amount?: number) {
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.FINANCE.RAZORPAY_VERIFY, {
        orderId,
        paymentId,
        signature,
        amount,
        // Also include alternate field names for compatibility
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
      });
      return response.data;
    } catch (error) {
      // Fallback to existing payment verify endpoint
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.PAYMENT.VERIFY, {
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
        orderId,
        paymentId,
        signature,
        amount,
      });
      return response.data;
    }
  }

  // 9. Transaction History - Pura transaction log
  async getTransactionHistory(params?: { page?: number; limit?: number; type?: string; startDate?: string; endDate?: string }) {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.FINANCE.TRANSACTION_HISTORY, { params });
      return response.data;
    } catch (error) {
      if (!this.isRouteNotFoundError(error)) throw error;

      // Fallback to ledger endpoint
      return this.getLedger(params);
    }
  }

  // Get payment methods (same as topup config)
  async getPaymentMethods() {
    return this.getTopupConfig();
  }

  // Handle payment failure
  async handlePaymentFailure(orderId: string, errorMessage: string) {
    const response = await apiClient.post('/api/wallet/razorpay/failure', {
      orderId,
      errorMessage,
    });
    return response.data;
  }

  // Get payment history (alias for transaction history)
  async getPaymentHistory(params?: { page?: number; limit?: number }) {
    return this.getTransactionHistory(params);
  }

  // Get referrals
  async getReferrals() {
    const response = await apiClient.get('/api/referrals');
    return response.data;
  }

  // Get referral summary
  async getReferralSummary() {
    const response = await apiClient.get('/api/referrals/summary');
    return response.data;
  }

  // Apply referral code
  async applyReferral(code: string) {
    const response = await apiClient.post('/api/referrals/apply', { code });
    return response.data;
  }
}

export default new FinanceService();
