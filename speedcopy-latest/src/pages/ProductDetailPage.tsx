import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ShareModal from '../components/ShareModal';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../hooks/useWishlist';
import productService from '../services/product.service';
import orderService from '../services/order.service';
import BusinessCardCustomizer, { type BusinessCardCustomization } from '../components/BusinessCardCustomizer';
import ProductFramesSelector from '../components/ProductFramesSelector';
import type { Frame } from '../services/design.service';

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
  designMode?: 'premium' | 'normal' | 'both' | string;
  highlights?: string[];
  variants?: ProductVariant[];
  specs?: ProductSpecs;
  customization?: {
    requires_design?: boolean;
    premium_design_available?: boolean;
    start_design_available?: boolean;
    design_mode?: 'premium' | 'normal' | 'both' | string | null;
    canvas?: { width?: number; height?: number; unit?: string } | null;
  };
  gift_options?: {
    canvas?: { width?: number; height?: number; unit?: string } | null;
  };
};

const ProductDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const requestedFlow = searchParams.get('flow') || '';
  const requestedCategory = searchParams.get('category') || '';

  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeImg, setActiveImg] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);
  const [cartError, setCartError] = useState('');
  const [businessCardCustomization, setBusinessCardCustomization] = useState<BusinessCardCustomization>({});
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [pincodeInput, setPincodeInput] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');
  const [pincodeInfo, setPincodeInfo] = useState<{ city?: string; state?: string; estimatedDays?: string } | null>(null);
  const { isWishlisted, toggleWishlist } = useWishlist();
  // Removed unused iconType variable

  useEffect(() => {
    if (!id) return;
    void fetchProduct();
  }, [id, requestedFlow]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError('');
      const response = requestedFlow === 'gifting'
        ? await productService.getGiftingProductById(id!)
        : requestedFlow === 'shopping'
          ? await productService.getShoppingProductById(id!)
          : await productService.getProductById(id!);
      const payload = (response?.data || response) as ProductRecord;
      setProduct(payload || null);
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
  const flowType = requestedFlow || product?.flowType || 'shopping';
  const categoryName = requestedCategory || (typeof product?.category === 'string' ? product.category : product?.category?.name) || 'Products';
  const productName = product?.name || 'Product';
  const description = product?.description?.trim() || 'Premium quality product crafted with care.';
  const supportsPremiumDesign =
    flowType === 'gifting' && Boolean(product?.customization?.premium_design_available);
  const supportsBlankDesign =
    flowType === 'gifting' && Boolean(product?.customization?.start_design_available);
  const highlights = (product?.highlights || []).filter(Boolean);
  const featureCards = highlights.slice(0, 2);
  const specEntries = [
    ['Paper Weight', product?.specs?.paper_weight],
    ['Page Count', product?.specs?.page_count],
    ['Cover Material', product?.specs?.cover_material],
    ['Binding', product?.specs?.binding],
    ['Extras', product?.specs?.extras],
    ['Brand', product?.brand],
    ['SKU', product?.sku],
  ].filter(([, v]) => v) as [string, string][];

  const getBackRoute = () => {
    if (flowType === 'gifting') return `/products?flow=gifting${requestedCategory ? `&category=${encodeURIComponent(requestedCategory)}` : ''}`;
    if (flowType === 'shopping') return '/shopping';
    if (searchParams.get('type') === 'business') return '/business-printing';
    return '/printing';
  };

  // Calculate real delivery date based on current time + business days
  const calcDeliveryDate = (businessDays: number): string => {
    const now = new Date();
    const cutoffHour = 14; // 2 PM cutoff — orders after 2 PM count as next day
    
    // If order placed after cutoff, start counting from tomorrow
    let start = new Date(now);
    if (now.getHours() >= cutoffHour) {
      start.setDate(start.getDate() + 1);
    }
    
    let daysAdded = 0;
    let current = new Date(start);
    
    while (daysAdded < businessDays) {
      current.setDate(current.getDate() + 1);
      const day = current.getDay(); // 0 = Sunday, 6 = Saturday
      if (day !== 0) { // skip Sundays (India — Saturdays are working)
        daysAdded++;
      }
    }
    
    return current.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const checkPincode = async () => {
    if (pincodeInput.length !== 6) return;
    setPincodeStatus('checking');
    setPincodeInfo(null);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pincodeInput}`);
      const data = await res.json();
      if (data?.[0]?.Status === 'Success' && data[0].PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        
        // Determine delivery speed based on state
        // Same state = 2–3 days, different state = 4–5 days
        // We'll use a simple heuristic: metro pincodes get faster delivery
        const metroRanges = [
          [110001, 110099], // Delhi
          [400001, 400099], // Mumbai
          [600001, 600099], // Chennai
          [700001, 700099], // Kolkata
          [560001, 560099], // Bangalore
          [500001, 500099], // Hyderabad
          [380001, 380099], // Ahmedabad
          [411001, 411099], // Pune
        ];
        const pin = parseInt(pincodeInput);
        const isMetro = metroRanges.some(([min, max]) => pin >= min && pin <= max);
        
        const minDays = isMetro ? 2 : 3;
        const maxDays = isMetro ? 3 : 5;
        const minDate = calcDeliveryDate(minDays);
        const maxDate = calcDeliveryDate(maxDays);
        
        const now = new Date();
        const cutoffHour = 14;
        const orderNote = now.getHours() >= cutoffHour
          ? 'Order now to dispatch tomorrow'
          : 'Order now to dispatch today';

        setPincodeInfo({
          city: po.District || po.Name,
          state: po.State,
          estimatedDays: `${minDate} – ${maxDate}`,
          orderNote,
          minDays,
          maxDays,
        } as any);
        setPincodeStatus('available');
      } else {
        setPincodeStatus('unavailable');
      }
    } catch {
      setPincodeStatus('unavailable');
    }
  };

  const goToDesignEditor = (designMode: 'premium' | 'normal') => {
    const currentProductId = (product?._id || product?.id || id || '').toString();
    if (!currentProductId) return;

    const params = new URLSearchParams({
      productId: currentProductId,
      flow: flowType,
      designMode,
    });

    if (requestedCategory) {
      params.set('category', requestedCategory);
    }

    navigate(`/design-editor?${params.toString()}`);
  };

  const addToCart = async (redirectTo?: string) => {
    if (!isAuthenticated) { navigate('/'); return; }
    if (!product?._id && !id) return;
    
    // Check if printing product and customization is available
    const isPrintingProduct = flowType === 'printing' || searchParams.get('type') === 'business';
    
    // Optional validation - only warn if no customization provided
    if (isPrintingProduct && !businessCardCustomization.uploadedImage && !businessCardCustomization.textContent?.name) {
      console.log('Note: No customization provided for printing product');
    }
    
    try {
      setCartLoading(true);
      setCartError('');
      
      const cartData: any = {
        productId: (product?._id || product?.id || id) as string,
        productName,
        flowType,
        quantity: qty,
        variantId: selectedVariant?.id || String(selectedVariant?.index ?? selectedVariantIndex),
        thumbnail: normalizedImages[0],
        unitPrice,
        totalPrice: unitPrice * qty,
      };
      
      // Add customization data if available for printing products
      if (isPrintingProduct && (businessCardCustomization.uploadedImage || businessCardCustomization.textContent?.name)) {
        cartData.options = {
          customization: businessCardCustomization
        };
      }
      
      await orderService.addToCart(cartData);
      
      if (redirectTo) {
        navigate(redirectTo, { state: { flow: flowType } });
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

  // Render function removed - not used in this component

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
          <button onClick={() => navigate(getBackRoute())} className="px-6 py-3 bg-black text-white rounded-full font-bold">Back</button>
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
          <button onClick={() => navigate(getBackRoute())} className="hover:text-gray-600 transition capitalize">{flowType}</button>
          <span>/</span>
          <span className="font-semibold" style={{ color: '#374151' }}>{categoryName}</span>
        </div>

        {/* ── Top section: image + product info ── */}
        <div className="grid lg:grid-cols-[1fr_1fr] gap-12 mb-14">

          {/* LEFT — main image + thumbnails */}
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

          {/* RIGHT — product info */}
          <div className="pt-2">
            {/* Name, Wishlist and Share Buttons */}
            <div className="flex items-start justify-between gap-3 mb-3">
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
                    const flowType = (product?.flowType || (searchParams.get('type') === 'business' ? 'printing' : 'shopping')) as 'gifting' | 'shopping' | 'printing' | 'business-printing';
                    toggleWishlist(id!, flowType);
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

            {/* Size selector */}
            {sizeOptions.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold tracking-widest uppercase" style={{ color: '#6b7280' }}>Select Size</p>
                  <button className="text-xs" style={{ color: '#6b7280' }}>Size Guide</button>
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

            {/* Paper type */}
            {paperTypeOptions.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#6b7280' }}>Paper Type</p>
                <div className="flex flex-wrap gap-2">
                  {paperTypeOptions.map(opt => {
                    const active = selectedVariant?.paper_type === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => updateVariant({ paper_type: opt.value, size: selectedVariant?.size, cover_color: selectedVariant?.cover_color })}
                        className="px-4 py-1.5 rounded-full text-sm font-medium transition"
                        style={{
                          backgroundColor: active ? '#111111' : '#ffffff',
                          color: active ? '#ffffff' : '#374151',
                          border: active ? '1.5px solid #111111' : '1.5px solid #e5e7eb',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cover color */}
            {coverColorOptions.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#6b7280' }}>
                  Cover Color:{' '}
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
                        className="w-8 h-8 rounded-full flex items-center justify-center transition"
                        style={{ border: active ? '2.5px solid #111111' : '2px solid transparent', padding: '2px' }}
                      >
                        <span className="block w-full h-full rounded-full" style={{ backgroundColor: opt.swatch }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Business Card Customizer - Show for all printing products */}
            {(flowType === 'printing' || searchParams.get('type') === 'business') && (
              <div className="mb-6">
                <BusinessCardCustomizer
                  onCustomizationChange={setBusinessCardCustomization}
                  productImage={normalizedImages[Math.min(activeImg, normalizedImages.length - 1)]}
                />
              </div>
            )}

            {/* Product Frames Selector - Show frames for this product */}
            {product?._id && (
              <div className="mb-6">
                <ProductFramesSelector
                  productId={product._id}
                  onFrameSelect={setSelectedFrame}
                  selectedFrameId={selectedFrame?._id}
                />
              </div>
            )}

            {/* Qty + action buttons */}
            <div className="flex items-center gap-3 mb-4">
              {/* Qty stepper */}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-full" style={{ border: '1.5px solid #e5e7eb' }}>
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-5 h-5 flex items-center justify-center font-bold text-gray-500 hover:text-gray-900 transition"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm font-bold text-gray-900">{qty}</span>
                <button
                  onClick={() => setQty(q => q + 1)}
                  className="w-5 h-5 flex items-center justify-center font-bold text-gray-500 hover:text-gray-900 transition"
                >
                  +
                </button>
              </div>

              {/* Add to cart */}
              <button
                onClick={() => addToCart()}
                disabled={cartLoading}
                className="px-6 py-2.5 rounded-full text-sm font-semibold transition disabled:opacity-60 flex items-center gap-2"
                style={{ border: '1.5px solid #d1d5db', backgroundColor: '#ffffff', color: '#111111' }}
              >
                {cartLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Adding...
                  </>
                ) : cartAdded ? '✓ Added!' : 'Add to cart'}
              </button>

              {/* Continue to Pay */}
              <button
                onClick={() => addToCart('/checkout')}
                disabled={cartLoading}
                className="flex-1 px-6 py-2.5 rounded-full text-sm font-semibold bg-black text-white hover:bg-gray-800 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                Continue to Pay
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {(supportsPremiumDesign || supportsBlankDesign) && (
              <div className="mb-5 rounded-2xl bg-white p-4" style={{ border: '1px solid #e5e7eb' }}>
                <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#6b7280' }}>
                  Design Options
                </p>
                <div className="flex flex-wrap gap-3">
                  {supportsPremiumDesign && (
                    <button
                      onClick={() => goToDesignEditor('premium')}
                      className="rounded-full px-5 py-2.5 text-sm font-semibold transition"
                      style={{ backgroundColor: '#111111', color: '#ffffff' }}
                    >
                      Explore Premium Templates
                    </button>
                  )}
                  {supportsBlankDesign && (
                    <button
                      onClick={() => goToDesignEditor('normal')}
                      className="rounded-full px-5 py-2.5 text-sm font-semibold transition"
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#111111',
                        border: '1.5px solid #d1d5db',
                      }}
                    >
                      Start Blank Design
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Cart feedback */}
            {cartAdded && (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 mb-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Added to cart!{' '}
                <button onClick={() => navigate('/cart?flow=shopping')} className="underline hover:opacity-70">View Cart</button>
              </div>
            )}
            {cartError && (
              <p className="text-xs text-red-600 mb-3">{cartError}</p>
            )}

            {/* Stock + shipping badges */}
            <div className="flex items-center gap-5 text-xs" style={{ color: '#6b7280' }}>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {product?.in_stock === false ? 'Currently unavailable' : 'In stock, ready to ship'}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                {product?.free_shipping ? 'Free shipping over ₹50' : 'Standard shipping'}
              </span>
            </div>

            {/* Pincode delivery check */}
            <div className="mt-4 rounded-2xl bg-white p-4" style={{ border: '1px solid #e5e7eb' }}>
              <p className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Check Delivery Availability
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter 6-digit pincode"
                  maxLength={6}
                  value={pincodeInput}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPincodeInput(val);
                    if (pincodeStatus !== 'idle') setPincodeStatus('idle');
                    setPincodeInfo(null);
                  }}
                  onKeyDown={e => e.key === 'Enter' && pincodeInput.length === 6 && checkPincode()}
                  className="flex-1 px-3 py-2 rounded-xl text-sm text-gray-900 outline-none"
                  style={{ border: '1.5px solid #e5e7eb', backgroundColor: '#fafafa' }}
                />
                <button
                  onClick={checkPincode}
                  disabled={pincodeInput.length !== 6 || pincodeStatus === 'checking'}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition disabled:opacity-50"
                  style={{ backgroundColor: '#111' }}
                >
                  {pincodeStatus === 'checking' ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : 'Check'}
                </button>
              </div>

              {/* Result */}
              {pincodeStatus === 'available' && pincodeInfo && (
                <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div className="flex items-start gap-2 mb-2">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-xs font-bold" style={{ color: '#166534' }}>
                      Delivery available to {(pincodeInfo as any).city}, {(pincodeInfo as any).state}
                    </p>
                  </div>
                  {/* Delivery timeline */}
                  <div className="ml-6 space-y-1.5 mb-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#15803d' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs font-semibold" style={{ color: '#15803d' }}>
                        Expected by: {(pincodeInfo as any).estimatedDays}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#15803d' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs" style={{ color: '#15803d' }}>
                        {(pincodeInfo as any).orderNote} · Cutoff: 2:00 PM
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#15803d' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      <p className="text-xs" style={{ color: '#15803d' }}>
                        {(pincodeInfo as any).minDays}–{(pincodeInfo as any).maxDays} business days · Sundays excluded
                      </p>
                    </div>
                  </div>
                  {/* Use this pincode button */}
                  <button
                    onClick={() => navigate('/checkout', {
                      state: {
                        deliveryPincode: pincodeInput,
                        deliveryCity: (pincodeInfo as any).city,
                        deliveryState: (pincodeInfo as any).state,
                        estimatedDelivery: (pincodeInfo as any).estimatedDays,
                        orderNote: (pincodeInfo as any).orderNote,
                      }
                    })}
                    className="w-full py-2 rounded-xl text-xs font-bold text-white transition"
                    style={{ backgroundColor: '#111' }}
                  >
                    Use this pincode for delivery →
                  </button>
                </div>
              )}

              {pincodeStatus === 'unavailable' && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-xl" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#dc2626' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <div>
                    <p className="text-xs font-bold" style={{ color: '#991b1b' }}>Delivery not available for this pincode</p>
                    <p className="text-xs mt-0.5" style={{ color: '#b91c1c' }}>Try a nearby pincode or choose pickup.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom section: description + specs ── */}
        <div className="grid lg:grid-cols-[1fr_340px] gap-8">

          {/* Description */}
          <div>
            {/* Tab */}
            <div className="mb-5">
              <span className="text-sm font-semibold pb-2 inline-block" style={{ color: '#7c3aed', borderBottom: '2px solid #7c3aed' }}>
                Description
              </span>
            </div>

            <p className="text-sm leading-7 text-gray-600 mb-6">{description}</p>

            {/* Feature cards */}
            {featureCards.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-3">
                {featureCards.map((item, i) => {
                  const IconComponent = i === 0 ? (
                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  );
                  
                  return (
                    <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-xl" style={{ border: '1px solid #f3f4f6' }}>
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        {IconComponent}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 mb-0.5">{item}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Technical Specs */}
          {specEntries.length > 0 && (
            <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #e5e7eb', alignSelf: 'start' }}>
              <h3 className="font-bold text-gray-900 mb-4" style={{ fontSize: '15px' }}>Technical Specs</h3>
              <div>
                {specEntries.map(([label, value], i) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-3 text-sm"
                    style={{ borderBottom: i < specEntries.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                  >
                    <span style={{ color: '#9ca3af' }}>{label}</span>
                    <span className="font-semibold text-gray-800 text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        productName={productName}
        productUrl={`/product/${id}${requestedFlow ? `?flow=${requestedFlow}` : ''}`}
      />
    </div>
  );
};

export default ProductDetailPage;
