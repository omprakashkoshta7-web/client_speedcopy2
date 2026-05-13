import React from 'react';
import { useNavigate } from 'react-router-dom';

const PromoBanners: React.FC = () => {
  const navigate = useNavigate();

  return (
  <section className="py-6 px-4" style={{ backgroundColor: '#f0f0f0' }}>
    <div className="max-w-7xl mx-auto px-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative rounded-2xl overflow-hidden cursor-pointer" style={{ height: '260px' }} onClick={() => navigate('/shopping')}>
          <img src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80" alt="Cake" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.05) 100%)' }} />
          <div className="absolute bottom-0 left-0 p-6 z-10">
            <h2 className="text-white font-bold mb-1 text-2xl" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>Delight in Every Slice.</h2>
            <p className="text-white mb-4 text-sm" style={{ opacity: 0.9 }}>Order your dream cake today!</p>
            <button className="px-8 py-2.5 text-white font-bold rounded-full text-sm hover:opacity-90 transition" style={{ backgroundColor: '#be185d' }}>Shop Now</button>
          </div>
        </div>
        <div className="relative rounded-2xl overflow-hidden cursor-pointer" style={{ height: '260px' }} onClick={() => navigate('/gifting')}>
          <img src="https://images.unsplash.com/photo-1512909006721-3d6018887383?w=800&q=80" alt="Gifts" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.05) 100%)' }} />
          <div className="absolute bottom-0 left-0 p-6 z-10">
            <h2 className="text-white font-bold mb-1 text-2xl" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>Discover Perfect Gifts.</h2>
            <button className="mt-3 px-8 py-2.5 text-white font-bold rounded-full text-sm hover:opacity-90 transition" style={{ backgroundColor: '#be185d' }}>Shop Now</button>
          </div>
        </div>
      </div>
    </div>
  </section>
  );
};

export default PromoBanners;
