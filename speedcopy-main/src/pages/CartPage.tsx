import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import orderService from '../services/order.service';
import productService from '../services/product.service';
import printingService from '../services/printing.service';
import fileStorageService from '../services/fileStorage.service';
import cartService, { type AvailableCoupon, type CouponResponse } from '../services/cart.service';

type CartUiItem = {
  id: string;
  name: string;
  image?: string;
  designPreview?: string;
  designName?: string;
  qty: number;
  price: number;
  oldPrice?: number;
  desc: string;
  tag: string;
  flowType: string;
};

const CART_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&q=80';

const isRenderableImageSource = (value?: string) => {
  if (!value) return false;
  if (value.startsWith('data:image/')) return true;
  if (value.startsWith('blob:')) return true;
  if (!/^https?:\/\//i.test(value)) return false;

  try {
    const pathname = new URL(value).pathname.toLowerCase();
    return /\.(apng|avif|gif|jpe?g|png|svg|webp)$/i.test(pathname);
  } catch {
    return false;
  }
};

const getFileImageCandidates = (file: any) => [
  file?.previewImage,
  file?.thumbnailUrl,
  file?.data,
  file?.firstPageImage,
  file?.url,
];

const normalizeFileKey = (value?: string) => String(value || '').trim().toLowerCase();

const findStoredFileMatch = (storedFiles: any[], configFile: any) => {
  const configKeys = [
    configFile?.publicId,
    configFile?.url,
    configFile?.originalName,
    configFile?.name,
  ]
    .map(normalizeFileKey)
    .filter(Boolean);

  return storedFiles.find((storedFile) => {
    const storedKeys = [
      storedFile?.id,
      storedFile?.publicId,
      storedFile?.url,
      storedFile?.originalName,
      storedFile?.name,
    ]
      .map(normalizeFileKey)
      .filter(Boolean);

    return configKeys.some((configKey) => storedKeys.includes(configKey));
  });
};

const CartItemImage: React.FC<{ item: CartUiItem }> = ({ item }) => {
  const [hasError, setHasError] = useState(false);
  const showImage = !hasError && isRenderableImageSource(item.image);

  if (showImage) {
    return (
      <img
        src={item.image}
        alt={item.name}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    );
  }

  if (item.flowType === 'printing') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-500 px-2 text-center">
        <svg className="w-7 h-7 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-[10px] font-bold leading-tight line-clamp-2">{item.name}</span>
      </div>
    );
  }

  return (
    <img
      src={CART_FALLBACK_IMAGE}
      alt={item.name}
      loading="lazy"
      decoding="async"
      className="w-full h-full object-cover"
    />
  );
};

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const flowFilter = searchParams.get('flow') || '';
  const isGiftingFlow = flowFilter === 'gifting';
  const [items, setItems] = useState<CartUiItem[]>([]);
  const [suggested, setSuggested] = useState<any[]>([]);
  const [coupon, setCoupon] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponResponse | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
  const [showCouponList, setShowCouponList] = useState(false);
  const [showCouponReminder, setShowCouponReminder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void fetchCartData();
  }, [isAuthenticated, flowFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCartData = async () => {
    try {
      setLoading(true);
      setError('');
      const [cartResponse, suggestedResponse] = await Promise.all([
        orderService.getCart(),
        isGiftingFlow
          ? productService.getProductsByFlowType('gifting', { limit: 4 })
          : productService.getProductsByFlowType('shopping', { limit: 4 }),
      ]);

      const apiItems = cartResponse?.data?.items || cartResponse?.items || [];
      const localCart = JSON.parse(localStorage.getItem('speedcopy_cart') || '{"items":[]}');
      const localItems = Array.isArray(localCart)
        ? localCart
        : Array.isArray(localCart?.items)
          ? localCart.items
          : [];
      const existingIds = new Set(apiItems.map((item: any) => String(item._id || item.item_id || item.id || '')));
      const rawItems = [
        ...apiItems,
        ...localItems.filter((item: any) => !existingIds.has(String(item._id || item.item_id || item.id || ''))),
      ];
      const filteredItems = flowFilter
        ? rawItems.filter((item: any) => item.flowType === flowFilter)
        : rawItems;
      const storedFiles = await fileStorageService.getAllFiles();

      const resolveLocalFileImage = async (value?: string) => {
        if (!value?.startsWith('local://')) return value || '';

        const fileId = value.replace('local://', '');
        const storedFile =
          await fileStorageService.getFile(fileId) ||
          findStoredFileMatch(storedFiles, { publicId: fileId, url: value });

        return getFileImageCandidates(storedFile).find(isRenderableImageSource) || '';
      };

      const getDesignJson = (item: any) => {
        if (!item?.designJson) return {};
        if (typeof item.designJson === 'string') {
          try {
            return JSON.parse(item.designJson);
          } catch {
            return {};
          }
        }
        return item.designJson;
      };

      // Helper to retrieve preview from IndexedDB
      const getPreviewFromIndexedDB = async (customizationId: string): Promise<string | null> => {
        try {
          return new Promise((resolve, reject) => {
            const request = indexedDB.open('speedcopy_db', 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const db = request.result;
              if (!db.objectStoreNames.contains('preview_cache')) {
                resolve(null);
                return;
              }
              const tx = db.transaction('preview_cache', 'readonly');
              const store = tx.objectStore('preview_cache');
              const getReq = store.get(customizationId);
              getReq.onerror = () => reject(getReq.error);
              getReq.onsuccess = () => resolve(getReq.result?.preview || null);
            };
          });
        } catch (err) {
          console.warn('Failed to retrieve preview from IndexedDB:', err);
          return null;
        }
      };

      const resolveCartImage = async (item: any) => {
        const designJson = getDesignJson(item);
        const customizationId =
          item.customization?.customizationId ||
          designJson.customizationId ||
          item.designId ||
          '';
        const cachedPreviews = JSON.parse(localStorage.getItem('speedcopy_customization_previews') || '{}');

        const imageCandidates = [
          customizationId ? await getPreviewFromIndexedDB(customizationId) : '', // Check IndexedDB first
          customizationId ? cachedPreviews[customizationId] : '',
          designJson.livePreview,
          item.customization?.renderedPreviewUrl,
          designJson.renderedPreviewUrl,
          item.designPreview,
          item.thumbnail,
          item.image,
          item.customization?.printReadyAssetUrl,
          designJson.printReadyAssetUrl,
        ].filter(Boolean);

        for (const imageCandidate of imageCandidates) {
          const resolvedDirectImage = await resolveLocalFileImage(String(imageCandidate));
          if (isRenderableImageSource(resolvedDirectImage)) return resolvedDirectImage;
        }

        if (item.flowType === 'printing' && item.printConfigId) {
          try {
            const configResponse = await printingService.getPrintConfig(item.printConfigId);
            const firstFile = configResponse.data?.files?.[0];
            const configImages = [
              firstFile?.thumbnailUrl,
              firstFile?.previewImage,
              firstFile?.firstPageImage,
              firstFile?.url,
            ];

            for (const configImage of configImages) {
              const resolvedConfigImage = await resolveLocalFileImage(configImage);
              if (isRenderableImageSource(resolvedConfigImage)) return resolvedConfigImage;
            }

            const matchedStoredFile = findStoredFileMatch(storedFiles, firstFile);
            const matchedStoredImage = getFileImageCandidates(matchedStoredFile).find(isRenderableImageSource);
            if (matchedStoredImage) return matchedStoredImage;
          } catch (err) {
            console.warn('Failed to resolve print cart image:', err);
          }
        }

        return item.flowType === 'printing' ? '' : CART_FALLBACK_IMAGE;
      };

      const mappedItems = await Promise.all(
        filteredItems.map(async (item: any) => {
          const quantity = item.quantity || item.qty || 1;
          const unitPrice = item.unitPrice || item.unit_price || item.salePrice || item.sale_price || item.price || 0;
          const mrp = item.mrp || item.compareAtPrice || 0;
          const categoryLabel =
            typeof item.category === 'string'
              ? item.category
              : item.category?.name || item.flowType || 'Product';

          return {
            id: item._id || item.item_id || item.id,
            name: item.productName || item.name || 'Product',
            image: await resolveCartImage(item),
            designPreview: item.designPreview || '',
            designName: item.designName || item.customization?.customizationId || '',
            qty: quantity,
            price: unitPrice,
            oldPrice: mrp > unitPrice ? mrp : undefined,
            desc:
              item.designName ||
              item.variantSnapshot?.size_label ||
              item.variantSnapshot?.size ||
              item.sku ||
              categoryLabel,
            tag: categoryLabel,
            flowType: item.flowType || 'shopping',
          };
        })
      );

      setItems(mappedItems);

      const suggestedPayload = suggestedResponse?.data || [];
      setSuggested(Array.isArray(suggestedPayload) ? suggestedPayload : []);

      // Fetch available coupons (best-effort — don't block cart load)
      try {
        const flowType = flowFilter as 'printing' | 'gifting' | 'shopping' | undefined;
        const subtotalForCoupons = mappedItems.reduce(
          (sum, item) => sum + item.price * item.qty, 0
        );
        const couponsRes = await cartService.getAvailableCoupons(
          flowType || undefined,
          subtotalForCoupons
        );
        setAvailableCoupons(couponsRes?.data?.coupons || []);
      } catch {
        // silently ignore — coupons are optional
      }
    } catch (err: any) {
      console.error('Failed to fetch cart:', err);
      
      // Check if it's an authentication error
      if (err.response?.status === 401) {
        setError('auth_expired');
        setItems([]);
        setSuggested([]);
        setLoading(false);
        return;
      }
      
      setError(err.response?.data?.message || 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    setCouponError('');
    setCouponLoading(true);
    try {
      const flowType = flowFilter as 'printing' | 'gifting' | 'shopping' | undefined;
      const res = await cartService.applyCoupon({ code, subtotal, flowType: flowType || undefined });
      const data = res.data;
      setAppliedCoupon(data);
      setCoupon('');
      setShowCouponList(false);
    } catch (err: any) {
      setCouponError(
        err?.response?.data?.message || err?.message || 'Invalid coupon code'
      );
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCoupon('');
    setCouponError('');
  };

  const handleSelectAvailableCoupon = (code: string) => {
    setCoupon(code);
    setShowCouponList(false);
  };

  const updateQty = async (id: string, delta: number) => {
    const currentItem = items.find((item) => item.id === id);
    const newQty = Math.max(1, (currentItem?.qty || 1) + delta);
    try {
      await orderService.updateCartItem(id, newQty);
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, qty: newQty } : item)));
    } catch (err) {
      console.error('Failed to update quantity:', err);
    }
  };

  const removeItem = async (id: string) => {
    try {
      await orderService.removeCartItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to remove item:', err);
    }
  };

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.qty, 0), [items]);
  const taxes = 0;
  const couponDiscount = appliedCoupon?.discount ?? 0;
  const total = subtotal + taxes - couponDiscount;
  const emptyActionRoute = isGiftingFlow ? '/products?flow=gifting' : '/shopping';

  if (!isAuthenticated) {
    return (
      <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Login</h1>
          <p className="text-gray-600 mb-6">You need to be logged in to view your cart</p>
          <button onClick={() => navigate('/')} className="px-6 py-3 bg-black text-white rounded-full font-bold hover:bg-gray-800">
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => void fetchCartData()} className="px-6 py-3 bg-black text-white rounded-full font-bold hover:bg-gray-800">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Your Cart is Empty</h1>
          <p className="text-gray-600 mb-6">Add some products to get started</p>
          <button onClick={() => navigate(emptyActionRoute)} className="px-6 py-3 bg-black text-white rounded-full font-bold hover:bg-gray-800">
            {isGiftingFlow ? 'Start Gifting' : 'Start Shopping'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        {/* Breadcrumb - Compact */}
        <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: '#9ca3af' }}>
          <button onClick={() => navigate('/')} className="hover:text-gray-600">Home</button>
          <span>/</span>
          <button onClick={() => navigate(emptyActionRoute)} className="hover:text-gray-600">{isGiftingFlow ? 'Gifting' : 'Shopping'}</button>
          <span>/</span>
          <span style={{ color: '#4b5563' }}>Cart</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl p-4 flex items-center gap-4"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb' }}
              >
                {/* Image */}
                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0" style={{ backgroundColor: '#f3f4f6' }}>
                  <CartItemImage item={item} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold tracking-wider mb-0.5 uppercase text-xs" style={{ color: '#9ca3af' }}>{item.tag}</p>
                  <p className="font-semibold text-gray-900 mb-2 truncate text-sm">{item.name}</p>
                  
                  <div className="flex items-center justify-between">
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => void updateQty(item.id, -1)} 
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100 transition text-sm"
                        style={{ border: '1px solid #e5e7eb' }}
                      >
                        −
                      </button>
                      <span className="font-semibold text-gray-900 w-6 text-center text-sm">{item.qty}</span>
                      <button 
                        onClick={() => void updateQty(item.id, 1)} 
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-gray-700 hover:bg-gray-100 transition text-sm"
                        style={{ border: '1px solid #e5e7eb' }}
                      >
                        +
                      </button>
                    </div>
                    
                    {/* Price & Delete */}
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => void removeItem(item.id)} 
                        className="hover:opacity-60 transition p-1"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" style={{ color: '#9ca3af' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <div className="text-right">
                        {item.oldPrice && <p className="line-through text-xs" style={{ color: '#9ca3af' }}>₹{item.oldPrice.toFixed(2)}</p>}
                        <p className="font-bold text-gray-900 text-base">₹{(item.price * item.qty).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar - More Compact */}
          <div className="lg:col-span-1 space-y-2">
            {/* Order Summary - Compact */}
            <div className="bg-white rounded-lg p-3" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              <h2 className="font-bold text-gray-900 mb-2 text-sm">Order Summary</h2>
              
              <div className="space-y-1 mb-2 pb-2" style={{ borderBottom: '1px solid #e5e7eb' }}>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: '#9ca3af' }}>Subtotal</span>
                  <span className="text-sm font-semibold text-gray-900">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: '#9ca3af' }}>Delivery</span>
                  <span className="text-xs font-bold" style={{ color: '#16a34a' }}>FREE</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: '#9ca3af' }}>Taxes</span>
                  <span className="text-sm font-semibold text-gray-900">₹{taxes.toFixed(2)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold" style={{ color: '#16a34a' }}>
                      🏷 Coupon ({appliedCoupon?.couponCode || appliedCoupon?.code})
                    </span>
                    <span className="text-sm font-bold" style={{ color: '#16a34a' }}>
                      -₹{couponDiscount.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-gray-900 text-sm">Total</span>
                <div className="text-right">
                  <p className="font-bold text-gray-900 text-base">₹{total.toFixed(2)}</p>
                  <p className="text-xs" style={{ color: '#9ca3af' }}>incl. taxes</p>
                </div>
              </div>

              <button 
                onClick={() => {
                  if (!appliedCoupon && !coupon.trim()) {
                    setShowCouponReminder(true);
                  } else {
                    navigate('/checkout', { 
                      state: { 
                        flow: flowFilter,
                        couponCode: appliedCoupon?.couponCode || appliedCoupon?.code || '',
                        couponDiscount,
                        discount: couponDiscount,
                      } 
                    });
                  }
                }} 
                className="w-full py-2 text-white font-bold rounded-full hover:bg-gray-800 transition text-sm flex items-center justify-center gap-2"
                style={{ backgroundColor: '#111111' }}
              >
                Checkout
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Promo Code */}
            <div className="bg-white rounded-lg p-3" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              <p className="text-xs font-bold tracking-wider mb-2 uppercase" style={{ color: '#9ca3af' }}>Promo Code</p>

              {/* Applied coupon badge */}
              {appliedCoupon ? (
                <div className="flex items-center justify-between px-2 py-2 rounded-lg mb-2"
                  style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <p className="text-xs font-bold" style={{ color: '#166534' }}>
                        {appliedCoupon.couponCode || appliedCoupon.code}
                      </p>
                      <p className="text-xs" style={{ color: '#15803d' }}>
                        You save ₹{(appliedCoupon.discount ?? 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <button onClick={handleRemoveCoupon}
                    className="text-xs font-semibold px-2 py-1 rounded-lg hover:bg-red-50 transition"
                    style={{ color: '#dc2626' }}>
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      id="coupon-input"
                      value={coupon}
                      onChange={(e) => { setCoupon(e.target.value.toUpperCase()); setCouponError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && void handleApplyCoupon()}
                      placeholder="Enter code"
                      className="flex-1 text-xs px-2 py-1.5 rounded-lg focus:outline-none bg-gray-50 uppercase"
                      style={{ border: '1px solid #e5e7eb', color: '#374151' }}
                    />
                    <button
                      onClick={() => void handleApplyCoupon()}
                      disabled={couponLoading || !coupon.trim()}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                      style={{ color: '#374151', backgroundColor: '#f3f4f6' }}
                    >
                      {couponLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-xs mt-1.5 font-medium" style={{ color: '#dc2626' }}>{couponError}</p>
                  )}

                  {/* Available coupons toggle */}
                  {availableCoupons.length > 0 && (
                    <button
                      onClick={() => setShowCouponList(!showCouponList)}
                      className="mt-2 text-xs font-semibold flex items-center gap-1 hover:opacity-70 transition"
                      style={{ color: '#2563eb' }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {showCouponList ? 'Hide' : `View ${availableCoupons.length} available coupon${availableCoupons.length > 1 ? 's' : ''}`}
                    </button>
                  )}

                  {/* Available coupons list */}
                  {showCouponList && availableCoupons.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {availableCoupons.map((c) => (
                        <div key={c.code}
                          className="rounded-lg p-2"
                          style={{ border: '1px dashed #d1d5db', backgroundColor: c.already_used ? '#f9fafb' : '#fafafa' }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-xs font-bold tracking-wider" style={{ color: '#111827' }}>{c.code}</span>
                                {c.already_used && (
                                  <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                                    style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>Used</span>
                                )}
                              </div>
                              <p className="text-xs" style={{ color: '#6b7280' }}>{c.description}</p>
                              {c.minOrderValue > 0 && (
                                <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>
                                  Min order: ₹{c.minOrderValue}
                                </p>
                              )}
                              {c.estimated_discount > 0 && (
                                <p className="text-xs font-semibold mt-0.5" style={{ color: '#16a34a' }}>
                                  Save ₹{c.estimated_discount.toFixed(2)}
                                </p>
                              )}
                            </div>
                            {!c.already_used && (
                              <button
                                onClick={() => handleSelectAvailableCoupon(c.code)}
                                className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0 hover:bg-blue-100 transition"
                                style={{ color: '#2563eb', backgroundColor: '#eff6ff' }}
                              >
                                Use
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Delivery Info - Compact */}
            <div className="flex items-start gap-2 px-2 py-2 rounded-lg" style={{ backgroundColor: '#f0fdf4', border: '1px solid #dcfce7' }}>
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="font-bold text-gray-900 text-xs">Free shipping on orders over ₹50</p>
            </div>
          </div>
        </div>

        {/* Suggested Products - Compact */}
        {suggested.length > 0 && (
          <div className="mt-6">
            <h3 className="font-bold text-gray-900 mb-3 text-base">You might also like</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {suggested.slice(0, 4).map((item) => (
                <div
                  key={item._id || item.name}
                  onClick={() => navigate(`/product/${item._id}?flow=${isGiftingFlow ? 'gifting' : 'shopping'}`)}
                  className="bg-white rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition"
                  style={{ border: '1px solid #e5e7eb' }}
                >
                  <div style={{ height: '140px', backgroundColor: '#f3f4f6' }}>
                    <img 
                      src={item.thumbnail || item.images?.[0] || item.image || 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&q=80'} 
                      alt={item.name} 
                      loading="lazy" 
                      decoding="async" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="px-2 py-2">
                    <p className="font-semibold text-gray-900 mb-1 text-xs line-clamp-2">{item.name}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 text-sm">₹{(item.sale_price || item.basePrice || item.price || item.mrp || 0).toFixed(2)}</span>
                      {item.mrp && item.mrp > (item.sale_price || item.basePrice || item.price || 0) && (
                        <span className="text-xs line-through" style={{ color: '#9ca3af' }}>₹{item.mrp.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Coupon Reminder Modal */}
      {showCouponReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCouponReminder(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#fef3c7' }}>
              <svg className="w-8 h-8" style={{ color: '#f59e0b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Save Extra on Order!</h3>
            <p className="text-sm text-gray-600 mb-4">You haven't applied any coupon code yet. Apply a coupon to get exclusive discounts on your order.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCouponReminder(false)}
                className="flex-1 py-2.5 rounded-full font-bold text-gray-600 border-2 border-gray-200"
              >
                Skip
              </button>
              <button
                onClick={() => {
                  setShowCouponReminder(false);
                  document.getElementById('coupon-input')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex-1 py-2.5 rounded-full font-bold text-white"
                style={{ backgroundColor: '#f97316' }}
              >
                Apply Coupon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
