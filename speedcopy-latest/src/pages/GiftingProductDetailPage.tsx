import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ShareModal from '../components/ShareModal';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../hooks/useWishlist';
import productService from '../services/product.service';
import orderService from '../services/order.service';

type ProductVariant = {
  id?: string;
  index?: number;
  size?: string;
  size_label?: string;
  paper_type?: string;
  cover_color?: string;
  cover_color_name?: string;
  stock?: number;
  additional_price?: number;
};

type ProductSpecs = {
  paper_weight?: string;
  page_count?: string;
  cover_material?: string;
  binding?: string;
  extras?: string;
  features?: string[];
};

type ProductCategory = {
  _id?: string;
  id?: string;
  name?: string;
  slug?: string;
};

type ProductRecord = {
  _id?: string;
  id?: string;
  name?: string;
  description?: string;
  flowType?: 'shopping' | 'gifting' | 'printing' | string;
  images?: string[];
  thumbnail?: string;
  image?: string;
  category?: ProductCategory | string;
  subcategory?: { name?: string } | string;
  basePrice?: number;
  discountedPrice?: number;
  mrp?: number;
  sale_price?: number;
  badge?: string | null;
  brand?: string;
  sku?: string;
  stock?: number;
  in_stock?: boolean;
  free_shipping?: boolean;
  highlights?: string[];
  variants?: ProductVariant[];
  specs?: ProductSpecs;
};

const GiftingProductDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isAuthenticated } = useAuth();

  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImg, setActiveImg] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);
  const [cartError, setCartError] = useState('');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [showOrientationModal, setShowOrientationModal] = useState(false);
  const { isWishlisted, toggleWishlist } = useWishlist();

  useEffect(() => {
    if (!id) return;
    void fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await productService.getGiftingProductById(id!);
      const payload = (response as any)?.data || response;
      setProduct(payload as ProductRecord || null);
      setActiveImg(0);
      setSelectedVariantIndex(0);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const normalizedImages = useMemo(() => {
    const vals = [
      ...(Array.isArray(product?.images) ? product!.images : []),
      product?.thumbnail,
      product?.image,
    ].filter(Boolean) as string[];
    return vals.length ? Array.from(new Set(vals)) : [
      'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=900&q=80',
    ];
  }, [product]);

  const variants = useMemo(() => (Array.isArray(product?.variants) ? product!.variants : []), [product]);
  const selectedVariant = variants[selectedVariantIndex] || null;

  const sizeOptions = useMemo(() =>
    Array.from(new Map(
      variants.filter(v => v.size || v.size_label).map((v, i) => [
        `${v.size || ''}-${v.size_label || ''}`,
        { index: i, value: v.size || v.size_label || `opt-${i}`, label: v.size || v.size_label || `Option ${i + 1}`, sub: v.size_label && v.size_label !== v.size ? v.size_label : '' },
      ])
    ).values()), [variants]);

  const paperTypeOptions = useMemo(() =>
    Array.from(new Map(
      variants.filter(v => v.paper_type).map((v, i) => [v.paper_type as string, { index: i, value: v.paper_type as string, label: v.paper_type as string }])
    ).values()), [variants]);

  const coverColorOptions = useMemo(() =>
    Array.from(new Map(
      variants.filter(v => v.cover_color || v.cover_color_name).map((v, i) => [
        `${v.cover_color || ''}-${v.cover_color_name || ''}`,
        { index: i, value: v.cover_color || `color-${i}`, label: v.cover_color_name || v.cover_color || `Color ${i + 1}`, swatch: v.cover_color || '#111' },
      ])
    ).values()), [variants]);

  const updateVariant = (matchers: Partial<ProductVariant>) => {
    const idx = variants.findIndex(v =>
      Object.entries(matchers).every(([k, val]) => !val || v[k as keyof ProductVariant] === val)
    );
    if (idx >= 0) setSelectedVariantIndex(idx);
  };

  const salePrice = product?.sale_price ?? product?.discountedPrice ?? product?.basePrice ?? 0;
  const mrp = product?.mrp ?? product?.basePrice ?? salePrice;
  const discountPct = mrp > salePrice ? Math.round(((mrp - salePrice) / mrp) * 100) : 0;
  const unitPrice = salePrice + (selectedVariant?.additional_price || 0);
  const productName = product?.name || 'Product';
  const highlights = (product?.highlights || []).filter(Boolean);

  const addToCart = async (redirectTo?: string) => {
    if (!isAuthenticated) { navigate('/'); return; }
    if (!product?._id && !id) return;
    try {
      setCartLoading(true);
      setCartError('');
      await orderService.addToCart({
        productId: (product?._id || product?.id || id) as string,
        productName,
        flowType: 'gifting',
        quantity: qty,
        variantId: selectedVariant?.id || String(selectedVariant?.index ?? selectedVariantIndex),
        thumbnail: normalizedImages[0],
        unitPrice,
        totalPrice: unitPrice * qty,
      });
      if (redirectTo) {
        navigate(redirectTo, { state: { flow: 'gifting' } });
      } else {
        setCartAdded(true);
        setTimeout(() => setCartAdded(false), 2500);
      }
    } catch (err: any) {
      setCartError(err?.response?.data?.message || 'Failed to add to cart.');
      setTimeout(() => setCartError(''), 3000);
    } finally {
      setCartLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="animate-pulse grid lg:grid-cols-2 gap-12">
            <div>
              <div className="bg-gray-200 rounded-2xl" style={{ height: '480px' }} />
              <div className="flex gap-3 mt-4">
                {[1,2,3].map(i => <div key={i} className="w-16 h-16 bg-gray-200 rounded-xl" />)}
              </div>
            </div>
            <div className="space-y-4 pt-4">
              <div className="h-8 bg-gray-200 rounded w-3/4" />
              <div className="h-6 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mt-6" />
              <div className="grid grid-cols-3 gap-2">
                {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-200 rounded-xl" />)}
              </div>
              <div className="h-4 bg-gray-200 rounded w-1/3 mt-4" />
              <div className="flex gap-2">
                {[1,2,3].map(i => <div key={i} className="h-8 w-20 bg-gray-200 rounded-full" />)}
              </div>
              <div className="h-12 bg-gray-200 rounded-full mt-6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-5xl mx-auto px-6 py-20 text-center">
          <p className="text-red-500 mb-4">{error || 'Product not found'}</p>
          <button onClick={() => navigate('/products?flow=gifting')} className="px-6 py-3 bg-black text-white rounded-full font-bold">Back</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs mb-8" style={{ color: '#9ca3af' }}>
          <button onClick={() => navigate('/')} className="hover:text-gray-600 transition">Home</button>
          <span>/</span>
          <button onClick={() => navigate('/products?flow=gifting')} className="hover:text-gray-600 transition">Gifting Store</button>
          <span>/</span>
          <span className="font-semibold" style={{ color: '#374151' }}>{productName}</span>
        </div>

        {/* Main Grid: Image + Details */}
        <div className="grid lg:grid-cols-[1fr_1fr] gap-12 mb-14">

          {/* LEFT — Images */}
          <div>
            {/* Main image */}
            <div
              className="rounded-2xl overflow-hidden flex items-center justify-center bg-white"
              style={{ height: '460px', border: '1px solid #e5e7eb' }}
            >
              <img
                src={normalizedImages[Math.min(activeImg, normalizedImages.length - 1)]}
                alt={productName}
                className="w-full h-full object-contain p-6"
              />
            </div>

            {/* Thumbnails */}
            {normalizedImages.length > 1 && (
              <div className="flex items-center gap-3 mt-4 overflow-x-auto pb-1">
                {normalizedImages.map((img, i) => (
                  <button
                    key={`${img}-${i}`}
                    onClick={() => setActiveImg(i)}
                    className="flex-shrink-0 rounded-xl overflow-hidden bg-white transition"
                    style={{
                      width: '72px',
                      height: '72px',
                      border: activeImg === i ? '2px solid #111111' : '1.5px solid #e5e7eb',
                    }}
                  >
                    <img src={img} alt={`${productName} ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Product Details */}
          <div className="pt-2">
            {/* Name, Wishlist and Share Buttons */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <h1 className="font-semibold text-gray-900 leading-tight flex-1" style={{ fontSize: '28px' }}>
                {productName}
              </h1>
              <div className="flex items-center gap-2">
                {/* Wishlist Button */}
                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      navigate('/');
                      return;
                    }
                    toggleWishlist(id!, 'gifting');
                  }}
                  className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition"
                  title={isWishlisted(id!) ? "Remove from wishlist" : "Add to wishlist"}
                >
                  <svg 
                    className="w-5 h-5" 
                    fill={isWishlisted(id!) ? '#ef4444' : 'none'} 
                    viewBox="0 0 24 24" 
                    stroke={isWishlisted(id!) ? '#ef4444' : '#6b7280'} 
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
                {/* Share Button */}
                <button
                  onClick={() => setShareModalOpen(true)}
                  className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition"
                  title="Share product"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-8">
              <span className="font-bold text-gray-900" style={{ fontSize: '26px' }}>₹{unitPrice.toFixed(2)}</span>
              {mrp > unitPrice && (
                <span className="line-through text-sm" style={{ color: '#9ca3af' }}>₹{mrp.toFixed(2)}</span>
              )}
              {discountPct > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                  SAVE {discountPct}%
                </span>
              )}
            </div>

            {/* Volume/Size Selection */}
            {sizeOptions.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold tracking-widest uppercase" style={{ color: '#6b7280' }}>Select Volume</p>
                  <span className="text-xs font-semibold" style={{ color: '#6b7280' }}>Free Guide</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {sizeOptions.map(opt => {
                    const active = selectedVariantIndex === opt.index;
                    return (
                      <button
                        key={`${opt.value}-${opt.index}`}
                        onClick={() => setSelectedVariantIndex(opt.index)}
                        className="py-3 px-2 rounded-xl text-center transition bg-white"
                        style={{ border: active ? '2px solid #111111' : '1.5px solid #e5e7eb' }}
                      >
                        <div className="text-sm font-semibold text-gray-800">{opt.label}</div>
                        <div className="text-[10px] mt-0.5" style={{ color: '#9ca3af' }}>{opt.sub || 'Standard'}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Material Selection */}
            {paperTypeOptions.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#6b7280' }}>Choose Material</p>
                <div className="flex flex-wrap gap-2">
                  {paperTypeOptions.map(opt => {
                    const active = selectedVariant?.paper_type === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => updateVariant({ paper_type: opt.value, size: selectedVariant?.size, cover_color: selectedVariant?.cover_color })}
                        className="px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2"
                        style={{
                          backgroundColor: active ? '#111111' : '#ffffff',
                          color: active ? '#ffffff' : '#374151',
                          border: active ? '1.5px solid #111111' : '1.5px solid #e5e7eb',
                        }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Color Selection */}
            {coverColorOptions.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#6b7280' }}>
                  Choose Color:{' '}
                  <span className="normal-case font-bold text-gray-800">
                    {(selectedVariant?.cover_color_name || selectedVariant?.cover_color || coverColorOptions[0]?.label || '').toUpperCase()}
                  </span>
                </p>
                <div className="flex items-center gap-3">
                  {coverColorOptions.map(opt => {
                    const active = selectedVariant?.cover_color === opt.value;
                    return (
                      <button
                        key={`${opt.value}-${opt.index}`}
                        onClick={() => updateVariant({ cover_color: opt.value, size: selectedVariant?.size, paper_type: selectedVariant?.paper_type })}
                        className="w-10 h-10 rounded-full flex items-center justify-center transition"
                        style={{ border: active ? '3px solid #111111' : '2px solid transparent', padding: '2px' }}
                        title={opt.label}
                      >
                        <span className="block w-full h-full rounded-full" style={{ backgroundColor: opt.swatch }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6">
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#6b7280' }}>Quantity</p>
              <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl" style={{ border: '1.5px solid #e5e7eb', width: 'fit-content' }}>
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-6 h-6 flex items-center justify-center font-bold text-gray-500 hover:text-gray-900 transition"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-bold text-gray-900">{qty}</span>
                <button
                  onClick={() => setQty(q => q + 1)}
                  className="w-6 h-6 flex items-center justify-center font-bold text-gray-500 hover:text-gray-900 transition"
                >
                  +
                </button>
              </div>
            </div>

            {/* Gift Summary Box */}
            <div className="bg-gray-100 rounded-2xl p-5 mb-6" style={{ border: '1px solid #e5e7eb' }}>
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2" style={{ fontSize: '15px' }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-9 1h6m-6 4h6m-6 4h6" />
                </svg>
                Gift Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: '#6b7280' }}>Base Price ({selectedVariant?.size_label || 'Standard'})</span>
                  <span className="font-semibold text-gray-900">₹{salePrice.toFixed(2)}</span>
                </div>
                {selectedVariant?.additional_price ? (
                  <div className="flex justify-between">
                    <span style={{ color: '#6b7280' }}>Personalization Fee</span>
                    <span className="font-semibold text-gray-900">₹{selectedVariant.additional_price.toFixed(2)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span style={{ color: '#6b7280' }}>Bulk Discount (0%)</span>
                  <span className="font-semibold" style={{ color: '#16a34a' }}>₹0.00</span>
                </div>
                <div className="pt-2" style={{ borderTop: '1px solid #d1d5db' }}>
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-900">Final Price</span>
                    <span className="font-bold text-gray-900" style={{ fontSize: '18px' }}>₹{(unitPrice * qty).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => setShowOrientationModal(true)}
                className="w-full px-6 py-3 rounded-full text-sm font-bold transition flex items-center justify-center gap-2 text-white hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)', boxShadow: '0 4px 14px rgba(249,115,22,0.3)' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Customise Now
              </button>

              <button
                onClick={() => addToCart()}
                disabled={cartLoading}
                className="w-full px-6 py-3 rounded-full text-sm font-semibold transition disabled:opacity-60"
                style={{ border: '1.5px solid #d1d5db', backgroundColor: '#ffffff', color: '#111111' }}
              >
                {cartLoading ? 'Adding to cart...' : cartAdded ? '✓ Added to cart!' : 'Add to cart'}
              </button>

              <button
                onClick={() => addToCart('/checkout')}
                disabled={cartLoading}
                className="w-full px-6 py-3 rounded-full text-sm font-semibold bg-black text-white hover:bg-gray-800 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                Continue to Pay
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Error message */}
            {cartError && (
              <p className="text-xs text-red-600 mt-3">{cartError}</p>
            )}

            {/* Info badges */}
            <div className="flex items-center gap-5 text-xs mt-6" style={{ color: '#6b7280' }}>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                In stock, ready to ship
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                Free shipping
              </span>
            </div>
          </div>
        </div>

        {/* Product Highlights */}
        {highlights.length > 0 && (
          <div className="mb-12">
            <h2 className="font-bold text-gray-900 mb-6" style={{ fontSize: '18px' }}>Product Highlights</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
              {highlights.map((highlight, i) => (
                <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-xl" style={{ border: '1px solid #f3f4f6' }}>
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-xs font-semibold text-gray-900">{highlight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Orientation Modal */}
      {showOrientationModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowOrientationModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full overflow-hidden"
            style={{ maxWidth: '480px', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #f3f4f6' }}>
              <div>
                <h2 className="font-bold text-gray-900 text-lg">Choose Frame Orientation</h2>
                <p className="text-xs text-gray-400 mt-0.5">Select how you want your photo to be displayed</p>
              </div>
              <button onClick={() => setShowOrientationModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-500 text-lg font-bold">×</button>
            </div>

            {/* Options */}
            <div className="p-6 grid grid-cols-3 gap-4">
              {[
                {
                  key: 'portrait',
                  label: 'Portrait',
                  sub: 'Tall · 3:4',
                  icon: (
                    <div className="w-12 h-16 rounded-lg border-2 border-gray-300 bg-gray-50 flex items-center justify-center">
                      <svg className="w-6 h-8 text-gray-400" fill="none" viewBox="0 0 24 32" stroke="currentColor">
                        <rect x="2" y="2" width="20" height="28" rx="2" strokeWidth={2} />
                        <circle cx="12" cy="14" r="5" strokeWidth={1.5} />
                      </svg>
                    </div>
                  ),
                },
                {
                  key: 'landscape',
                  label: 'Landscape',
                  sub: 'Wide · 4:3',
                  icon: (
                    <div className="w-16 h-12 rounded-lg border-2 border-gray-300 bg-gray-50 flex items-center justify-center">
                      <svg className="w-8 h-6 text-gray-400" fill="none" viewBox="0 0 32 24" stroke="currentColor">
                        <rect x="2" y="2" width="28" height="20" rx="2" strokeWidth={2} />
                        <circle cx="16" cy="12" r="5" strokeWidth={1.5} />
                      </svg>
                    </div>
                  ),
                },
                {
                  key: 'square',
                  label: 'Square',
                  sub: '1:1',
                  icon: (
                    <div className="w-14 h-14 rounded-lg border-2 border-gray-300 bg-gray-50 flex items-center justify-center">
                      <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 28 28" stroke="currentColor">
                        <rect x="2" y="2" width="24" height="24" rx="2" strokeWidth={2} />
                        <circle cx="14" cy="14" r="5" strokeWidth={1.5} />
                      </svg>
                    </div>
                  ),
                },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => {
                    setShowOrientationModal(false);
                    navigate(`/simple-frame-editor?productId=${product?._id || product?.id || id}&flow=gifting&orientation=${opt.key}`);
                  }}
                  className="flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-orange-50 transition group"
                  style={{ border: '2px solid #e5e7eb' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = '#f97316'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb'}
                >
                  {opt.icon}
                  <div className="text-center">
                    <p className="font-bold text-gray-900 text-sm">{opt.label}</p>
                    <p className="text-xs text-gray-400">{opt.sub}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="px-6 pb-5">
              <p className="text-xs text-center text-gray-400">
                You can still adjust the photo inside the editor after selecting
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        productName={productName}
        productUrl={`/gifting-product/${id}`}
      />
    </div>
  );
};

export default GiftingProductDetailPage;
