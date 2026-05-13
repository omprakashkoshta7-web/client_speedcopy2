import React, { useState } from 'react';
import paymentService from '../services/payment.service';
import walletService from '../services/wallet.service';
import financeService from '../services/finance.service';

const RazorpayTest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  // Get environment Razorpay key
  const getEnvRazorpayKey = () => {
    const env: any = (import.meta as any)?.env || {};
    return env.VITE_RAZORPAY_KEY_ID || env.VITE_RAZORPAY_KEY || 'Not configured';
  };

  const testPaymentFlow = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      console.log('🧪 Testing Razorpay payment flow...');
      console.log('🔑 Environment key:', getEnvRazorpayKey());

      // Test 1: Try wallet service
      try {
        console.log('1️⃣ Testing wallet service...');
        const walletResponse = await walletService.initiateRazorpay(100);
        console.log('✅ Wallet service success:', walletResponse);
        setResult({ service: 'wallet', response: walletResponse, envKey: getEnvRazorpayKey() });
        return;
      } catch (walletErr) {
        console.log('❌ Wallet service failed:', walletErr);
      }

      // Test 2: Try finance service
      try {
        console.log('2️⃣ Testing finance service...');
        const financeResponse = await financeService.initiateRazorpayPayment(100);
        console.log('✅ Finance service success:', financeResponse);
        setResult({ service: 'finance', response: financeResponse, envKey: getEnvRazorpayKey() });
        return;
      } catch (financeErr) {
        console.log('❌ Finance service failed:', financeErr);
      }

      // Test 3: Try payment service
      try {
        console.log('3️⃣ Testing payment service...');
        const paymentResponse = await paymentService.createPayment({
          orderId: `test_${Date.now()}`,
          amount: 100,
          currency: 'INR'
        });
        console.log('✅ Payment service success:', paymentResponse);
        setResult({ service: 'payment', response: paymentResponse, envKey: getEnvRazorpayKey() });
        return;
      } catch (paymentErr) {
        console.log('❌ Payment service failed:', paymentErr);
        throw paymentErr;
      }

    } catch (err: any) {
      console.error('💥 All services failed:', err);
      setError(err.message || 'All payment services failed');
    } finally {
      setLoading(false);
    }
  };

  const testRealPayment = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      console.log('💳 Testing real Razorpay payment with env key...');
      
      const envKey = getEnvRazorpayKey();
      if (!envKey || envKey === 'Not configured') {
        throw new Error('Razorpay key not configured in environment');
      }

      // Create payment data with environment key
      const paymentData = {
        keyId: envKey,
        razorpayOrderId: `order_${Date.now()}`,
        amount: 10000, // 100 INR in paise
        currency: 'INR',
        mock: false,
        clientSideFallback: false
      };

      console.log('✅ Real payment data:', {
        ...paymentData,
        keyId: `${paymentData.keyId.substring(0, 8)}...`
      });
      
      setResult({ service: 'real', response: paymentData, envKey });

      // Test opening checkout with real key
      try {
        console.log('🎯 Opening Razorpay checkout...');
        const checkoutResult = await paymentService.openCheckout({
          keyId: paymentData.keyId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          orderId: paymentData.razorpayOrderId,
          receipt: `test_${Date.now()}`,
          name: 'SpeedCopy Test',
          description: 'Test Payment',
        });
        
        console.log('✅ Real checkout result:', checkoutResult);
        setResult((prev: any) => ({ ...prev, checkoutResult }));
      } catch (checkoutErr: any) {
        console.log('ℹ️ Checkout cancelled or failed:', checkoutErr.message);
        setResult((prev: any) => ({ ...prev, checkoutError: checkoutErr.message }));
      }

    } catch (err: any) {
      console.error('💥 Real payment test failed:', err);
      setError(err.message || 'Real payment test failed');
    } finally {
      setLoading(false);
    }
  };

  const testMockPayment = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      console.log('🎭 Testing mock payment...');
      
      // Create mock payment data
      const mockPaymentData = {
        keyId: 'mock_key_id',
        razorpayOrderId: `mock_order_${Date.now()}`,
        amount: 10000, // 100 INR in paise
        currency: 'INR',
        mock: true,
        clientSideFallback: true
      };

      console.log('✅ Mock payment data:', mockPaymentData);
      setResult({ service: 'mock', response: mockPaymentData, envKey: getEnvRazorpayKey() });

      // Test opening checkout with mock data
      try {
        const checkoutResult = await paymentService.openCheckout({
          keyId: mockPaymentData.keyId,
          amount: mockPaymentData.amount,
          currency: mockPaymentData.currency,
          orderId: mockPaymentData.razorpayOrderId,
          receipt: `test_${Date.now()}`,
          name: 'SpeedCopy Test',
          description: 'Test Payment',
        });
        
        console.log('✅ Mock checkout result:', checkoutResult);
        setResult((prev: any) => ({ ...prev, checkoutResult }));
      } catch (checkoutErr) {
        console.log('ℹ️ Mock checkout handled:', checkoutErr);
        // Mock checkout will return mock data
        const mockCheckoutResult = {
          razorpayOrderId: mockPaymentData.razorpayOrderId,
          razorpayPaymentId: `pay_mock_${Date.now()}`,
          razorpaySignature: 'mock_signature_verified'
        };
        setResult((prev: any) => ({ ...prev, checkoutResult: mockCheckoutResult }));
      }

    } catch (err: any) {
      console.error('💥 Mock payment failed:', err);
      setError(err.message || 'Mock payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Razorpay Integration Test</h2>
      
      {/* Environment Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-blue-800 mb-2">Environment Configuration</h3>
        <p className="text-sm text-blue-700">
          <strong>Razorpay Key:</strong> {getEnvRazorpayKey() !== 'Not configured' ? 
            `${getEnvRazorpayKey().substring(0, 8)}...` : 
            'Not configured'
          }
        </p>
        <p className="text-sm text-blue-700">
          <strong>Status:</strong> {getEnvRazorpayKey() !== 'Not configured' ? 
            '✅ Configured' : 
            '❌ Missing'
          }
        </p>
      </div>
      
      <div className="space-y-4">
        <button
          onClick={testPaymentFlow}
          disabled={loading}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Payment APIs'}
        </button>

        <button
          onClick={testRealPayment}
          disabled={loading || getEnvRazorpayKey() === 'Not configured'}
          className="w-full bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Real Razorpay Payment'}
        </button>

        <button
          onClick={testMockPayment}
          disabled={loading}
          className="w-full bg-yellow-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Mock Payment'}
        </button>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-semibold mb-2">Test Result:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="mt-6 text-sm text-gray-600">
        <h3 className="font-semibold mb-2">How to fix Razorpay errors:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>✅ Razorpay key is configured: <code>VITE_RAZORPAY_KEY_ID=rzp_test_6vdMK3ln1NsDMj</code></li>
          <li>Check if backend APIs are running on port 4000</li>
          <li>Verify network connectivity to localhost:4000</li>
          <li>Use "Test Real Razorpay Payment" for actual integration</li>
          <li>Check browser console for detailed logs</li>
          <li>Ensure .env file is in client/ directory</li>
        </ul>
      </div>
    </div>
  );
};

export default RazorpayTest;