import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BackButton from '../components/BackButton';
import orderService from '../services/order.service';

const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    } else {
      setLoading(false);
    }
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchOrder = async () => {
    try {
      setLoading(true);
      if (orderId) {
        const response = await orderService.getOrderById(orderId);
        setOrder(response.data || response);
      }
    } catch (err) {
      console.error('Failed to fetch order:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate delivery date (add 3-5 days)
  const getDeliveryDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 4);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex justify-center">
          <div className="bg-white rounded-3xl p-8 w-full" style={{ maxWidth: '520px' }}>
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Loading order details...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const orderNumber = order?.id || order?._id || 'SC' + Math.random().toString(36).substr(2, 9).toUpperCase();
  const deliveryAddress = order?.shippingAddress || {};
  const addressLine = `${deliveryAddress.line1 || ''}, ${deliveryAddress.city || 'City'}, ${deliveryAddress.state || 'State'} ${deliveryAddress.pincode || ''}`;
  const totalAmount = order?.total || 0;
  const discount = order?.discount || 0;
  const originalAmount = totalAmount + discount;

  return (
    <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <Navbar />
      <BackButton label="Back" className="mb-6" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex justify-center">
        <div className="bg-white rounded-3xl p-8 w-full" style={{ maxWidth: '520px', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>

          {/* Success icon */}
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#16a34a', boxShadow: '0 0 0 12px #dcfce7' }}>
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="font-bold text-gray-900 mb-2" style={{ fontSize: '26px' }}>Payment Successful!</h1>
            <p className="text-sm" style={{ color: '#9ca3af' }}>
              Order <span className="font-bold" style={{ color: '#374151' }}>#{orderNumber}</span> confirmed
            </p>
          </div>

          {/* Savings banner */}
          {discount > 0 && (
            <div className="rounded-2xl p-4 mb-5 flex items-start gap-3" style={{ backgroundColor: '#f0fdf4', border: '1.5px dashed #86efac' }}>
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs font-bold tracking-widest mb-1" style={{ color: '#16a34a' }}>YOU SAVED</p>
                <p className="text-sm" style={{ color: '#374151' }}>
                  <span className="font-bold" style={{ color: '#16a34a' }}>₹{discount.toFixed(2)}</span> on this order
                </p>
              </div>
            </div>
          )}

          {/* Order details card */}
          <div className="rounded-2xl p-5 mb-6" style={{ border: '1px solid #e5e7eb' }}>
            <div className="mb-4 pb-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
              <p className="text-xs font-bold tracking-widest mb-1.5" style={{ color: '#9ca3af' }}>ESTIMATED DELIVERY</p>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" style={{ color: '#6b7280' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-semibold text-gray-800">{getDeliveryDate()}</span>
              </div>
            </div>

            <div className="mb-4 pb-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
              <p className="text-xs font-bold tracking-widest mb-1.5" style={{ color: '#9ca3af' }}>DELIVERY ADDRESS</p>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#6b7280' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm text-gray-800">{addressLine || 'Address not available'}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold tracking-widest mb-2" style={{ color: '#9ca3af' }}>TOTAL PAID</p>
              <div className="flex items-center gap-3">
                <span className="font-bold text-gray-900" style={{ fontSize: '24px' }}>₹{totalAmount.toFixed(2)}</span>
                {discount > 0 && (
                  <>
                    <span className="line-through text-sm" style={{ color: '#9ca3af' }}>₹{originalAmount.toFixed(2)}</span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                      SAVED ₹{discount.toFixed(2)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-3 mb-5">
            <button
              onClick={() => navigate('/orders')}
              className="w-full flex items-center justify-center gap-2 py-3.5 text-white font-bold rounded-full hover:bg-gray-700 transition text-sm"
              style={{ backgroundColor: '#111111' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              Track Order
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-2 py-3.5 font-bold rounded-full hover:bg-gray-100 transition text-sm"
              style={{ backgroundColor: '#f3f4f6', color: '#374151' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Back to Home
            </button>
          </div>

          <p className="text-center text-xs" style={{ color: '#9ca3af' }}>
            Need help?{' '}
            <button className="font-semibold hover:opacity-70 transition" style={{ color: '#374151' }}>Contact Support</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
