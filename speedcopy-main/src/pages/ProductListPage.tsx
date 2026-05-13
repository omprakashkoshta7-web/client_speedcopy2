import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BackButton from '../components/BackButton';
import productService from '../services/product.service';
import businessPrintingService from '../services/business-printing.service';
import { useWishlist } from '../hooks/useWishlist';
import { useAuth } from '../context/AuthContext';
import { 
  calculateDiscountInfo, 
  formatPriceDisplay, 
  getDealCountdown,
  getDiscountBadgeClasses 
} from '../utils/discount.utils';
import { getAlternateImageUrl, getPlaceholderImage, normalizeImageUrl, resolveThumbnail } from '../utils/image.utils';

const ProductListPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const selectedCategoryFromUrl = searchParams.get('category') || 'All Products';
  const businessTypeFromUrl = searchParams.get('businessType') || '';
  const isBusinessPrinting = searchParams.get('type') === 'business';
  const isShoppingFlow = searchParams.get('flow') === 'shopping';
  const isGiftingFlow = searchParams.get('flow') === 'gifting';
  const [activeTab, setActiveTab] = useState(selectedCategoryFromUrl);
  const [page, setPage] = useState(1);
  const [liked, setLiked] = useState<string[]>([]);
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [showProducts, setShowProducts] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    fetchCategories();
  }, [isBusinessPrinting, isShoppingFlow, isGiftingFlow]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setActiveTab(selectedCategoryFromUrl);
    setShowProducts(isBusinessPrinting || isShoppingFlow || isGiftingFlow || selectedCategoryFromUrl !== 'All Products');
  }, [selectedCategoryFromUrl, isBusinessPrinting, isShoppingFlow, isGiftingFlow]);

  useEffect(() => {
    const shouldFetchBusinessProducts =
      (isBusinessPrinting || isShoppingFlow || isGiftingFlow) && (activeTab === 'All Products' || categories.length > 0);

    if (shouldFetchBusinessProducts || showProducts) {
      fetchProducts();
    }
  }, [activeTab, page, showProducts, categories, isBusinessPrinting, isShoppingFlow, isGiftingFlow]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      if (isBusinessPrinting) {
        try {
          const res = await businessPrintingService.getBusinessPrintingTypes();
          const types = Array.isArray(res.data) ? res.data : [];
          if (types.length > 0) {
            setCategories(types);
            return;
          }
        } catch {}
        const response = await productService.getCategories({ flowType: 'printing' });
        setCategories(response.data || []);
      } else if (isGiftingFlow) {
        const response = await productService.getGiftingCategories();
        const payload = Array.isArray(response) ? response : (response.data || []);
        setCategories(payload);
      } else if (isShoppingFlow) {
        const response = await productService.getShoppingCategories();
        const payload = Array.isArray(response) ? response : (response.data || []);
        setCategories(payload);
      } else {
        const response = await productService.getProducts({ limit: 100 });
        // Extract unique categories from products
        const products = response.data.products || [];
        const uniqueCats = [...new Set(products.map((p: any) => p.category?.name || p.category).filter(Boolean))];
        setCategories(uniqueCats.map((name: any) => ({ name })));
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);

      if (isBusinessPrinting) {
        const typeFromUrl = businessTypeFromUrl || undefined;
        const selectedCat = !typeFromUrl && activeTab !== 'All Products' 
          ? categories.find((c: any) => c.name === activeTab)
          : undefined;
        
        let productsData: any[] = [];
        let metaData: any = {};
        
        // Try business printing API first with type filter (requires businessPrintType field)
        if (typeFromUrl) {
          const res = await businessPrintingService.getBusinessProducts({ page, limit: 12, type: typeFromUrl });
          const resData = res.data || res;
          productsData = resData.products || [];
          metaData = resData.meta || resData.pagination || {};
        }
        
        // If no results from business printing API, fall back to generic products API
        if (productsData.length === 0) {
          const catFilter = selectedCat ? { category: selectedCat._id || selectedCat.id || activeTab } : {};
          const response = await productService.getProductsByFlowType('printing', { page, limit: 12, ...catFilter });
          const payload: any = response.data || response || {};
          productsData = (payload.products || []).map((p: any) => ({
            ...p,
            sale_price: p.sale_price ?? p.basePrice ?? p.mrp ?? 0,
            mrp: p.mrp ?? p.basePrice ?? 0,
            images: Array.isArray(p.images) ? p.images.map((img: string) => normalizeImageUrl(img)).filter(Boolean) : p.images,
            thumbnail: normalizeImageUrl(p.thumbnail),
            image: normalizeImageUrl(p.image),
            imageUrl: normalizeImageUrl(p.imageUrl),
          }));
          metaData = payload.meta || payload.pagination || {};
        }
        
        setProducts(productsData);
        setTotalPages(Math.max(1, metaData.totalPages || metaData.pages || 1));
        setTotalProducts(metaData.total || 0);
      } else if (isGiftingFlow) {
        const selectedCat = activeTab === 'All Products'
          ? undefined
          : categories.find((c: any) => c.name === activeTab);

        const response = await productService.getProductsByFlowType('gifting', {
          page,
          limit: 12,
          ...(selectedCat ? { category: selectedCat._id || selectedCat.id || activeTab } : {}),
        });
        const payload: any = response.data || response || {};
        setProducts(payload.products || []);
        setTotalPages(Math.max(1, payload.meta?.pages || 1));
        setTotalProducts(payload.meta?.total || 0);
      } else if (isShoppingFlow) {
        const response = await productService.getProductsByFlowType('shopping', {
          page,
          limit: 12,
          ...(activeTab !== 'All Products' ? { category: activeTab } : {}),
        });
        const payload: any = response.data || response || {};
        setProducts(payload.products || []);
        setTotalPages(Math.max(1, payload.meta?.pages || 1));
        setTotalProducts(payload.meta?.total || 0);
      } else {
        // Use regular products API
        const category = activeTab === 'All Products' ? undefined : activeTab;
        const response = await productService.getProductsByFlowType('printing', { 
          page, 
          limit: 12, 
          category 
        });
        const payload: any = response.data || response || {};
        setProducts(payload.products || []);
        setTotalPages(Math.max(1, payload.meta?.pages || 1));
        setTotalProducts(payload.meta?.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setProducts([]);
      setTotalPages(1);
      setTotalProducts(0);
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      console.log('User not authenticated');
      navigate('/');
      return;
    }
    const flowType = isBusinessPrinting ? 'printing' : (isGiftingFlow ? 'gifting' : 'shopping');
    console.log('Toggle wishlist:', { id, flowType, isAuthenticated });
    void toggleWishlist(id, flowType);
    // keep local liked for non-auth fallback
    setLiked(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const categoryTabs = [{ name: 'All Products' }, ...categories];
  const visiblePageNumbers = Array.from(
    { length: Math.min(totalPages, 5) },
    (_, index) => Math.max(1, Math.min(totalPages - 4, page - 2, totalPages - 5)) + index
  ).filter((value, index, array) => value >= 1 && value <= totalPages && array.indexOf(value) === index);

  const getProductImage = (product: any) =>
    resolveThumbnail(product.images, product.thumbnail, product.image, product.imageUrl) || getPlaceholderImage();

  const handleProductImageError = (product: any) => (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const source = getProductImage(product);
    const fallback = getAlternateImageUrl(source, img.src);
    if (fallback && !img.dataset.fallbackTried) {
      img.dataset.fallbackTried = '1';
      img.src = fallback;
      return;
    }
    img.src = getPlaceholderImage();
  };

  const buildProductRoute = (productId: string) => {
    if (isBusinessPrinting) return `/product/${productId}?type=business`;
    if (isShoppingFlow) return `/product/${productId}?flow=shopping`;
    if (isGiftingFlow) return `/gifting-product/${productId}`;
    return `/product/${productId}`;
  };

  if (isBusinessPrinting || isShoppingFlow || isGiftingFlow) {
    const pageLabel = isBusinessPrinting ? 'Business Printing' : (isGiftingFlow ? 'Gifting' : 'Shopping');
    const pageDescription = isBusinessPrinting
      ? 'Explore premium business printing products with fast turnaround and clean brand-ready finishes.'
      : isGiftingFlow
        ? 'Discover personalized gifting products crafted for celebrations, surprises, and memorable moments.'
        : 'Discover curated shopping essentials with premium quality and fast delivery.';
    const emptyStateText = isBusinessPrinting
      ? 'Browse our business printing collection'
      : isGiftingFlow
        ? 'Browse our gifting collection'
        : 'Browse our shopping collection';
    const actionButtonText = isBusinessPrinting ? 'Start Design' : (isGiftingFlow ? 'Customize Gift' : 'View Product');
    const showWishlistButton = true; // Enable wishlist for all product types
    const showCardActionButton = isBusinessPrinting || isGiftingFlow;

    return (
      <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div
            className="rounded-3xl px-6 sm:px-8 py-7 mb-6 relative overflow-hidden"
            style={{ background: isGiftingFlow ? 'linear-gradient(135deg, #ff5ba7 0%, #f472b6 52%, #fb7185 100%)' : 'linear-gradient(135deg, #f59ed1 0%, #ec4899 52%, #db2777 100%)' }}
          >
            <div className="max-w-md relative z-10">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.26)' }}
              >
                <span className="text-xs font-bold text-white tracking-widest uppercase">
                  {isBusinessPrinting ? 'LIMITED OFFER' : isGiftingFlow ? 'GIFTING STUDIO' : 'SHOPPING PICKS'}
                </span>
              </div>
              <h1 className="font-black text-white mb-2" style={{ fontSize: isShoppingFlow ? '30px' : '34px' }}>
                {isShoppingFlow ? 'Productivity Sale' : isGiftingFlow ? (activeTab === 'All Products' ? 'Personalized Gift Picks' : activeTab) : (activeTab === 'All Products' ? `${pageLabel} Collection` : activeTab)}
              </h1>
              <p className="text-white/80 mb-5 max-w-sm" style={{ fontSize: '13px', lineHeight: '1.6' }}>
                {isShoppingFlow
                  ? 'Get 15% off on premium office essentials. Elevate your daily workflow today.'
                  : isGiftingFlow
                    ? 'Choose a category, personalize your favorite product, and move into a gifting-first purchase flow.'
                    : pageDescription}
              </p>
              <button
                onClick={() => setActiveTab('All Products')}
                className="px-6 py-2.5 font-bold rounded-full hover:bg-gray-100 transition text-sm"
                style={{ backgroundColor: 'white', color: isShoppingFlow ? '#db2777' : isGiftingFlow ? '#e11d48' : '#111111' }}
              >
                {isShoppingFlow ? 'Shop the Sale' : isGiftingFlow ? 'Explore Gifts' : 'Explore All'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-6 flex-wrap">
            {categoriesLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-10 w-24 rounded-full bg-white animate-pulse border border-gray-200" />
              ))
            ) : (
              categoryTabs.map((tab: any) => (
                <button
                  key={tab._id || tab.name}
                  onClick={() => setActiveTab(tab.name)}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold transition"
                  style={{
                    backgroundColor: activeTab === tab.name ? '#111111' : '#ffffff',
                    color: activeTab === tab.name ? '#ffffff' : '#374151',
                    border: activeTab === tab.name ? 'none' : '1px solid #e5e7eb',
                  }}
                >
                  {tab.name}
                </button>
              ))
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {loading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl overflow-hidden animate-pulse"
                  style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}
                >
                  <div className="h-40 bg-gray-200" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    {showCardActionButton && <div className="h-9 bg-gray-200 rounded-xl" />}
                  </div>
                </div>
              ))
            ) : products.length > 0 ? (
              products.map((product: any) => {
                const productId = product._id || product.id;
                const discountInfo = calculateDiscountInfo(product);
                const priceDisplay = formatPriceDisplay(discountInfo);
                const dealCountdown = getDealCountdown(product);

                // Compact design for shopping flow
                if (isShoppingFlow) {
                  return (
                    <div
                      key={productId}
                      onClick={() => navigate(buildProductRoute(productId))}
                      className="bg-white rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition group relative"
                      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}
                    >
                      <div className="relative">
                        {/* Discount Badge */}
                        {discountInfo.badgeText && (
                          <div className={`${getDiscountBadgeClasses(discountInfo.badgeColor)} text-[9px] px-1.5 py-0.5`}>
                            {discountInfo.badgeText}
                          </div>
                        )}
                        
                        {/* Deal of the Day Badge */}
                        {product.is_deal_of_day && (
                          <div className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-orange-500 text-white px-1.5 py-0.5 text-[9px] font-bold rounded-md shadow-lg animate-pulse z-20">
                            🔥 DEAL
                          </div>
                        )}
                        
                        {showWishlistButton && (
                          <button
                            onClick={(e) => toggleLike(productId, e)}
                            className="absolute top-2 right-2 z-10 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition"
                          >
                            <svg className="w-3.5 h-3.5" fill={liked.includes(productId) || isWishlisted(productId) ? '#f43f5e' : 'none'} viewBox="0 0 24 24" stroke={'#f43f5e'} strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          </button>
                        )}
                        <div className="rounded-t-xl overflow-hidden h-36 flex items-center justify-center" style={{ backgroundColor: '#f8fafc' }}>
                          <img src={getProductImage(product)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" onError={handleProductImageError(product)} />
                        </div>
                      </div>

                      <div className="p-2.5">
                        <h3 className="font-bold text-gray-900 mb-0.5 line-clamp-1" style={{ fontSize: '11px' }}>
                          {product.name}
                        </h3>
                        <p className="text-[9px] mb-1.5 truncate" style={{ color: '#9ca3af' }}>
                          {product.shortDescription || product.category?.name || product.category || activeTab}
                        </p>
                        
                        {/* Deal Countdown */}
                        {dealCountdown && (
                          <p className="text-[8px] text-red-600 font-medium mb-1">
                            ⏰ {dealCountdown}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1">
                              <span className="font-black text-gray-900" style={{ fontSize: '13px' }}>
                                {priceDisplay.currentPrice}
                              </span>
                              {priceDisplay.showStrikethrough && priceDisplay.originalPrice && (
                                <span className="line-through text-[10px]" style={{ color: '#9ca3af' }}>
                                  {priceDisplay.originalPrice}
                                </span>
                              )}
                              {discountInfo.hasDiscount && (
                                <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                                  {discountInfo.discountPct}%
                                </span>
                              )}
                            </div>
                            {priceDisplay.formattedSavings && (
                              <p className="text-[8px] text-green-600 font-medium">
                                {priceDisplay.formattedSavings}
                              </p>
                            )}
                          </div>
                          {showCardActionButton && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(buildProductRoute(productId));
                              }}
                              className="px-2.5 py-1 text-white font-bold rounded-lg text-[9px] hover:bg-gray-700 transition"
                              style={{ backgroundColor: '#111111' }}
                            >
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Default design for other flows
                return (
                  <div
                    key={productId}
                    onClick={() => navigate(buildProductRoute(productId))}
                    className="bg-white rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition"
                    style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)', border: '1px solid #f3f4f6' }}
                  >
                    <div className="relative p-3">
                      {/* Discount Badge */}
                      {discountInfo.badgeText && (
                        <div className={`${getDiscountBadgeClasses(discountInfo.badgeColor)} text-xs px-2 py-0.5`}>
                          {discountInfo.badgeText}
                        </div>
                      )}
                      
                      {/* Deal of the Day Badge */}
                      {product.is_deal_of_day && (
                        <div className="absolute top-3 right-3 bg-gradient-to-r from-red-500 to-orange-500 text-white px-2 py-0.5 text-xs font-bold rounded-md shadow-lg animate-pulse z-20">
                          🔥 DEAL
                        </div>
                      )}
                      
                      {showWishlistButton && (
                        <button
                          onClick={(e) => toggleLike(productId, e)}
                          className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center"
                        >
                          <svg className="w-4 h-4" fill={liked.includes(productId) || isWishlisted(productId) ? '#f43f5e' : 'none'} viewBox="0 0 24 24" stroke={'#f43f5e'} strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </button>
                      )}
                      <div className="rounded-2xl overflow-hidden h-40 flex items-center justify-center" style={{ backgroundColor: isShoppingFlow ? '#f8fafc' : '#f9fafb' }}>
                        <img src={getProductImage(product)} alt="" className="w-full h-full object-cover" onError={handleProductImageError(product)} />
                      </div>
                    </div>

                    <div className="px-3 pb-3">
                      <h3 className="font-bold text-gray-900 mb-1 line-clamp-2 min-h-[38px]" style={{ fontSize: '12px' }}>
                        {product.name}
                      </h3>
                      <p className="text-[10px] mb-2 truncate" style={{ color: '#9ca3af' }}>
                        {product.shortDescription || product.category?.name || product.category || activeTab}
                      </p>
                      
                      {/* Deal Countdown */}
                      {dealCountdown && (
                        <p className="text-[10px] text-red-600 font-medium mb-1">
                          ⏰ {dealCountdown}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-gray-900" style={{ fontSize: '15px' }}>
                              {priceDisplay.currentPrice}
                            </span>
                            {priceDisplay.showStrikethrough && priceDisplay.originalPrice && (
                              <span className="line-through text-xs" style={{ color: '#9ca3af' }}>
                                {priceDisplay.originalPrice}
                              </span>
                            )}
                            {discountInfo.hasDiscount && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>
                                {discountInfo.discountPct}%
                              </span>
                            )}
                          </div>
                          {priceDisplay.formattedSavings && (
                            <p className="text-[10px] text-green-600 font-medium">
                              {priceDisplay.formattedSavings}
                            </p>
                          )}
                        </div>
                      </div>
                      {showCardActionButton && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(buildProductRoute(productId));
                          }}
                          className="w-full py-2 text-white font-bold rounded-xl text-xs hover:bg-gray-700 transition mt-3"
                          style={{ backgroundColor: '#111111' }}
                        >
                          {actionButtonText}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center py-16">
                <p className="text-gray-500 text-sm">
                  {categoriesLoading ? 'Loading products...' : 'No products found for this category.'}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 mb-8">
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition"
              style={{ color: '#9ca3af', border: '1px solid #e5e7eb', backgroundColor: '#ffffff' }}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {visiblePageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition"
                style={{
                  backgroundColor: page === pageNumber ? '#111111' : '#ffffff',
                  color: page === pageNumber ? '#ffffff' : '#374151',
                  border: page === pageNumber ? 'none' : '1px solid #e5e7eb',
                }}
              >
                {pageNumber}
              </button>
            ))}
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition"
              style={{ color: '#9ca3af', border: '1px solid #e5e7eb', backgroundColor: '#ffffff' }}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <p className="text-center text-sm text-gray-500">
            {totalProducts > 0 ? `${totalProducts} products found` : emptyStateText}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <Navbar />
      <BackButton label="Back" className="mb-6" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* Back to Business Printing button for business printing context */}
        {isBusinessPrinting && (
          <div className="mb-6">
            <button 
              onClick={() => navigate('/business-printing')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Business Printing
            </button>
          </div>
        )}

        {/* Page Title for Business Printing */}
        {isBusinessPrinting && (
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {selectedCategoryFromUrl === 'All Products' ? 'All Business Printing Products' : `${selectedCategoryFromUrl} Products`}
            </h1>
            <p className="text-gray-600">Professional printing solutions for your business needs</p>
          </div>
        )}

        {/* Main Content - Show category cards by default, products when category selected */}
        {!showProducts ? (
          /* Category Cards View */
          <div className="p-6 mb-8">
            {/* Main banner */}
            <div className="rounded-3xl px-8 py-8 mb-6 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #f9a8d4 0%, #ec4899 40%, #db2777 100%)', minHeight: '160px' }}>
              <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full opacity-10" style={{ backgroundColor: '#fff' }} />
              <div className="absolute -bottom-10 right-24 w-32 h-32 rounded-full opacity-10" style={{ backgroundColor: '#fff' }} />
              <div className="relative z-10 max-w-md">
                <div className="inline-flex items-center px-3 py-1 rounded-full mb-3 text-xs font-bold text-white"
                  style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}>
                  {isBusinessPrinting ? 'BUSINESS PRINTING' : 'LIMITED OFFER'}
                </div>
                <h2 className="font-bold text-white mb-2" style={{ fontSize: '28px' }}>
                  {isBusinessPrinting ? 'Professional Printing' : 'Productivity Sale'}
                </h2>
                <p className="text-white/80 text-sm mb-5 leading-relaxed">
                  {isBusinessPrinting 
                    ? 'Professional printing solutions for your business needs'
                    : 'Get 15% off on all premium office essentials. Elevate your daily workflow today.'
                  }
                </p>
                <button 
                  onClick={() => isBusinessPrinting ? navigate('/business-printing') : navigate('/shopping')}
                  className="px-6 py-2.5 bg-white font-bold rounded-full text-sm hover:bg-gray-100 transition"
                  style={{ color: '#db2777' }}>
                  {isBusinessPrinting ? 'View All Categories' : 'Shop the Sale'}
                </button>
              </div>
            </div>

            {/* Category Cards for business printing (instead of tabs) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
              {/* All Products Card */}
              <div
                className="bg-white rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
                style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                onClick={() => setActiveTab('All Products')}
              >
                {/* Image area */}
                <div
                  className="relative flex items-center justify-center"
                  style={{ height: '240px', backgroundColor: '#f8f9fa' }}
                >
                  <div className="text-center">
                    <div className="text-6xl mb-4">🎯</div>
                    <div className="text-lg font-bold text-gray-800">ALL PRODUCTS</div>
                  </div>
                  
                  {/* Active indicator */}
                  {activeTab === 'All Products' && (
                    <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                      <div className="bg-white rounded-full p-2">
                        <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                  <h3 className="font-bold text-gray-900 mb-2 text-lg">All Products</h3>
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                    Browse all available business printing products
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">
                        View <span className="font-bold text-gray-900 text-lg">All Categories</span>
                      </p>
                    </div>
                    <button
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-gray-200"
                      style={{ backgroundColor: activeTab === 'All Products' ? '#111111' : '#f3f4f6' }}
                      onClick={e => { e.stopPropagation(); setActiveTab('All Products'); }}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={activeTab === 'All Products' ? '#ffffff' : '#6b7280'}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {categoriesLoading ? (
                // Loading skeleton
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                    <div className="h-[200px] bg-gray-200" />
                    <div className="px-5 pt-4 pb-5">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-full mb-1" />
                      <div className="h-3 bg-gray-200 rounded w-5/6 mb-4" />
                      <div className="h-8 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))
              ) : categories.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-500">No categories found.</p>
                </div>
              ) : (
                categories.map(category => {
                  // Define specific colors and designs for each category
                  const categoryDesigns = {
                    'Business Cards': {
                      bg: '#e8c9b8',
                      content: (
                        <div className="w-full h-full flex items-center justify-center p-6">
                          <div className="grid grid-cols-2 gap-3 w-full max-w-[280px]">
                            {/* Top row cards */}
                            <div className="bg-white rounded-lg shadow-md p-3 h-20 flex flex-col justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-1 bg-green-400 rounded"></div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-xs font-bold text-gray-800">BUSINESS</div>
                                <div className="text-[10px] text-gray-600">Your Company Name</div>
                              </div>
                            </div>
                            <div className="bg-white rounded-lg shadow-md p-3 h-20 flex flex-col justify-between">
                              <div className="flex justify-end">
                                <div className="w-6 h-6 bg-green-400 rounded transform rotate-45"></div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-xs font-bold text-gray-800">JOHN DOE</div>
                                <div className="text-[10px] text-gray-600">Creative Director</div>
                              </div>
                            </div>
                            {/* Bottom row cards */}
                            <div className="bg-white rounded-lg shadow-md p-3 h-20 flex flex-col justify-between">
                              <div className="space-y-0.5">
                                <div className="text-xs font-bold text-gray-800">BUSINESS CONSULTANT</div>
                                <div className="text-xs font-bold text-gray-800">SERVICES</div>
                              </div>
                              <div className="space-y-0.5">
                                <div className="text-[9px] text-gray-600">+91 98 7654 3210</div>
                                <div className="text-[9px] text-gray-600">info@company.com</div>
                              </div>
                            </div>
                            <div className="bg-white rounded-lg shadow-md p-3 h-20"></div>
                          </div>
                        </div>
                      )
                    },
                    'Flyers & Leaflets': {
                      bg: '#9ab8a0',
                      content: (
                        <div className="w-full h-full flex items-center justify-center p-6">
                          <div className="bg-white rounded-lg shadow-md w-full max-w-[200px] h-32 p-4 flex flex-col">
                            <div className="text-xs font-bold text-gray-800 mb-2">SPECIAL OFFER</div>
                            <div className="flex-1 space-y-1">
                              <div className="h-1 bg-gray-200 rounded w-full"></div>
                              <div className="h-1 bg-gray-200 rounded w-3/4"></div>
                              <div className="h-1 bg-gray-200 rounded w-5/6"></div>
                            </div>
                            <div className="text-xs font-bold text-blue-600 mt-2">50% OFF</div>
                          </div>
                        </div>
                      )
                    },
                    'Brochures': {
                      bg: '#c9b8d4',
                      content: (
                        <div className="w-full h-full flex items-center justify-center p-6">
                          <div className="bg-white rounded-lg shadow-md w-full max-w-[180px] h-36 p-3 flex flex-col">
                            <div className="text-xs font-bold text-gray-800 mb-2">COMPANY</div>
                            <div className="text-xs font-bold text-gray-800 mb-3">BROCHURE</div>
                            <div className="flex-1 space-y-1">
                              <div className="h-1 bg-gray-200 rounded w-full"></div>
                              <div className="h-1 bg-gray-200 rounded w-4/5"></div>
                              <div className="h-1 bg-gray-200 rounded w-full"></div>
                              <div className="h-1 bg-gray-200 rounded w-3/5"></div>
                            </div>
                          </div>
                        </div>
                      )
                    },
                    'Posters': {
                      bg: '#b8c9d4',
                      content: (
                        <div className="w-full h-full flex items-center justify-center p-6">
                          <div className="bg-white rounded-lg shadow-md w-full max-w-[160px] h-40 p-4 flex flex-col items-center justify-center">
                            <div className="text-lg font-bold text-gray-800 mb-2">EVENT</div>
                            <div className="text-xs text-gray-600 mb-3">POSTER DESIGN</div>
                            <div className="w-12 h-12 bg-gray-200 rounded-full mb-2"></div>
                            <div className="text-xs font-bold text-gray-800">2024</div>
                          </div>
                        </div>
                      )
                    },
                    'Letterheads': {
                      bg: '#d4c9b8',
                      content: (
                        <div className="w-full h-full flex items-center justify-center p-6">
                          <div className="bg-white rounded-lg shadow-md w-full max-w-[180px] h-36 p-4 flex flex-col">
                            <div className="text-xs font-bold text-gray-800 mb-1">COMPANY NAME</div>
                            <div className="text-[10px] text-gray-600 mb-4">Professional Letterhead</div>
                            <div className="flex-1 space-y-2">
                              <div className="h-0.5 bg-gray-200 rounded w-full"></div>
                              <div className="h-0.5 bg-gray-200 rounded w-full"></div>
                              <div className="h-0.5 bg-gray-200 rounded w-4/5"></div>
                            </div>
                            <div className="text-[9px] text-gray-500 mt-2">contact@company.com</div>
                          </div>
                        </div>
                      )
                    },
                    'Custom Stationery': {
                      bg: '#e8c9b8',
                      content: (
                        <div className="w-full h-full flex items-center justify-center p-6">
                          <div className="grid grid-cols-2 gap-2 w-full max-w-[200px]">
                            <div className="bg-white rounded shadow-sm h-16 p-2">
                              <div className="text-[9px] font-bold text-gray-800">NOTEBOOK</div>
                            </div>
                            <div className="bg-white rounded shadow-sm h-16 p-2">
                              <div className="text-[9px] font-bold text-gray-800">ENVELOPE</div>
                            </div>
                            <div className="bg-white rounded shadow-sm h-16 p-2">
                              <div className="text-[9px] font-bold text-gray-800">FOLDER</div>
                            </div>
                            <div className="bg-white rounded shadow-sm h-16 p-2">
                              <div className="text-[9px] font-bold text-gray-800">STAMP</div>
                            </div>
                          </div>
                        </div>
                      )
                    }
                  };

                  const design = categoryDesigns[category.name as keyof typeof categoryDesigns] || {
                    bg: '#f3f4f6',
                    content: (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-gray-400 text-4xl">{category.icon || '📄'}</div>
                      </div>
                    )
                  };
                  
                  return (
                    <div
                      key={category._id}
                      className="bg-white rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
                      style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                      onClick={() => setActiveTab(category.name)}
                    >
                      {/* Image area with category-specific design */}
                      <div
                        className="relative"
                        style={{ height: '240px', backgroundColor: design.bg }}
                      >
                        {design.content}
                        
                        {/* Best Seller badge for Business Cards */}
                        {category.name === 'Business Cards' && (
                          <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-white text-xs font-bold tracking-wider"
                            style={{ backgroundColor: '#111111' }}>
                            BEST SELLER
                          </div>
                        )}

                        {/* Active indicator */}
                        {activeTab === category.name && (
                          <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                            <div className="bg-white rounded-full p-2">
                              <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="px-6 py-5">
                        <h3 className="font-bold text-gray-900 mb-2 text-lg">{category.name}</h3>
                        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                          {category.description || 'Premium quality printing service for your business needs.'}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-400 line-through mb-1">₹112.00</p>
                            <p className="text-sm text-gray-600">
                              Starting from <span className="font-bold text-gray-900 text-lg">₹80.50</span>
                            </p>
                          </div>
                          <button
                            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-gray-200"
                            style={{ backgroundColor: activeTab === category.name ? '#111111' : '#f3f4f6' }}
                            onClick={e => { e.stopPropagation(); setActiveTab(category.name); }}
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={activeTab === category.name ? '#ffffff' : '#6b7280'}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Selected Category Products Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {activeTab === 'All Products' ? 'All Business Products' : `${activeTab} Products`}
                </h2>
                <p className="text-gray-600">
                  {products.length} {products.length === 1 ? 'product' : 'products'} found
                </p>
              </div>

              {/* Products Grid for business printing */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                    <div className="h-48 bg-gray-200" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))
              ) : products.length > 0 ? (
                products.map((p: any) => (
                  <div key={p._id}
                    onClick={() => navigate(`/product/${p._id}`)}
                    className="bg-white rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition"
                    style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                    {/* Image */}
                    <div className="relative" style={{ height: '180px', backgroundColor: '#f0f0f0' }}>
                      <img src={getProductImage(p)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" onError={handleProductImageError(p)} />
                      {p.badge && (
                        <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-white text-xs font-bold"
                          style={{ 
                            backgroundColor: p.badge === 'SALE' ? '#8b5cf6' : 
                                           p.badge === 'NEW' ? '#10b981' : 
                                           p.badge === 'BEST SELLER' ? '#111' : '#111' 
                          }}>
                          {p.badge}
                        </div>
                      )}
                      {/* Heart */}
                      <button
                        onClick={e => toggleLike(p._id, e)}
                        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-white transition hover:scale-110"
                        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                        <svg className="w-4 h-4" fill={liked.includes(p._id) || isWishlisted(p._id) ? '#ef4444' : 'none'} viewBox="0 0 24 24" stroke={liked.includes(p._id) || isWishlisted(p._id) ? '#ef4444' : '#9ca3af'} strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-3">
                      <p className="font-bold text-gray-900 text-sm mb-0.5 truncate">{p.name}</p>
                      <p className="text-xs mb-2" style={{ color: '#9ca3af' }}>{p.category?.name || p.category || 'Business Printing'}</p>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-bold text-gray-900 text-sm">₹{p.basePrice || p.sale_price || p.mrp || p.price}</span>
                        {p.mrp > (p.basePrice || p.sale_price) && <span className="line-through text-xs" style={{ color: '#9ca3af' }}>₹{p.mrp}</span>}
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          navigate(`/product/${p._id}`);
                        }}
                        className="w-full py-2 text-white font-bold rounded-xl text-xs hover:bg-gray-700 transition"
                        style={{ backgroundColor: '#111111' }}>
                        Start Design
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-500">No products found</p>
                </div>
              )}
            </div>

              {/* Pagination for business printing */}
              <div className="flex items-center justify-center gap-2">
                <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-200 transition"
                  style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
                  onClick={() => setPage(p => Math.max(1, p - 1))}>
                  <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {[1, 2, 3].map(n => (
                  <button key={n} onClick={() => setPage(n)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition"
                    style={{
                      backgroundColor: page === n ? '#111111' : '#ffffff',
                      color: page === n ? '#ffffff' : '#374151',
                      border: page === n ? 'none' : '1px solid #e5e7eb',
                    }}>
                    {n}
                  </button>
                ))}
                <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-200 transition"
                  style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
                  onClick={() => setPage(p => Math.min(3, p + 1))}>
                  <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Regular product list for non-business printing */}
        {!isBusinessPrinting && (
        <div className="rounded-3xl px-8 py-8 mb-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #f9a8d4 0%, #ec4899 40%, #db2777 100%)', minHeight: '160px' }}>
          <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full opacity-10" style={{ backgroundColor: '#fff' }} />
          <div className="absolute -bottom-10 right-24 w-32 h-32 rounded-full opacity-10" style={{ backgroundColor: '#fff' }} />
          <div className="relative z-10 max-w-md">
            <div className="inline-flex items-center px-3 py-1 rounded-full mb-3 text-xs font-bold text-white"
              style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}>
              PRODUCTS
            </div>
            <h2 className="font-bold text-white mb-2" style={{ fontSize: '28px' }}>
              Productivity Sale
            </h2>
            <p className="text-white/80 text-sm mb-5 leading-relaxed">
              Discover our complete range of products and services
            </p>
            <button 
              onClick={() => navigate('/shopping')}
              className="px-6 py-2.5 bg-white font-bold rounded-full text-sm hover:bg-gray-100 transition"
              style={{ color: '#db2777' }}>
              Explore All
            </button>
          </div>
        </div>
        )}

        {/* Regular tabs and products - only show for non-business printing */}
        {!isBusinessPrinting && (
          <>
            {/* Tabs */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <button key="all" onClick={() => setActiveTab('All Products')}
                className="px-4 py-2 rounded-full text-sm font-semibold transition"
                style={{
                  backgroundColor: activeTab === 'All Products' ? '#111111' : '#ffffff',
                  color: activeTab === 'All Products' ? '#ffffff' : '#374151',
                  border: activeTab === 'All Products' ? 'none' : '1px solid #e5e7eb',
                }}>
                All Products
              </button>
              {categoriesLoading ? (
                <div className="text-sm text-gray-500">Loading categories...</div>
              ) : (
                categories.map((cat: any) => (
                  <button key={cat._id || cat.name} onClick={() => setActiveTab(cat.name)}
                    className="px-4 py-2 rounded-full text-sm font-semibold transition"
                    style={{
                      backgroundColor: activeTab === cat.name ? '#111111' : '#ffffff',
                      color: activeTab === cat.name ? '#ffffff' : '#374151',
                      border: activeTab === cat.name ? 'none' : '1px solid #e5e7eb',
                    }}>
                    {cat.name}
                  </button>
                ))
              )}
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                    <div className="h-48 bg-gray-200" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))
              ) : products.length > 0 ? (
                products.map((p: any) => (
                  <div key={p._id}
                    onClick={() => navigate(`/product/${p._id}`)}
                    className="bg-white rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition"
                    style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                    {/* Image */}
                    <div className="relative" style={{ height: '180px', backgroundColor: '#f0f0f0' }}>
                      <img src={getProductImage(p)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" onError={handleProductImageError(p)} />
                      {p.badge && (
                        <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-white text-xs font-bold"
                          style={{ backgroundColor: '#111' }}>
                          {p.badge}
                        </div>
                      )}
                      {/* Heart */}
                      <button
                        onClick={e => toggleLike(p._id, e)}
                        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-white transition hover:scale-110"
                        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                        <svg className="w-4 h-4" fill={liked.includes(p._id) || isWishlisted(p._id) ? '#ef4444' : 'none'} viewBox="0 0 24 24" stroke={liked.includes(p._id) || isWishlisted(p._id) ? '#ef4444' : '#9ca3af'} strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-3">
                      <p className="font-bold text-gray-900 text-sm mb-0.5 truncate">{p.name}</p>
                      <p className="text-xs mb-2" style={{ color: '#9ca3af' }}>{p.category?.name || p.category || 'Product'}</p>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-bold text-gray-900 text-sm">₹{p.basePrice || p.sale_price || p.mrp || p.price}</span>
                        {p.mrp > (p.basePrice || p.sale_price) && <span className="line-through text-xs" style={{ color: '#9ca3af' }}>₹{p.mrp}</span>}
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          navigate(`/product/${p._id}`);
                        }}
                        className="w-full py-2 text-white font-bold rounded-xl text-xs hover:bg-gray-700 transition"
                        style={{ backgroundColor: '#111111' }}>
                        {isBusinessPrinting ? 'Start Design' : 'View Product'}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-500">No products found</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2">
              <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-200 transition"
                style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
                onClick={() => setPage(p => Math.max(1, p - 1))}>
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {[1, 2, 3].map(n => (
                <button key={n} onClick={() => setPage(n)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition"
                  style={{
                    backgroundColor: page === n ? '#111111' : '#ffffff',
                    color: page === n ? '#ffffff' : '#374151',
                    border: page === n ? 'none' : '1px solid #e5e7eb',
                  }}>
                  {n}
                </button>
              ))}
              <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-200 transition"
                style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
                onClick={() => setPage(p => Math.min(3, p + 1))}>
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default ProductListPage;
