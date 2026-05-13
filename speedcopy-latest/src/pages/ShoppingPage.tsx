import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MarqueeBanner from '../components/MarqueeBanner';
import Footer from '../components/Footer';
import GetQuoteModal from '../components/GetQuoteModal';
import productService from '../services/product.service';
import giftingService from '../services/gifting.service';

const features = [
  {
    label: 'Premium Quality',
    desc: 'Handpicked materials for lasting durability',
    color: '#fef3c7',
    iconColor: '#f59e0b',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Fast Delivery',
    desc: 'Same-day dispatch on all orders',
    color: '#dbeafe',
    iconColor: '#3b82f6',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    label: 'Eco-Friendly',
    desc: 'Sustainable and recyclable materials',
    color: '#d1fae5',
    iconColor: '#10b981',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: 'Easy Returns',
    desc: '30-day hassle-free return policy',
    color: '#fce7f3',
    iconColor: '#ec4899',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
];

const ShoppingPage: React.FC = () => {
  const [timer, setTimer] = useState({ h: 5, m: 42, s: 18 });
  const [email, setEmail] = useState('');
  const [showQuote, setShowQuote] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
    
    const interval = setInterval(() => {
      // Simple countdown timer
      setTimer((t) => {
        if (t.s > 0) return { ...t, s: t.s - 1 };
        if (t.m > 0) return { ...t, m: t.m - 1, s: 59 };
        if (t.h > 0) return { h: t.h - 1, m: 59, s: 59 };
        return t;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const [shoppingCatRes, giftingRes] = await Promise.all([
        productService.getShoppingCategories(),
        giftingService.listProducts({ limit: 4 })
      ]);
      console.log('Shopping categories response:', shoppingCatRes);
      console.log('Shopping categories data:', shoppingCatRes.data);
      
      // Handle both array and object responses
      const categoriesData = Array.isArray(shoppingCatRes) ? shoppingCatRes : (shoppingCatRes.data || []);
      setCategories(categoriesData);
      setTrendingProducts(giftingRes.data.products || []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <Navbar />
      <MarqueeBanner />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="bg-white rounded-3xl overflow-hidden flex flex-col md:flex-row items-stretch" style={{ minHeight: '480px' }}>
          <div className="flex-1 p-8 md:p-10 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 self-start" style={{ backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }}>
              <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-bold text-gray-500 tracking-widest uppercase">Premium Quality</span>
            </div>
            <h1 className="font-bold text-gray-900 leading-tight mb-3" style={{ fontSize: '40px' }}>
              Premium Stationery for
              <br />
              <span style={{ color: '#ec4899' }}>Home &amp; Office</span>
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-sm">
              Elevate your workspace with our curated collection of minimalist designs and high-quality materials. Designed for modern professionals.
            </p>
            <button onClick={() => navigate('/shopping')} className="self-start px-6 py-3 text-white font-bold rounded-full hover:bg-gray-700 transition text-sm" style={{ backgroundColor: '#111111' }}>
              Shop Collection
            </button>
            <div className="flex items-center gap-3 mt-6">
              <div className="flex -space-x-2">
                {['#f5a623', '#7ed321', '#4a90e2'].map((c, i) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: c }}>
                    {['A', 'B', 'C'][i]}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg key={i} className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="text-xs text-gray-500 ml-1">Trusted by 10k+ businesses</span>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 w-full md:w-96 relative">
            <img
              src="/Minimalist-desk-with-neutral-accents-optimized.jpg"
              alt="Stationery"
              decoding="async"
              fetchPriority="high"
              className="w-full h-full object-cover"
              style={{ minHeight: '280px', borderRadius: '0 1.5rem 1.5rem 0' }}
            />
            <div className="absolute bottom-4 left-4 bg-white rounded-xl flex items-center gap-2 px-3 py-2" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
              <span className="text-xs font-semibold text-gray-700">Free Shipping</span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-gray-900 text-xl">Shop by Category</h2>
              <p className="text-sm text-gray-500">Find exactly what you need for your workflow.</p>
            </div>
            <button className="text-sm font-semibold text-gray-700 hover:opacity-70">View All Categories →</button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                  <div className="h-56 bg-gray-200" />
                  <div className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                  </div>
                </div>
              ))
            ) : (
              categories.map((cat: any) => {
                const imageUrl = cat.image;
                const price = cat.starting_from || 'N/A';
                return (
                  <div key={cat._id} onClick={() => navigate(`/products?flow=shopping&category=${encodeURIComponent(cat.name)}`)} className="bg-white rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition" style={{ border: '1px solid #f3f4f6' }}>
                    <div className="relative" style={{ height: '220px', backgroundColor: '#f5e6d3' }}>
                      {imageUrl ? (
                        <img src={imageUrl} alt={cat.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">No image</div>
                      )}
                    </div>
                    <div className="p-4 bg-white">
                      <p className="font-bold text-gray-900 text-sm mb-1">{cat.name}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-gray-400">Starting from</span>
                        <span className="font-bold text-gray-900 text-sm">₹{price}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div
          className="relative overflow-hidden rounded-[20px]"
          style={{
            background: 'linear-gradient(135deg, #1b1120 0%, #21102a 48%, #361252 100%)',
            minHeight: '336px',
          }}
        >
          <div
            className="absolute inset-y-0 left-[58%] hidden md:block"
            style={{
              width: '170px',
              background: 'linear-gradient(180deg, rgba(116, 54, 181, 0.22), rgba(96, 39, 160, 0.28))',
              transform: 'skewX(-10deg)',
            }}
          />

          <div className="relative z-10 flex flex-col md:flex-row items-stretch h-full">
            <div className="flex-1 px-7 py-8 lg:px-8 flex flex-col justify-center">
              <div className="inline-flex items-center px-3 py-1.5 rounded-md mb-5 self-start text-white text-[10px] font-extrabold tracking-wide" style={{ backgroundColor: '#ff5a4f' }}>
                LIMITED TIME OFFER
              </div>
              <h2 className="text-white font-medium mb-4 leading-tight" style={{ fontSize: 'clamp(24px, 3vw, 34px)' }}>
                Deal of the Day:
                <br />
                Premium Leather Planners
              </h2>
              <p className="text-white/70 mb-6 max-w-md" style={{ fontSize: '15px', lineHeight: '1.55' }}>
                Handcrafted from Italian full-grain leather. The perfect companion for your daily productivity.
              </p>

              <div className="flex items-center gap-4 mb-6">
                {[['HOURS', timer.h], ['MINS', timer.m], ['SECS', timer.s]].map(([label, value]) => (
                  <div key={label as string} className="text-center">
                    <div className="w-[42px] h-[48px] rounded-2xl flex flex-col items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                      <span className="text-white font-bold text-[22px] leading-none">{pad(value as number)}</span>
                      <span className="text-[8px] uppercase tracking-wide text-white/45 mt-1">{label}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 flex-wrap">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-white text-[20px] md:text-[22px]">₹45.00</span>
                  <span className="line-through text-white/35 text-base">₹85.00</span>
                  <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full font-bold">
                    47% OFF
                  </span>
                </div>
                <button onClick={() => navigate('/checkout')} className="w-full sm:w-auto px-7 py-3 text-white font-bold rounded-full text-sm hover:bg-neutral-900 transition" style={{ backgroundColor: '#050505' }}>
                  Buy Now
                </button>
              </div>
            </div>

            <div className="w-full md:w-[48%] flex items-center justify-center px-6 pb-7 md:py-6 md:pr-8">
              <div
                className="w-full overflow-hidden"
                style={{
                  maxWidth: '385px',
                  borderRadius: '24px',
                  transform: 'rotate(2deg)',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.18)',
                }}
              >
                <img
                  src="/Organized-workspace-optimized.jpg"
                  alt="Leather Planner"
                  loading="lazy"
                  decoding="async"
                  className="block w-full h-full object-cover"
                  style={{ minHeight: '214px', maxHeight: '214px' }}
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900" style={{ fontSize: '20px' }}>Trending Best Sellers</h2>
            <div className="flex gap-1.5">
              <button className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-200 transition" style={{ backgroundColor: '#f8fafc', border: '1px solid #e5e7eb' }}>
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-200 transition" style={{ backgroundColor: '#f8fafc', border: '1px solid #e5e7eb' }}>
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="rounded-[22px] h-64 bg-gray-200 mb-3" />
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                </div>
              ))
            ) : (
              trendingProducts.map((p: any) => {
                const imageUrl = p.images?.[0] || p.image || p.thumbnail || p.imageUrl;
                const price = p.basePrice || p.price || p.sale_price || p.mrp || p.startingPrice || 'N/A';
                return (
                  <div
                    key={p._id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/product/${p._id}?flow=shopping`)}
                  >
                    <div
                      className="relative overflow-hidden rounded-[22px] mb-3"
                      style={{
                        height: '250px',
                        backgroundColor: '#f5e6d3',
                      }}
                    >
                      {imageUrl ? (
                        <img src={imageUrl} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">No image</div>
                      )}
                    </div>
                    <p className="font-bold text-gray-900 text-sm mb-1 leading-snug">{p.name}</p>
                    <p className="text-xs text-gray-400 mb-1.5">{p.description || p.desc}</p>
                    <p className="font-bold text-gray-900 text-[15px]">₹{price}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="py-4">
          <h2 className="font-bold text-gray-900 text-xl text-center mb-1">Why Choose SpeedCopy?</h2>
          <p className="text-sm text-gray-400 text-center mb-8">The standard for modern stationery.</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.label} className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: f.color, color: f.iconColor }}>
                  {f.icon}
                </div>
                <p className="font-bold text-gray-900 text-sm mb-1">{f.label}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl px-10 py-7 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #ff6b35 0%, #f43f5e 50%, #ec4899 100%)' }}>
          {/* decorative circles */}
          <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full opacity-10" style={{ backgroundColor: '#fff' }} />
          <div className="absolute -bottom-10 left-32 w-24 h-24 rounded-full opacity-10" style={{ backgroundColor: '#fff' }} />
          <div>
            <p className="text-white/80 text-xs font-bold tracking-widest uppercase mb-1">Referral Program</p>
            <h3 className="font-bold text-white mb-1" style={{ fontSize: '22px' }}>Give ₹10, Get ₹10</h3>
            <p className="text-white/80 text-sm">Invite friends to SpeedCopy. They get a discount, you get credit.</p>
          </div>
          <button onClick={() => navigate('/refer')} className="flex items-center gap-2.5 px-7 py-3 bg-white font-bold rounded-full text-sm hover:bg-gray-50 transition flex-shrink-0" style={{ color: '#111', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Invite Friends
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pink bulk order card — replacing Corporate Packs */}
          <div className="rounded-2xl px-7 py-7 flex flex-col justify-center" style={{ backgroundColor: '#1f2937', minHeight: '220px' }}>
            <h3 className="font-bold text-white text-xl mb-2">Want to give bulk order?</h3>
            <p className="text-white/80 text-sm leading-relaxed mb-5">Join over 10,000 businesses that trust SpeedCopy for their high-end printing needs.</p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
            <button onClick={() => navigate('/business-printing')} className="w-full sm:w-auto px-5 py-3 text-white font-bold rounded-full text-sm hover:opacity-90 transition" style={{ backgroundColor: '#111111' }}>Get Started Now</button>
            <button onClick={() => navigate('/contact-sales')} className="w-full sm:w-auto px-5 py-3 font-semibold rounded-full text-sm hover:bg-white/20 transition" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>Contact Sales</button>
          </div>
          </div>

          <div className="rounded-2xl p-7 flex flex-col justify-center items-center text-center" style={{ backgroundColor: '#e5e7eb', minHeight: '220px' }}>
            <div className="inline-flex items-center px-3 py-1 rounded-full mb-4 text-xs font-semibold text-gray-600" style={{ backgroundColor: '#fff', border: '1px solid #d1d5db' }}>
              Just Landed
            </div>
            <h3 className="font-bold text-gray-900 text-2xl mb-2">New Arrivals</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-5 max-w-xs">Be the first to explore our latest eco-friendly paper collection and limited edition ink sets.</p>
            <button onClick={() => navigate('/product-list')} className="px-6 py-3 text-white font-bold rounded-full text-sm hover:bg-gray-700 transition" style={{ backgroundColor: '#111111' }}>
              Explore New In
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-10 flex flex-col items-center text-center" style={{ border: '1px solid #f3f4f6' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#f3f4f6' }}>
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="font-bold text-gray-900 text-2xl mb-2">Join the SpeedCopy Community</h2>
          <p className="text-gray-400 text-sm mb-6">Subscribe for exclusive offers, design tips, and 10% off your first order.</p>
          <div className="flex items-center gap-0 rounded-full border border-gray-200 overflow-hidden pr-1 pl-4 py-1 w-full max-w-sm">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="flex-1 text-sm focus:outline-none bg-transparent text-gray-700"
            />
            <button className="px-5 py-2 text-white font-bold rounded-full text-sm hover:bg-gray-700 transition" style={{ backgroundColor: '#111111' }}>
              Subscribe
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3">We respect your privacy. Unsubscribe at any time.</p>
        </div>
      </div>

      <Footer />
      {showQuote && <GetQuoteModal onClose={() => setShowQuote(false)} />}
    </div>
  );
};

export default ShoppingPage;
