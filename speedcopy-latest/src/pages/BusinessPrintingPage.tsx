import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BackButton from '../components/BackButton';
import Footer from '../components/Footer';
import API_CONFIG from '../config/api.config';

interface BusinessPrintType {
  id: string;
  name: string;
  description: string;
  route: string;
  cta_text: string;
  base_price?: number;
  starting_price?: number;
  is_featured?: boolean;
  thumbnail?: string;
  image?: string;
  product_count?: number;
}

const BusinessPrintingPage: React.FC = () => {
  const [businessTypes, setBusinessTypes] = useState<BusinessPrintType[]>([]);
  const [activeFilter, setActiveFilter] = useState('All Products');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBusinessTypes();
  }, []);

  const fetchBusinessTypes = async () => {
    try {
      setLoading(true);

      // Use dedicated product service URL (gateway doesn't have this route)
      const PRODUCT_BASE = import.meta.env.VITE_PRODUCT_URL || API_CONFIG.BASE_URL;

      const endpoints = [
        `${PRODUCT_BASE}/api/products/categories?showAll=true`,
        `${PRODUCT_BASE}/api/products/categories`,
        `${API_CONFIG.BASE_URL}/api/products/categories?showAll=true`,
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

      // Normalise response shape — handle {data: []}, {categories: []}, or plain []
      const raw: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data.data)
        ? data.data
        : Array.isArray(data.categories)
        ? data.categories
        : [];

      // Filter only printing/business categories that are active
      const allCategories = raw.filter((cat: any) => {
        if (cat.isActive === false) return false;
        // If flowType exists, only show printing ones; otherwise show all
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
        is_featured: Boolean(cat.is_featured),
        thumbnail: cat.image,
        image: cat.image,
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

  const handleCategoryClick = (type: BusinessPrintType) => {
    navigate(type.route);
  };

  const getStartingPrice = (type: BusinessPrintType) => {
    if (type.base_price) {
      return `₹${type.base_price}`;
    }
    if (type.starting_price) {
      return `₹${type.starting_price}`;
    }

    return null;
  };

  const getBestSellerBadge = (type: BusinessPrintType) => {
    return type.is_featured;
  };

  const hasCategoryImage = (type: BusinessPrintType) => Boolean(type.thumbnail || type.image);
  const filteredBusinessTypes = activeFilter === 'All Products'
    ? businessTypes
    : businessTypes.filter((type) => type.name === activeFilter);

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', overflowX: 'hidden' }}>
        <Navbar />
        
        {/* Marquee Banner - Below Navbar */}
        <div className="bg-black text-white py-2 overflow-hidden">
          <div className="animate-marquee whitespace-nowrap">
            <span className="text-sm font-medium">
              🔥 FLASH SALE: 20% OFF on all Custom Mugs! Use code: GIFT20 | New arrivals in Personalized Stationery are now live! ⭐ FLASH SALE: 20% OFF on all Custom Mugs! Use code: GIFT20 | New arrivals in Personalized Stationery are now live! 🔥 FLASH SALE: 20% OFF on all Custom Mugs! Use code: GIFT20 | New arrivals in Personalized Stationery are now live! ⭐
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
      
      {/* Marquee Banner - Below Navbar */}
      <div className="bg-black text-white py-2 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap">
          <span className="text-sm font-medium">
            🔥 FLASH SALE: 20% OFF on all Custom Mugs! Use code: GIFT20 | New arrivals in Personalized Stationery are now live! ⭐ FLASH SALE: 20% OFF on all Custom Mugs! Use code: GIFT20 | New arrivals in Personalized Stationery are now live! 🔥 FLASH SALE: 20% OFF on all Custom Mugs! Use code: GIFT20 | New arrivals in Personalized Stationery are now live! ⭐
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Hero Banner */}
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

        {/* Category Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {filteredBusinessTypes.length > 0 ? (
            filteredBusinessTypes.map((type) => (
              <div
                key={type.id}
                className="bg-white rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300"
                onClick={() => handleCategoryClick(type)}
              >
                {hasCategoryImage(type) && (
                  <div className="relative h-48 bg-gray-100">
                    <img
                      src={type.thumbnail || type.image}
                      alt={type.name}
                      className="h-full w-full object-cover"
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

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      {getStartingPrice(type) ? (
                        <>
                          <span>Starting from</span>
                          <span className="font-bold text-gray-900">
                            {getStartingPrice(type)}
                          </span>
                        </>
                      ) : (
                        <span>View category</span>
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
            ))
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

        {/* Bottom CTA Section */}
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
