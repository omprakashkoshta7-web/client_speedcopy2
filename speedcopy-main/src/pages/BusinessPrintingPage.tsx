import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BackButton from '../components/BackButton';
import Footer from '../components/Footer';
import { 
  calculateDiscountInfo, 
  formatPriceDisplay, 
  getDealCountdown,
  getDiscountBadgeClasses 
} from '../utils/discount.utils';
import { normalizeImageUrl } from '../utils/image.utils';
import businessPrintingService, { type BusinessPrintType } from '../services/business-printing.service';

interface CategoryType extends BusinessPrintType {
  image?: string;
}

const BusinessPrintingPage: React.FC = () => {
  const [businessTypes, setBusinessTypes] = useState<CategoryType[]>([]);
  const [activeFilter, setActiveFilter] = useState('All Products');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBusinessTypes();
  }, []);

  const fetchBusinessTypes = async () => {
    try {
      setLoading(true);

      // First try the dedicated business printing types API
      const res = await businessPrintingService.getBusinessPrintingTypes();
      const typesData = res.data || [];
      if (typesData.length > 0) {
        setBusinessTypes(typesData.map((t: any) => ({
          ...t,
          image: t.thumbnail ? normalizeImageUrl(t.thumbnail) : undefined,
          route: `/product-list?type=business&category=${encodeURIComponent(t.name || t.id)}&businessType=${t.id || t._id}`,
        })));
        setActiveFilter('All Products');
        return;
      }

      // Fallback: use categories API
      const PRODUCT_BASE = import.meta.env.VITE_PRODUCT_URL || import.meta.env.VITE_API_BASE_URL || 'https://gateway-202671058278.asia-east1.run.app';
      const endpoints = [
        `${PRODUCT_BASE}/api/products/categories?showAll=true`,
        `${PRODUCT_BASE}/api/products/categories`,
        `${PRODUCT_BASE.replace(/\/api\/?$/, '')}/api/products/categories`,
      ];

      let data: any = null;
      for (const url of endpoints) {
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          if (response.ok) {
            data = await response.json();
            break;
          }
        } catch {
          // try next endpoint
        }
      }

      if (!data) throw new Error('All endpoints failed');

      const raw: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data.data)
        ? data.data
        : Array.isArray(data.categories)
        ? data.categories
        : [];

      const allCategories = raw.filter((cat: any) => {
        if (cat.isActive === false) return false;
        if (cat.flowType) return cat.flowType === 'printing';
        return true;
      });

      const nextBusinessTypes = allCategories.map((cat: any) => ({
        id: cat.slug || cat._id,
        name: cat.name,
        description: cat.description || 'Professional printing services for your business needs.',
        route: `/product-list?type=business&category=${encodeURIComponent(cat.name)}`,
        cta_text: `Explore ${cat.name}`,
        base_price: cat.base_price,
        starting_price: cat.starting_price,
        mrp: cat.mrp,
        sale_price: cat.sale_price,
        discount_pct: cat.discount_pct,
        badge: cat.badge,
        is_deal_of_day: cat.is_deal_of_day,
        deal_expires_at: cat.deal_expires_at,
        is_featured: Boolean(cat.is_featured),
        thumbnail: cat.image ? normalizeImageUrl(cat.image) : undefined,
        image: cat.image ? normalizeImageUrl(cat.image) : undefined,
        product_count: cat.product_count,
      }));

      setBusinessTypes(nextBusinessTypes);
      setActiveFilter('All Products');
    } catch (err) {
      console.error('Failed to load business printing categories:', err);
      setBusinessTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (type: CategoryType) => {
    navigate(type.route);
  };

  const getStartingPrice = (type: CategoryType) => {
    if (type.base_price) return `₹${type.base_price}`;
    return null;
  };

  const getBestSellerBadge = (type: CategoryType) => type.is_featured;

  const hasCategoryImage = (type: CategoryType) => Boolean(type.thumbnail || type.image);

  const filteredBusinessTypes = activeFilter === 'All Products'
    ? businessTypes
    : businessTypes.filter((type) => type.name === activeFilter);

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', overflowX: 'hidden' }}>
        <Navbar />
        <div className="bg-black text-white py-2 overflow-hidden">
          <div className="animate-marquee whitespace-nowrap">
            <span className="text-sm font-medium">
              Professional Printing for Your Brand
            </span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading business printing options...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', overflowX: 'hidden' }}>
      <Navbar />
      <BackButton label="Back" className="mb-6" />
      
      <div className="bg-black text-white py-2 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap">
          <span className="text-sm font-medium">
            Professional Printing for Your Brand
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div 
          className="rounded-3xl p-8 mb-8 relative overflow-hidden"
          style={{ backgroundColor: '#a8c8c8' }}
        >
          <div className="relative z-10">
            <p className="text-sm text-gray-700 mb-2">PROFESSIONAL PRINTING</p>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Professional Printing
            </h1>
            <h2 className="text-4xl font-bold text-gray-600 mb-4">
              for Your Brand
            </h2>
            <p className="text-gray-700 mb-6 max-w-md">
              High-quality, professional and premium business stationery 
              dedicated to your brand with industry-leading turnaround.
            </p>
            <div className="flex gap-4">
              <button
                className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition"
                onClick={() => navigate('/product-list?type=business')}
              >
                Explore Products
              </button>
              <button
                className="border border-gray-400 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition"
                onClick={() => navigate('/product-list?type=business')}
              >
                View Samples
              </button>
            </div>
          </div>
        </div>

        {businessTypes.length > 0 && (
          <div className="mb-8 overflow-x-auto">
            <div className="flex min-w-max items-center gap-8 border-b border-gray-200">
              <button
                className={`pb-3 text-base font-medium transition-colors ${
                  activeFilter === 'All Products'
                    ? 'border-b-2 border-gray-900 text-gray-900'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                onClick={() => setActiveFilter('All Products')}
              >
                All Products
              </button>
              {businessTypes.map((type) => (
                <button
                  key={type.id}
                  className={`pb-3 text-base font-medium transition-colors ${
                    activeFilter === type.name
                      ? 'border-b-2 border-gray-900 text-gray-900'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                  onClick={() => setActiveFilter(type.name)}
                >
                  {type.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {filteredBusinessTypes.length > 0 ? (
            filteredBusinessTypes.map((type) => {
              const discountInfo = calculateDiscountInfo(type as any);
              const priceDisplay = formatPriceDisplay(discountInfo);
              const dealCountdown = getDealCountdown(type as any);
              
              return (
              <div
                key={type.id}
                className="bg-white rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 relative"
                onClick={() => handleCategoryClick(type)}
              >
                {hasCategoryImage(type) && (
                  <div className="relative h-48 bg-gray-100">
                    {discountInfo.badgeText && (
                      <div className={getDiscountBadgeClasses(discountInfo.badgeColor)}>
                        {discountInfo.badgeText}
                      </div>
                    )}
                    
                    <img
                      src={type.thumbnail || type.image || ''}
                      alt={type.name}
                      className="h-full w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}

                <div className="p-6">
                  {getBestSellerBadge(type) && (
                    <div className="mb-3">
                      <span className="bg-black text-white text-xs font-medium px-3 py-1 rounded-full">
                        BEST SELLER
                      </span>
                    </div>
                  )}

                  <h3 className="font-bold text-gray-900 text-lg mb-2">
                    {type.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                    {type.description}
                  </p>

                  {dealCountdown && (
                    <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600 font-medium text-center">
                        {dealCountdown}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      {discountInfo.hasDiscount ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-sm">
                              {priceDisplay.currentPrice}
                            </span>
                            {priceDisplay.showStrikethrough && priceDisplay.originalPrice && (
                              <span className="text-xs line-through text-gray-400">
                                {priceDisplay.originalPrice}
                              </span>
                            )}
                            <span className="text-xs font-medium text-green-600">
                              ({discountInfo.discountPct}% off)
                            </span>
                          </div>
                          {priceDisplay.formattedSavings && (
                            <p className="text-xs text-green-600 font-medium">
                              {priceDisplay.formattedSavings}
                            </p>
                          )}
                        </div>
                      ) : getStartingPrice(type) ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>Starting from</span>
                          <span className="font-bold text-gray-900">
                            {getStartingPrice(type)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">View category</span>
                      )}
                    </div>

                    <button 
                      className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCategoryClick(type);
                      }}
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Categories Available</h3>
                <p className="text-gray-500 mb-4">Business printing categories are not available at the moment.</p>
                <button 
                  onClick={fetchBusinessTypes}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-teal-600 rounded-2xl p-8 text-center text-white">
          <h2 className="text-xl font-bold mb-2">
            Want to give bulk order ?
          </h2>
          <p className="text-teal-100 mb-6">
            Get bulk pricing customized that best fit your business for best value pricing.
          </p>
          <div className="flex justify-center gap-4">
            <button className="bg-black text-white font-semibold px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors">
              Get Bulk Pricing
            </button>
            <button className="border border-white text-white font-semibold px-6 py-3 rounded-lg hover:bg-white hover:text-teal-600 transition-colors">
              Contact Sales
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BusinessPrintingPage;
