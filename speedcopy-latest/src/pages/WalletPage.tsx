import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import walletService from '../services/wallet.service';
import type { LedgerEntry } from '../services/wallet.service';
import { useAuth } from '../context/AuthContext';

interface Transaction extends LedgerEntry {
  status?: string;
}

const WalletPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWalletData = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      // GET /api/wallet/overview returns wallet + recent_entries together
      const overviewRes = await walletService.getOverview();
      const overview = overviewRes.data;

      console.log('💰 Wallet overview:', overview);

      // Balance from wallet object
      const wallet = overview?.wallet;
      setBalance(Number(wallet?.balance) || 0);

      // Transactions from recent_entries (overview) or ledger
      const recentEntries: Transaction[] = overview?.recent_entries || [];

      if (recentEntries.length > 0) {
        setTransactions(recentEntries);
      } else {
        // Fetch full ledger separately
        const ledgerRes = await walletService.getLedger({ page: 1, limit: 20 });
        setTransactions(ledgerRes.data.entries as Transaction[]);
      }

    } catch (err: any) {
      console.error('Wallet fetch failed:', err);
      if (err.response?.status === 401) {
        setError('auth_expired');
      } else {
        setBalance(0);
        setTransactions([]);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWalletData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, location, fetchWalletData]);

  // Also refetch when tab becomes visible again (e.g., after payment)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        fetchWalletData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isAuthenticated, fetchWalletData]);

  const handleLoginAgain = () => {
    // Clear session
    localStorage.clear();
    // Reload page to trigger login modal
    window.location.reload();
  };

  const getTransactionIcon = (type: string) => {
    const typeLower = type.toLowerCase();
    if (typeLower.includes('credit') || typeLower.includes('deposit')) {
      return {
        icon: 'plus',
        bg: '#dcfce7',
        color: '#16a34a'
      };
    }
    return {
      icon: 'minus',
      bg: '#fee2e2',
      color: '#ef4444'
    };
  };
  return (
    <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Page Title */}
        <div className="mb-6 px-1">
          <h1 className="font-bold text-gray-900 mb-1" style={{ fontSize: '28px' }}>My Wallet</h1>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>
            Manage your balance, top up instantly, and track your print expenses.
          </p>
        </div>

        {/* Balance Card */}
        <div
          className="relative rounded-3xl p-8 mb-6 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #93c5fd 0%, #bfdbfe 50%, #dbeafe 100%)',
            minHeight: '160px',
          }}
        >
          {/* Watermark wallet icon */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-20">
            <svg style={{ width: '120px', height: '120px', color: '#1d4ed8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>

          <div className="relative z-10">
            <p className="font-bold tracking-widest mb-2" style={{ fontSize: '11px', color: '#1e40af', letterSpacing: '0.15em' }}>
              CURRENT BALANCE
            </p>
            {loading ? (
              <div className="h-12 w-48 bg-white/30 rounded-lg animate-pulse mb-6" />
            ) : (
              <p className="font-bold text-gray-900 mb-6" style={{ fontSize: '42px', lineHeight: 1 }}>
                ₹{balance.toFixed(2)}
              </p>
            )}
            <button
              onClick={() => navigate('/add-funds')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 text-white font-bold rounded-full hover:bg-gray-700 transition"
              style={{ backgroundColor: '#111111', fontSize: '14px' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Add Money
            </button>
          </div>
        </div>

        {/* Recent Transactions */}
        <div>
          {/* Section header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 px-1 gap-3">
            <h2 className="font-bold text-gray-900" style={{ fontSize: '20px' }}>Recent Transactions</h2>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-1.5 text-sm font-medium hover:text-gray-900 transition" style={{ color: '#6b7280' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="hidden sm:inline">Filter</span>
              </button>
              <button className="flex items-center gap-1.5 text-sm font-medium hover:text-gray-900 transition" style={{ color: '#6b7280' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>

          {/* Desktop Table - hidden on mobile/tablet */}
          <div className="hidden xl:block bg-white rounded-3xl overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            {/* Table Header */}
            <div
              className="grid px-6 py-4"
              style={{
                gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr',
                borderBottom: '1px solid #f3f4f6',
              }}
            >
              {['TRANSACTION TYPE', 'DATE', 'REFERENCE ID', 'AMOUNT', 'STATUS'].map((h, i) => (
                <p
                  key={h}
                  className={`text-xs font-bold tracking-widest ${i >= 3 ? 'text-right' : ''}`}
                  style={{ color: '#9ca3af' }}
                >
                  {h}
                </p>
              ))}
            </div>

            {/* Rows */}
            {!isAuthenticated ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">Please login to view transactions</p>
              </div>
            ) : loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="grid items-center px-6 py-4 animate-pulse" style={{ gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr', borderBottom: '1px solid #f9fafb' }}>
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-1/3 ml-auto" />
                  <div className="h-4 bg-gray-200 rounded w-1/2 ml-auto" />
                </div>
              ))
            ) : error ? (
              <div className="text-center py-12">
                {error === 'auth_expired' ? (
                  <>
                    <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <p className="text-red-600 font-semibold mb-2">Session Expired</p>
                    <p className="text-gray-600 text-sm mb-4">Please log in again to continue</p>
                    <button 
                      onClick={handleLoginAgain} 
                      className="px-6 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-700 font-semibold"
                    >
                      Login Again
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-red-600 mb-4">{error}</p>
                    <button onClick={fetchWalletData} className="px-6 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-700">
                      Retry
                    </button>
                  </>
                )}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No transactions yet</p>
              </div>
            ) : (
              transactions.map((tx, idx) => {
                const iconData = getTransactionIcon(tx.type);
                const isCredit = tx.amount > 0;
                
                return (
                  <div
                    key={tx._id}
                    className="grid items-center px-6 py-4 hover:bg-gray-50 transition"
                    style={{
                      gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr',
                      borderBottom: idx < transactions.length - 1 ? '1px solid #f9fafb' : 'none',
                    }}
                  >
                    {/* Type */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: iconData.bg }}
                      >
                        {iconData.icon === 'plus' ? (
                          <svg className="w-4 h-4" style={{ color: iconData.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" style={{ color: iconData.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 capitalize" style={{ fontSize: '14px' }}>{tx.type}</p>
                        <p style={{ fontSize: '12px', color: '#9ca3af' }}>{tx.description}</p>
                      </div>
                    </div>

                    {/* Date */}
                    <p style={{ fontSize: '13px', color: '#6b7280' }}>
                      {new Date(tx.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>

                    {/* Ref ID */}
                    <div className="flex justify-start">
                      <span
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                        style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}
                      >
                        {tx.referenceId}
                      </span>
                    </div>

                    {/* Amount */}
                    <p className="text-right font-bold" style={{ fontSize: '14px', color: isCredit ? '#16a34a' : '#ef4444' }}>
                      {isCredit ? '+' : '-'}₹{Math.abs(tx.amount).toFixed(2)}
                    </p>

                    {/* Status */}
                    <div className="flex justify-end">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold capitalize"
                        style={{ 
                          backgroundColor: tx.status === 'completed' ? '#dcfce7' : '#fef3c7', 
                          color: tx.status === 'completed' ? '#16a34a' : '#f59e0b' 
                        }}
                      >
                        {tx.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}

            {/* Pagination */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderTop: '1px solid #f3f4f6' }}
            >
              <p style={{ fontSize: '13px', color: '#6b7280' }}>
                Showing <strong className="text-gray-900">1</strong> to{' '}
                <strong className="text-gray-900">4</strong> of{' '}
                <strong className="text-gray-900">12</strong> results
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="px-4 py-2 rounded-xl text-sm font-medium transition"
                  style={{ color: '#9ca3af', cursor: 'not-allowed' }}
                  disabled
                >
                  Previous
                </button>
                <button
                  className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-100 transition"
                  style={{ color: '#374151', border: '1px solid #e5e7eb' }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Mobile/Tablet Cards */}
          <div className="xl:hidden space-y-3">
            {!isAuthenticated ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">Please login to view transactions</p>
              </div>
            ) : loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 animate-pulse" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-gray-200" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-5 bg-gray-200 rounded w-16" />
                  </div>
                </div>
              ))
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-600 mb-4">{error}</p>
                <button onClick={fetchWalletData} className="px-6 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-700">
                  Retry
                </button>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No transactions yet</p>
              </div>
            ) : (
              transactions.map((tx) => {
                const iconData = getTransactionIcon(tx.type);
                const isCredit = tx.amount > 0;
                
                return (
                  <div
                    key={tx._id}
                    className="bg-white rounded-2xl p-4"
                    style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}
                  >
                    {/* Header with icon and amount */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: iconData.bg }}
                        >
                          {iconData.icon === 'plus' ? (
                            <svg className="w-5 h-5" style={{ color: iconData.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" style={{ color: iconData.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 capitalize" style={{ fontSize: '15px' }}>{tx.type}</p>
                          <p style={{ fontSize: '13px', color: '#9ca3af' }}>{tx.description}</p>
                        </div>
                      </div>
                      <p className="font-bold" style={{ fontSize: '16px', color: isCredit ? '#16a34a' : '#ef4444' }}>
                        {isCredit ? '+' : '-'}₹{Math.abs(tx.amount).toFixed(2)}
                      </p>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500">DATE</span>
                        <span className="text-xs text-gray-700">
                          {new Date(tx.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500">REFERENCE ID</span>
                        <span
                          className="px-2 py-0.5 rounded-lg text-xs font-semibold"
                          style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}
                        >
                          {tx.referenceId}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500">STATUS</span>
                        <span
                          className="px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
                          style={{ 
                            backgroundColor: tx.status === 'completed' ? '#dcfce7' : '#fef3c7', 
                            color: tx.status === 'completed' ? '#16a34a' : '#f59e0b' 
                          }}
                        >
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Mobile Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
              <p className="text-xs text-gray-600">
                Showing <strong>1-4</strong> of <strong>12</strong>
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="px-4 py-2 rounded-xl text-sm font-medium transition"
                  style={{ color: '#9ca3af', cursor: 'not-allowed', border: '1px solid #e5e7eb' }}
                  disabled
                >
                  Previous
                </button>
                <button
                  className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-100 transition"
                  style={{ color: '#374151', border: '1px solid #e5e7eb' }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WalletPage;




