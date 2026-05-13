import React, { useState, useEffect } from 'react';
import walletService from '../services/wallet.service';
import type { 
  WalletBalance, 
  WalletLedger, 
  TopupConfig, 
  TopupPreview 
} from '../services/wallet.service';

// WalletOverview is returned as 'any' from getOverview()
type WalletOverview = any;

/**
 * Wallet API Demo Component
 * Demonstrates all 9 wallet & finance APIs integration
 */
const WalletAPIDemo: React.FC = () => {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [overview, setOverview] = useState<WalletOverview | null>(null);
  const [ledger, setLedger] = useState<WalletLedger | null>(null);
  const [topupConfig, setTopupConfig] = useState<TopupConfig | null>(null);
  const [topupPreview, setTopupPreview] = useState<TopupPreview | null>(null);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [results, setResults] = useState<{ [key: string]: any }>({});
  const [previewAmount, setPreviewAmount] = useState(100);

  // Helper function to set loading state
  const setApiLoading = (api: string, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [api]: isLoading }));
  };

  // Helper function to set results
  const setApiResult = (api: string, result: any) => {
    setResults(prev => ({ ...prev, [api]: result }));
  };

  // 1. Get Wallet Balance - Current balance dekhna
  const testGetBalance = async () => {
    setApiLoading('balance', true);
    try {
      const response = await walletService.getBalance();
      setBalance(response.data);
      setApiResult('balance', response);
      console.log('✅ Get Balance API:', response);
    } catch (error: any) {
      console.error('❌ Get Balance API failed:', error);
      setApiResult('balance', { error: error?.message || 'Unknown error' });
    } finally {
      setApiLoading('balance', false);
    }
  };

  // 2. Get Wallet Overview - Detailed stats (total spent, refunds)
  const testGetOverview = async () => {
    setApiLoading('overview', true);
    try {
      const response = await walletService.getOverview();
      setOverview(response.data);
      setApiResult('overview', response);
      console.log('✅ Get Overview API:', response);
    } catch (error: any) {
      console.error('❌ Get Overview API failed:', error);
      setApiResult('overview', { error: error?.message || 'Unknown error' });
    } finally {
      setApiLoading('overview', false);
    }
  };

  // 3. Get Wallet Ledger - Transaction history (paginated)
  const testGetLedger = async () => {
    setApiLoading('ledger', true);
    try {
      const response = await walletService.getLedger({ page: 1, limit: 5 });
      setLedger(response.data);
      setApiResult('ledger', response);
      console.log('✅ Get Ledger API:', response);
    } catch (error: any) {
      console.error('❌ Get Ledger API failed:', error);
      setApiResult('ledger', { error: error?.message || 'Unknown error' });
    } finally {
      setApiLoading('ledger', false);
    }
  };

  // 4. Get Topup Config - Topup options aur limits
  const testGetTopupConfig = async () => {
    setApiLoading('topupConfig', true);
    try {
      const response = await walletService.getTopupConfig();
      setTopupConfig(response.data);
      setApiResult('topupConfig', response);
      console.log('✅ Get Topup Config API:', response);
    } catch (error: any) {
      console.error('❌ Get Topup Config API failed:', error);
      setApiResult('topupConfig', { error: error?.message || 'Unknown error' });
    } finally {
      setApiLoading('topupConfig', false);
    }
  };

  // 5. Preview Topup - Topup amount + fees calculate karna
  const testPreviewTopup = async () => {
    setApiLoading('previewTopup', true);
    try {
      const response = await walletService.previewTopup(previewAmount);
      setTopupPreview(response.data);
      setApiResult('previewTopup', response);
      console.log('✅ Preview Topup API:', response);
    } catch (error: any) {
      console.error('❌ Preview Topup API failed:', error);
      setApiResult('previewTopup', { error: error?.message || 'Unknown error' });
    } finally {
      setApiLoading('previewTopup', false);
    }
  };

  // 6. Add Funds - Wallet mein paise add karna
  const testAddFunds = async () => {
    setApiLoading('addFunds', true);
    try {
      const response = await walletService.addFunds(50, 'test_payment');
      setApiResult('addFunds', response);
      console.log('✅ Add Funds API:', response);
    } catch (error: any) {
      console.error('❌ Add Funds API failed:', error);
      setApiResult('addFunds', { error: error?.message || 'Unknown error' });
    } finally {
      setApiLoading('addFunds', false);
    }
  };

  // 7. Initiate Razorpay - Razorpay payment start karna
  const testInitiateRazorpay = async () => {
    setApiLoading('initiateRazorpay', true);
    try {
      const response = await walletService.initiateRazorpay(100);
      setApiResult('initiateRazorpay', response);
      console.log('✅ Initiate Razorpay API:', response);
    } catch (error: any) {
      console.error('❌ Initiate Razorpay API failed:', error);
      setApiResult('initiateRazorpay', { error: error?.message || 'Unknown error' });
    } finally {
      setApiLoading('initiateRazorpay', false);
    }
  };

  // 8. Verify Razorpay - Payment verify karke wallet credit karna
  const testVerifyRazorpay = async () => {
    setApiLoading('verifyRazorpay', true);
    try {
      const response = await walletService.verifyRazorpay(
        'order_test_123',
        'pay_test_456',
        'signature_test_789'
      );
      setApiResult('verifyRazorpay', response);
      console.log('✅ Verify Razorpay API:', response);
    } catch (error: any) {
      console.error('❌ Verify Razorpay API failed:', error);
      setApiResult('verifyRazorpay', { error: error?.message || 'Unknown error' });
    } finally {
      setApiLoading('verifyRazorpay', false);
    }
  };

  // 9. Transaction History - Pura transaction log
  const testTransactionHistory = async () => {
    setApiLoading('transactionHistory', true);
    try {
      const response = await walletService.getTransactionHistory({ 
        page: 1, 
        limit: 5,
        category: 'wallet_topup'
      });
      setApiResult('transactionHistory', response);
      console.log('✅ Transaction History API:', response);
    } catch (error: any) {
      console.error('❌ Transaction History API failed:', error);
      setApiResult('transactionHistory', { error: error?.message || 'Unknown error' });
    } finally {
      setApiLoading('transactionHistory', false);
    }
  };

  // Test all APIs
  const testAllAPIs = async () => {
    console.log('🚀 Testing all 9 Wallet & Finance APIs...');
    await Promise.all([
      testGetBalance(),
      testGetOverview(),
      testGetLedger(),
      testGetTopupConfig(),
      testPreviewTopup(),
      testTransactionHistory()
    ]);
    console.log('✅ All API tests completed!');
  };

  useEffect(() => {
    // Auto-test read APIs on component mount
    testAllAPIs();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Wallet & Finance APIs Demo</h1>
      <p className="text-gray-600 mb-8">
        Testing all 9 wallet & finance APIs integration. Check console for detailed logs.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* 1. Get Balance */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">1. Get Balance</h3>
          <button 
            onClick={testGetBalance}
            disabled={loading.balance}
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
          >
            {loading.balance ? 'Loading...' : 'Test API'}
          </button>
          {balance && (
            <div className="mt-2 text-sm">
              <p>Balance: ₹{balance.balance}</p>
              <p>Currency: {balance.currency}</p>
            </div>
          )}
        </div>

        {/* 2. Get Overview */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">2. Get Overview</h3>
          <button 
            onClick={testGetOverview}
            disabled={loading.overview}
            className="bg-green-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
          >
            {loading.overview ? 'Loading...' : 'Test API'}
          </button>
          {overview && (
            <div className="mt-2 text-sm">
              <p>Balance: ₹{overview.balance}</p>
              <p>Total Spent: ₹{overview.totalSpent}</p>
              <p>Total Refunds: ₹{overview.totalRefunds}</p>
            </div>
          )}
        </div>

        {/* 3. Get Ledger */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">3. Get Ledger</h3>
          <button 
            onClick={testGetLedger}
            disabled={loading.ledger}
            className="bg-purple-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
          >
            {loading.ledger ? 'Loading...' : 'Test API'}
          </button>
          {ledger && (
            <div className="mt-2 text-sm">
              <p>Entries: {ledger.entries.length}</p>
              <p>Page: {ledger.pagination.page}</p>
              <p>Total: {ledger.pagination.total}</p>
            </div>
          )}
        </div>

        {/* 4. Get Topup Config */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">4. Get Topup Config</h3>
          <button 
            onClick={testGetTopupConfig}
            disabled={loading.topupConfig}
            className="bg-orange-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
          >
            {loading.topupConfig ? 'Loading...' : 'Test API'}
          </button>
          {topupConfig && (
            <div className="mt-2 text-sm">
              <p>Min: ₹{topupConfig.minAmount}</p>
              <p>Max: ₹{topupConfig.maxAmount}</p>
              <p>Fee: {topupConfig.feePercentage}%</p>
            </div>
          )}
        </div>

        {/* 5. Preview Topup */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">5. Preview Topup</h3>
          <input 
            type="number" 
            value={previewAmount}
            onChange={(e) => setPreviewAmount(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm mb-2 w-full"
            placeholder="Amount"
          />
          <button 
            onClick={testPreviewTopup}
            disabled={loading.previewTopup}
            className="bg-indigo-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
          >
            {loading.previewTopup ? 'Loading...' : 'Preview'}
          </button>
          {topupPreview && (
            <div className="mt-2 text-sm">
              <p>Amount: ₹{topupPreview.amount}</p>
              <p>Fee: ₹{topupPreview.processingFee}</p>
              <p>Total: ₹{topupPreview.total}</p>
            </div>
          )}
        </div>

        {/* 6. Add Funds */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">6. Add Funds</h3>
          <button 
            onClick={testAddFunds}
            disabled={loading.addFunds}
            className="bg-red-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
          >
            {loading.addFunds ? 'Loading...' : 'Add ₹50'}
          </button>
          <p className="text-xs text-gray-500 mt-1">Test mode only</p>
        </div>

        {/* 7. Initiate Razorpay */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">7. Initiate Razorpay</h3>
          <button 
            onClick={testInitiateRazorpay}
            disabled={loading.initiateRazorpay}
            className="bg-yellow-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
          >
            {loading.initiateRazorpay ? 'Loading...' : 'Initiate ₹100'}
          </button>
          <p className="text-xs text-gray-500 mt-1">Creates payment order</p>
        </div>

        {/* 8. Verify Razorpay */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">8. Verify Razorpay</h3>
          <button 
            onClick={testVerifyRazorpay}
            disabled={loading.verifyRazorpay}
            className="bg-pink-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
          >
            {loading.verifyRazorpay ? 'Loading...' : 'Verify Payment'}
          </button>
          <p className="text-xs text-gray-500 mt-1">Test verification</p>
        </div>

        {/* 9. Transaction History */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">9. Transaction History</h3>
          <button 
            onClick={testTransactionHistory}
            disabled={loading.transactionHistory}
            className="bg-teal-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
          >
            {loading.transactionHistory ? 'Loading...' : 'Get History'}
          </button>
          <p className="text-xs text-gray-500 mt-1">Filtered by type</p>
        </div>
      </div>

      {/* Test All Button */}
      <div className="mt-8 text-center">
        <button 
          onClick={testAllAPIs}
          className="bg-gray-800 text-white px-6 py-2 rounded-lg font-semibold"
        >
          Test All APIs
        </button>
      </div>

      {/* Results Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">API Results</h2>
        <div className="bg-gray-100 rounded-lg p-4 max-h-96 overflow-y-auto">
          <pre className="text-sm">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default WalletAPIDemo;