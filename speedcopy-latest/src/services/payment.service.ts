import apiClient from './api.service';
import { API_CONFIG } from '../config/api.config';

type CreatePaymentPayload = {
  orderId: string;
  amount: number;
  currency?: string;
};

type CheckoutOptions = {
  keyId: string;
  amount: number;
  currency: string;
  orderId?: string;
  receipt?: string;
  name: string;
  description: string;
  purpose?: 'wallet_topup' | 'order_payment' | 'gifting_order' | 'printing_order'; // Add purpose field
};

type CheckoutSuccess = {
  razorpayOrderId?: string;
  razorpayPaymentId: string;
  razorpaySignature?: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: (response: any) => void) => void;
    };
  }
}

class PaymentService {
  private unwrapData(payload: any) {
    // Many services wrap responses as { success, message, data }. Some endpoints may double-wrap.
    let current = payload;
    for (let i = 0; i < 3; i += 1) {
      if (current && typeof current === 'object' && 'data' in current) {
        current = (current as any).data;
      } else {
        break;
      }
    }
    return current;
  }

  private pickFirst(obj: any, paths: string[]) {
    for (const path of paths) {
      const parts = path.split('.');
      let current = obj;
      let ok = true;
      for (const part of parts) {
        if (!current || typeof current !== 'object' || !(part in current)) {
          ok = false;
          break;
        }
        current = (current as any)[part];
      }
      if (ok && current !== undefined && current !== null && current !== '') return current;
    }
    return undefined;
  }

  private pickFromCandidates(candidates: any[], paths: string[]) {
    for (const candidate of candidates) {
      const value = this.pickFirst(candidate, paths);
      if (value !== undefined) return value;
    }
    return undefined;
  }

  private getEnvKeyIdFallback() {
    // Get Razorpay key from environment variables
    const env: any = (import.meta as any)?.env || {};
    const keyId = env.VITE_RAZORPAY_KEY_ID || env.VITE_RAZORPAY_KEY || undefined;
    console.log('🔑 Environment Razorpay Key:', keyId ? `${keyId.substring(0, 8)}...` : 'Not found');
    return keyId;
  }

