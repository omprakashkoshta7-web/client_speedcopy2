import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MarqueeBanner from '../components/MarqueeBanner';
import Footer from '../components/Footer';
import productService from '../services/product.service';

const LetterheadsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [letterheads, setLetterheads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLetterheads();
  }, []);

  const fetchLetterheads = async () => {
    try {
      setLoading(true);
      const response = await productService.getBusinessProducts({ category: 'letterheads', limit: 12 });
      setLetterheads(response.data.products || []);
    } catch (err) {
      console.error('Failed to fetch letterheads:', err);
      setLetterheads([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="animate-pulse">
            <div className="bg-white rounded-2xl h-96" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <Navbar />
      <MarqueeBanner />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => navigate('/business-printing')}
            className="flex items-center gap-2 text-sm font-semibold mb-4 hover:text-blue-600 transition"
            style={{ color: '#6b7280' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Business Printing
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Letterheads</h1>
          <p className="text-gray-600">Professional corporate stationery for official documents</p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {letterheads.map((product, index) => (
            <div
              key={product._id || index}
              className="bg-white rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
              onClick={() => navigate('/print-config')}
            >
              {/* Colored image area */}
              <div
                className="relative flex items-center justify-center"
                style={{ height: '200px', backgroundColor: product.bg || '#b8c9d4' }}
              >
                <div className="flex items-center justify-center w-full h-full px-8">
                  <div className="bg-white rounded-xl shadow-md w-full max-w-[160px] h-[200px] p-4 flex flex-col gap-2">
                    <div className="h-3 rounded-full bg-gray-200 w-2/3" />
                    <div className="h-1 rounded-full bg-gray-100 w-1/2" />
                    <div className="flex-1 mt-4" />
                    <div className="h-1 rounded-full bg-gray-100 w-full" />
                    <div className="h-1 rounded-full bg-gray-100 w-5/6" />
                    <div className="h-1 rounded-full bg-gray-100 w-4/6" />
                    <div className="mt-2 h-1 rounded-full bg-gray-100 w-3/4" />
                  </div>
                </div>
                {product.badge && (
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-white text-xs font-bold tracking-widest"
                    style={{ backgroundColor: '#111111' }}>
                    {product.badge}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="px-5 pt-4 pb-5">
                <h3 className="font-bold text-gray-900 mb-1.5" style={{ fontSize: '17px' }}>{product.name}</h3>
                <p className="text-sm leading-relaxed mb-5" style={{ color: '#6b7280' }}>{product.desc || product.description}</p>
                <div className="flex items-end justify-between">
                  <div>
                    {product.oldPrice && (
                      <p className="line-through text-xs mb-0.5" style={{ color: '#9ca3af' }}>{product.oldPrice}</p>
                    )}
                    <p className="font-bold text-gray-900" style={{ fontSize: '17px' }}>
                      Starting from {product.price || `₹${product.basePrice}`}
                    </p>
                  </div>
                  <button
                    className="w-9 h-9 rounded-full flex items-center justify-center transition hover:bg-gray-200"
                    style={{ backgroundColor: '#f3f4f6' }}
                    onClick={e => { e.stopPropagation(); navigate('/print-config'); }}
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default LetterheadsListPage;