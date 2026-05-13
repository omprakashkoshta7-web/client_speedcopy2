import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api.service';
import orderService from '../services/order.service';
import { API_CONFIG } from '../config/api.config';

interface WishlistItem {
  productId: string;
  productType: string;
  addedAt: string;
  // populated product fields
  name?: string;
  tag?: string;
  desc?: string;
  image?: string;
  price?: number;
  oldPrice?: string | null;
  qty: number;
}

const WishlistPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchWishlist();
  }, [isAuthenticated]);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.WISHLIST.GET);
      const wishlistData: Array<{ productId: string; productType: string; addedAt: string }> =
        response.data?.data || [];

      if (wishlistData.length === 0) {
        setItems([]);
        return;
      }
      // Fetch product details for each wishlist item
      const productPromises = wishlistData.map(async (w) => {
        try {
          const prodRes = await apiClient.get(`/api/products/${w.productId}`);
          const p = prodRes.data?.data || prodRes.data?.product || prodRes.data || {};
          return {
            productId: w.productId,
            productType: w.productType,
            addedAt: w.addedAt,
            name: p.name || 'Product',
            tag: p.category?.name || w.productType || 'Product',
            desc: p.description || '',
            image: p.thumbnail || p.images?.[0] || '',
            price: p.sale_price || p.basePrice || p.price || 0,
            oldPrice: p.mrp > (p.sale_price || p.basePrice || 0) ? `₹${p.mrp}` : null,
            qty: 1,
          };
        } catch {
          return {
            productId: w.productId,
            productType: w.productType,
            addedAt: w.addedAt,
            name: 'Product',
            tag: w.productType,
            desc: '',
            image: '',
            price: 0,
            oldPrice: null,
            qty: 1,
          };
        }
      });

      const populated = await Promise.all(productPromises);
      setItems(populated);
    } catch (err: any) {
      console.error('Failed to fetch wishlist:', err);
      console.error('Error details:', {
        status: err.response?.status,
        message: err.response?.data?.message,
        data: err.response?.data
      });
      
      // Check if it's an authentication error
      if (err.response?.status === 401) {
        setError('auth_expired');
        setItems([]);
        setLoading(false);
        return;
      }
      
      // Handle 400 Bad Request - endpoint might not exist or have issues
      if (err.response?.status === 400) {
        console.warn('Wishlist endpoint returned 400, showing empty wishlist');
        setItems([]);
        setLoading(false);
        return;
      }
      
      // If backend unavailable or 404, show empty wishlist instead of error
      const status = err.response?.status;
      if (!status || status === 404 || status >= 500) {
        console.warn('Wishlist endpoint unavailable, showing empty wishlist');
        setItems([]);
      } else {
        setError(err.response?.data?.message || 'Failed to load wishlist');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoginAgain = () => {
    // Clear session
    localStorage.clear();
    // Reload page to trigger login modal
    window.location.reload();
  };

  const updateQty = (productId: string, delta: number) => {
    setItems(prev =>
      prev.map(i => i.productId === productId ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
    );
  };

  const removeItem = async (productId: string) => {
    try {
      setRemovingId(productId);
      await apiClient.delete(API_CONFIG.ENDPOINTS.WISHLIST.REMOVE(productId));
      setItems(prev => prev.filter(i => i.productId !== productId));
    } catch (err) {
      console.error('Failed to remove from wishlist:', err);
    } finally {
      setRemovingId(null);
    }
  };

  const addToCart = async (productId: string, qty: number) => {
    try {
      await orderService.addToCart({ productId, quantity: qty });
      navigate('/cart');
    } catch (err) {
      console.error('Failed to add to cart:', err);
    }
  };

  const moveAllToCart = async () => {
    for (const item of items) {
      await addToCart(item.productId, item.qty).catch(() => {});
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Login</h1>
          <p className="text-gray-600 mb-6">You need to be logged in to view your wishlist</p>
          <button onClick={() => navigate('/')} className="px-6 py-3 bg-black text-white rounded-full font-bold hover:bg-gray-800">
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 h-32 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
          {error === 'auth_expired' ? (
            <>
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
            </>
          ) : (
            <>
              <p className="text-red-600 mb-4">{error}</p>
              <button onClick={fetchWishlist} className="px-6 py-3 bg-black text-white rounded-full font-bold hover:bg-gray-800">
                Retry
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Your Wishlist is Empty</h1>
          <p className="text-gray-600 mb-6">Add products you love to your wishlist</p>
          <button onClick={() => navigate('/shopping')} className="px-6 py-3 bg-black text-white rounded-full font-bold hover:bg-gray-800">
            Start Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* Header */}
        <div className="mb-5">
          <h1 className="font-bold text-gray-900 mb-1" style={{ fontSize: '24px' }}>Wishlist</h1>
          <p className="text-sm" style={{ color: '#9ca3af' }}>You have {items.length} items in your Wishlist</p>
        </div>

        {/* Items */}
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.productId}
              className="bg-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 relative"
              style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}>
              {/* Image */}
              <div className="w-full sm:w-24 h-32 sm:h-24 rounded-xl overflow-hidden flex-shrink-0" style={{ backgroundColor: '#f3f4f6' }}>
                {item.image
                  ? <img src={item.image} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No Image</div>
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 w-full">
                <p className="text-xs font-bold tracking-widest mb-0.5 uppercase" style={{ color: '#9ca3af' }}>{item.tag}</p>
                <p className="font-bold text-gray-900 mb-0.5" style={{ fontSize: '15px' }}>{item.name}</p>
                <p className="text-xs mb-3" style={{ color: '#9ca3af' }}>{item.desc}</p>

                {/* Quantity controls + Price on mobile */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.productId, -1)}
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100 transition"
                      style={{ border: '1.5px solid #e5e7eb' }}>−</button>
                    <span className="font-bold text-gray-900 text-sm w-6 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.productId, 1)}
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100 transition"
                      style={{ border: '1.5px solid #e5e7eb' }}>+</button>
                  </div>

                  {/* Price on mobile */}
                  <div className="flex sm:hidden flex-col items-end gap-1">
                    {item.oldPrice && <p className="line-through text-xs" style={{ color: '#9ca3af' }}>{item.oldPrice}</p>}
                    <p className="font-bold text-gray-900" style={{ fontSize: '16px' }}>₹{((item.price || 0) * item.qty).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Price + Delete - desktop */}
              <div className="hidden sm:flex flex-col items-end gap-2 flex-shrink-0">
                <button
                  onClick={() => removeItem(item.productId)}
                  disabled={removingId === item.productId}
                  className="hover:opacity-60 transition disabled:opacity-30">
                  <svg className="w-4 h-4" style={{ color: '#9ca3af' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                {item.oldPrice && <p className="line-through text-xs" style={{ color: '#9ca3af' }}>{item.oldPrice}</p>}
                <p className="font-bold text-gray-900" style={{ fontSize: '16px' }}>₹{((item.price || 0) * item.qty).toFixed(2)}</p>
              </div>

              {/* Delete - mobile */}
              <button
                onClick={() => removeItem(item.productId)}
                disabled={removingId === item.productId}
                className="sm:hidden absolute top-4 right-4 hover:opacity-60 transition disabled:opacity-30">
                <svg className="w-4 h-4" style={{ color: '#9ca3af' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Move to Cart */}
        <div className="mt-6 flex justify-center sm:justify-end">
          <button
            onClick={moveAllToCart}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 text-white font-bold rounded-full hover:bg-gray-700 transition text-sm"
            style={{ backgroundColor: '#111111' }}>
            Move All to Cart
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WishlistPage;