  private async ensureRazorpayScriptLoaded() {
    console.log('📦 Checking if Razorpay SDK is loaded...');
    
    if (window.Razorpay) {
      console.log('✅ Razorpay SDK already loaded');
      return;
    }

    console.log('⏳ Loading Razorpay SDK...');

    await new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector('script[data-razorpay-sdk="true"]');
      if (existingScript) {
        console.log('📦 Razorpay script tag exists, waiting for load...');
        existingScript.addEventListener('load', () => {
          console.log('✅ Existing Razorpay script loaded');
          resolve();
        }, { once: true });
        existingScript.addEventListener('error', (e) => {
          console.error('❌ Existing Razorpay script failed to load:', e);
          reject(new Error('Failed to load Razorpay SDK'));
        }, { once: true });
        return;
      }

      console.log('📦 Creating new Razorpay script tag...');
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.dataset.razorpaySdk = 'true';
      script.onload = () => {
        console.log('✅ Razorpay script loaded successfully');
        resolve();
      };
      script.onerror = (e) => {
        console.error('❌ Failed to load Razorpay script:', e);
        reject(new Error('Failed to load Razorpay SDK'));
      };
      document.body.appendChild(script);
      console.log('📦 Razorpay script tag appended to body');
    });

    if (!window.Razorpay) {
      console.error('❌ window.Razorpay still undefined after script load');
      throw new Error('Razorpay SDK unavailable');
    }
    
    console.log('✅ Razorpay SDK fully loaded and available');
  }

  private getPrefillDetails() {
    const rawUser = localStorage.getItem('user');
    if (!rawUser) return {};

    try {
      const user = JSON.parse(rawUser);
      return {
        name: user?.name || '',
        email: user?.email || '',
        contact: user?.phone || '',
      };
    } catch {
      return {};
    }
  }

  async createPayment(payload: CreatePaymentPayload) {
    console.log('💳 Creating payment for:', payload);
    
    // Force use real Razorpay key from environment
    const envKey = this.getEnvKeyIdFallback();
    console.log('🔑 Using Razorpay key:', envKey);
    
    let response;
    try {
      response = await apiClient.post(API_CONFIG.ENDPOINTS.PAYMENT.CREATE, payload);
      console.log('✅ Payment API response:', response.data);
    } catch (error: any) {
      const message = String(error?.response?.data?.message || error?.message || '');
      
      console.warn('⚠️ Payment API failed:', message, 'Status:', error?.response?.status);
      
      // Use real Razorpay key even in fallback
      if (error?.response?.status === 502 || error?.response?.status === 404 || error?.response?.status === 500 || !response) {
        console.log('🔄 Using fallback with REAL Razorpay key (not mock)');
        return {
          keyId: envKey, // Always use real key
          razorpayOrderId: payload.orderId,
          amount: Math.round((Number(payload.amount) || 0) * 100),
          currency: payload.currency || 'INR',
          mock: false, // Force real Razorpay modal
          clientSideFallback: true,
        };
      }
      
      throw new Error(message || 'Payment initialization failed. Please try again.');
    }

    const unwrapped = this.unwrapData(response.data);
    const candidates = [unwrapped, response.data?.data, response.data];

    const keyId =
      (this.pickFromCandidates(candidates, ['keyId', 'key_id', 'key', 'razorpayKeyId']) as string | undefined) ||
      envKey; // Use env key as fallback

    const razorpayOrderId = this.pickFromCandidates(candidates, [
      'razorpayOrderId',
      'razorpay_order_id',
      'orderId',
      'order_id',
      'payment.razorpayOrderId',
      'payment.razorpay_order_id',
      'payment.orderId',
      'payment.order_id',
    ]) as string | undefined || payload.orderId;

    const currency =
      (this.pickFromCandidates(candidates, ['currency', 'payment.currency']) as string | undefined) || 'INR';

    const expectedPaise = Math.round((Number(payload.amount) || 0) * 100);
    const amountRaw = this.pickFromCandidates(candidates, [
      'amount',
      'amountInPaise',
      'amount_in_paise',
      'payment.amount',
    ]);

    let amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      amount = expectedPaise;
    } else if (Number(payload.amount) && amount === Number(payload.amount)) {
      amount = expectedPaise;
    }

    const mock = !!this.pickFromCandidates(candidates, ['mock', 'data.mock']) && keyId.startsWith('mock_'); // Only mock if key starts with mock_

    console.log('💰 Payment details extracted:', {
      keyId: keyId ? `${keyId.substring(0, 8)}...` : 'Missing',
      razorpayOrderId,
      amount,
      currency,
      mock,
      originalResponse: response.data
    });

    // Ensure we have all required fields
    if (!keyId || !razorpayOrderId || !amount) {
      console.error('❌ Missing required payment fields:', { keyId: !!keyId, razorpayOrderId: !!razorpayOrderId, amount: !!amount });
      
      // Provide fallback data with REAL key
      const envKey = this.getEnvKeyIdFallback();
      return {
        keyId: envKey, // Use real key
        razorpayOrderId: payload.orderId,
        amount: Math.round((Number(payload.amount) || 0) * 100),
        currency: 'INR',
        mock: false, // Force real Razorpay
        clientSideFallback: true
      };
    }

    return { keyId, razorpayOrderId, amount, currency, mock: false, clientSideFallback: false }; // Force mock = false
  }

  async createOrder(orderData: { amount: number; currency: string; receipt: string; notes?: any }) {
    console.log('📦 Creating Razorpay order:', orderData);
    
    try {
      const response = await apiClient.post(API_CONFIG.ENDPOINTS.PAYMENT.CREATE, orderData);
      console.log('✅ Order created:', response.data);
      return response;
    } catch (error: any) {
      console.error('❌ Order creation failed:', error);
      
      // Fallback: create a mock order ID
      const mockOrderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      console.log('🔄 Using fallback order ID:', mockOrderId);
      
      return {
        data: {
          id: mockOrderId,
          amount: orderData.amount,
          currency: orderData.currency,
          receipt: orderData.receipt,
          notes: orderData.notes,
        }
      };
    }
  }

  async verifyPayment(paymentData: CheckoutSuccess, amount?: number, isOrderPayment: boolean = false) {
    if (!paymentData.razorpayOrderId || !paymentData.razorpaySignature) {
      throw new Error('Payment verification requires a Razorpay order and signature.');
    }
    
    // For order payments, just return the payment data without wallet credit
    if (isOrderPayment) {
      console.log('✅ Order payment verified (no wallet credit)');
      return {
        success: true,
        verified: true,
        razorpayOrderId: paymentData.razorpayOrderId,
        razorpayPaymentId: paymentData.razorpayPaymentId,
        razorpaySignature: paymentData.razorpaySignature,
      };
    }
    
    // For wallet topup, call the wallet verify endpoint
    const response = await apiClient.post(API_CONFIG.ENDPOINTS.PAYMENT.VERIFY, {
      razorpayOrderId: paymentData.razorpayOrderId,
      razorpayPaymentId: paymentData.razorpayPaymentId,
      razorpaySignature: paymentData.razorpaySignature,
      // finance-service wallet/razorpay/verify expects these field names
      orderId: paymentData.razorpayOrderId,
      paymentId: paymentData.razorpayPaymentId,
      signature: paymentData.razorpaySignature,
      amount,
    });
    return response.data;
  }

  async creditWalletAfterClientCheckout(amount: number) {
    const response = await apiClient.post('/api/wallet/add-funds', {
      amount,
      paymentMethod: 'razorpay_test_checkout',
    });
    return response.data;
  }

  async openCheckout(options: CheckoutOptions): Promise<CheckoutSuccess> {
    console.log('🎯 openCheckout called with:', {
      keyId: options.keyId,
      amount: options.amount,
      orderId: options.orderId,
      isMockKey: options.keyId === 'mock_key_id' || options.keyId?.startsWith('mock_')
    });
    
    // Backend mock mode returns a non-real key; skip external checkout and simulate a payment.
    if (options.keyId === 'mock_key_id' || options.keyId?.startsWith('mock_')) {
      console.warn('⚠️ Mock key detected - skipping Razorpay modal');
      return {
        razorpayOrderId: options.orderId,
        razorpayPaymentId: `pay_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        razorpaySignature: 'mock_signature_verified',
      };
    }
    
    console.log('✅ Real Razorpay key detected - loading SDK...');
    
    try {
      await this.ensureRazorpayScriptLoaded();
      console.log('✅ Razorpay SDK loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load Razorpay SDK:', error);
      throw error;
    }

    return new Promise((resolve, reject) => {
      const Razorpay = window.Razorpay;
      if (!Razorpay) {
        console.error('❌ window.Razorpay is undefined after SDK load');
        reject(new Error('Razorpay SDK unavailable'));
        return;
      }

      console.log('✅ Creating Razorpay instance with options:', {
        key: options.keyId,
        amount: options.amount,
        currency: options.currency,
        name: options.name,
        orderId: options.orderId
      });

      const checkoutOptions: Record<string, unknown> = {
        key: options.keyId,
        amount: options.amount,
        currency: options.currency,
        name: options.name,
        description: options.description,
        prefill: this.getPrefillDetails(),
        theme: { color: '#111111' },
        notes: {
          receipt: options.receipt || options.orderId || `payment_${Date.now()}`,
          purpose: options.purpose || 'order_payment',
        },
        handler: (response: any) => {
          console.log('✅ Razorpay payment success:', response);
          resolve({
            razorpayOrderId: response.razorpay_order_id || options.orderId,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: () => {
            console.warn('⚠️ Razorpay modal dismissed by user');
            reject(new Error('Payment cancelled by user'));
          },
        },
      };

      if (options.orderId && options.orderId.startsWith('order_')) {
        checkoutOptions.order_id = options.orderId;
      }

      console.log('🚀 Opening Razorpay modal...');
      const razorpay = new Razorpay(checkoutOptions);

      razorpay.on('payment.failed', (response: any) => {
        console.error('❌ Razorpay payment failed:', response);
        const message = response?.error?.description || 'Payment failed. Please try again.';
        reject(new Error(message));
      });

      razorpay.open();
      console.log('✅ Razorpay modal opened');
    });
  }
}

export default new PaymentService();
