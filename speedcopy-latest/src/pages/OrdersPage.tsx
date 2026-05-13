import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import orderService, { type Order } from '../services/order.service';
import { useAuth } from '../context/AuthContext';

type TabType = 'All Orders' | 'Processing' | 'Delivered' | 'Cancelled';

const tabs: { label: TabType; count?: number }[] = [
  { label: 'All Orders' },
  { label: 'Processing', count: 0 },
  { label: 'Delivered' },
  { label: 'Cancelled' },
];

const StatusIcon: React.FC<{ status: string; color: string }> = ({ status, color }) => {
  const s = status.toLowerCase();
  if (['pending', 'confirmed', 'assigned_vendor', 'vendor_accepted', 'in_production', 'qc_pending', 'ready_for_pickup', 'delivery_assigned', 'out_for_delivery'].includes(s)) return (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" style={{ color }}>
      <circle cx="12" cy="12" r="5" />
    </svg>
  );
  if (s === 'delivered') return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color }}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color }}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
};

const OrdersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('All Orders');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleLoginAgain = () => {
    // Clear session
    localStorage.clear();
    // Reload page to trigger login modal
    window.location.reload();
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      
      // Set up auto-refresh every 60 seconds
      const interval = setInterval(() => {
        fetchOrders();
      }, 60000);
      
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchOrders = async () => {
    try {
      // Map tab labels to backend status values
      const statusMap: Record<string, string | undefined> = {
        'All Orders': undefined,
        'Processing': 'pending',
        'Delivered': 'delivered',
        'Cancelled': 'cancelled',
      };

      const response = await orderService.getMyOrders({
        page: 1,
        limit: 20,
        status: statusMap[activeTab],
      });
      
      const ordersData = response.data?.orders || response.data || [];
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch orders:', err);
      
      // Check if it's an authentication error
      if (err.response?.status === 401) {
        setError('auth_expired');
        setOrders([]);
        setLoading(false);
        return;
      }
      
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (['pending', 'confirmed', 'assigned_vendor', 'vendor_accepted', 'in_production', 'qc_pending', 'ready_for_pickup', 'delivery_assigned', 'out_for_delivery'].includes(s)) {
      return { color: '#f97316', bg: '#fff7ed' };
    }
    if (s === 'delivered') return { color: '#16a34a', bg: '#dcfce7' };
    if (s === 'cancelled' || s === 'refunded') return { color: '#ef4444', bg: '#fef2f2' };
    return { color: '#9ca3af', bg: '#f3f4f6' };
  };

  const handleReorder = async (orderId: string) => {
    try {
      console.log('🔄 Reordering order:', orderId);
      
      // Show loading state
      const confirmed = window.confirm('Do you want to reorder this order? A new order will be created with the same items.');
      if (!confirmed) return;

      // Call reorder API
      const response = await orderService.reorder(orderId);
      
      console.log('✅ Reorder successful:', response.data);
      
      // Show success message
      alert(`Reorder successful! New order number: ${response.data.orderNumber || response.data._id}`);
      
      // Refresh orders list
      await fetchOrders();
      
      // Navigate to the new order detail page
      navigate(`/order-detail/${response.data._id}`);
    } catch (error: any) {
      console.error('❌ Reorder failed:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to reorder. Please try again.';
      alert(`Reorder failed: ${errorMessage}`);
    }
  };

  const filtered = orders.filter(o => {
    const matchSearch = o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.items.some(item => item.productName?.toLowerCase().includes(search.toLowerCase()));
    return matchSearch;
  });

  return (
    <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start justify-between mb-6 px-1 gap-4">
          <div>
            <h1 className="font-bold text-gray-900 mb-1" style={{ fontSize: '28px' }}>My Orders</h1>
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>Track past shipments and easily reorder your favorites.</p>
          </div>
          {/* Search + Filter */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-full flex-1 sm:flex-initial" style={{ border: '1px solid #e5e7eb', minWidth: '200px' }}>
              <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#9ca3af' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search orders..."
                className="flex-1 text-sm focus:outline-none bg-transparent"
                style={{ color: '#374151' }}
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-full text-sm font-medium hover:bg-gray-50 transition flex-shrink-0" style={{ border: '1px solid #e5e7eb', color: '#374151' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="hidden sm:inline">Filter</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 px-1 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.label)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition whitespace-nowrap"
              style={{
                backgroundColor: activeTab === tab.label ? '#111111' : '#ffffff',
                color: activeTab === tab.label ? '#ffffff' : '#374151',
                border: activeTab === tab.label ? 'none' : '1px solid #e5e7eb',
              }}
            >
              {tab.label}
              {tab.count && (
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: activeTab === tab.label ? 'rgba(255,255,255,0.25)' : '#f3f4f6',
                    color: activeTab === tab.label ? '#fff' : '#374151',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {error === 'auth_expired' ? (
            <div className="col-span-full text-center py-12">
              <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-red-600 font-semibold mb-2">Session Expired</p>
              <p className="text-gray-600 text-sm mb-4">Please log in again to continue</p>
              <button 
                onClick={handleLoginAgain} 
                className="px-6 py-3 bg-black text-white rounded-full font-bold hover:bg-gray-800"
              >
                Login Again
              </button>
            </div>
          ) : error ? (
            <div className="col-span-full p-3 rounded-xl text-sm" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}>
              {error}
            </div>
          ) : null}
          {!isAuthenticated ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-600 mb-4">Please login to view your orders</p>
              <button onClick={() => navigate('/')} className="px-6 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-700">
                Go to Home
              </button>
            </div>
          ) : loading ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden flex flex-col sm:flex-row animate-pulse" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}>
                <div className="flex-shrink-0 w-full sm:w-[130px] h-[180px] sm:h-[160px] bg-gray-200" />
                <div className="flex-1 p-4">
                  <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-full mb-4" />
                  <div className="h-8 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 mb-4">No orders found</p>
              <button onClick={() => navigate('/shopping')} className="px-6 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-700">
                Start Shopping
              </button>
            </div>
          ) : (
            filtered.map(order => {
              const statusColors = getStatusColor(order.status);
              const firstItem = order.items[0];
              const itemCount = order.items.length;
              
              return (
                <div
                  key={order._id}
                  className="bg-white rounded-2xl overflow-hidden flex flex-col sm:flex-row"
                  style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}
                >
                  {/* Image */}
                  <div className="flex-shrink-0 w-full sm:w-[130px] h-[180px] sm:h-[160px] bg-gray-100 flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                      {/* Order ID + Status */}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold text-gray-500" style={{ fontSize: '11px' }}>ORDER #{order.orderNumber}</p>
                          <p style={{ fontSize: '11px', color: '#9ca3af' }}>
                            {new Date(order.createdAt).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                        <span
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap capitalize"
                          style={{ backgroundColor: statusColors.bg, color: statusColors.color }}
                        >
                          <StatusIcon status={order.status} color={statusColors.color} />
                          {order.status}
                        </span>
                      </div>

                      <h3 className="font-bold text-gray-900 mt-2 mb-1 leading-snug" style={{ fontSize: '15px' }}>
                        {firstItem.productName || 'Print Order'}
                        {itemCount > 1 && ` +${itemCount - 1} more`}
                      </h3>
                      <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                        {itemCount} item{itemCount > 1 ? 's' : ''} • Qty: {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                      </p>
                    </div>

                    {/* Price + Actions */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-3 gap-3">
                      <div>
                        <p className="font-bold text-gray-900" style={{ fontSize: '18px' }}>₹{(order.total ?? 0).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {/* Track Order button */}
                        <button
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 font-bold rounded-full hover:bg-gray-100 transition border"
                          style={{ fontSize: '13px', color: '#374151', borderColor: '#e5e7eb' }}
                          onClick={() => navigate(`/order-detail/${order._id}`)}
                        >
                          <svg className="w-3.5 h-3.5" style={{ color: '#9ca3af' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                          </svg>
                          Track
                        </button>
                        {/* Reorder button */}
                        <button
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-white font-bold rounded-full hover:bg-gray-700 transition"
                          style={{ backgroundColor: '#111111', fontSize: '13px' }}
                          onClick={() => handleReorder(order._id)}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span className="hidden xs:inline">Reorder</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};

export default OrdersPage;
