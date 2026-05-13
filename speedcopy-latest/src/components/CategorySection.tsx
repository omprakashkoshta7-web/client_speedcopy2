import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PrintTypeModal from './PrintTypeModal';

const categories = [
  { title: 'Printing', subtitle: 'Documents, Flyers & Business Cards', bg: 'linear-gradient(180deg, #3d9da8 0%, #2d8a94 100%)', route: null },
  { title: 'Gifting', subtitle: 'Mugs, shirts & custom gifts', bg: 'linear-gradient(180deg, #f8a0b8 0%, #f07090 100%)', route: '/gifting' },
  { title: 'Shopping', subtitle: 'Business cards & office supplies', bg: 'linear-gradient(180deg, #e040a0 0%, #c0208a 100%)', route: '/shopping' },
];

const illustrations = [
  () => <img src="/ChatGPT Image Apr 16, 2026, 12_11_13 AM.png" alt="Printing" style={{ width: '100%', height: '190px', objectFit: 'contain', objectPosition: 'center bottom' }} />,
  () => <img src="/ChatGPT Image Apr 16, 2026, 12_19_13 AM.png" alt="Gifting" style={{ width: '100%', height: '190px', objectFit: 'contain', objectPosition: 'center bottom' }} />,
  () => <img src="/ChatGPT Image Apr 16, 2026, 12_18_03 AM.png" alt="Shopping" style={{ width: '100%', height: '190px', objectFit: 'contain', objectPosition: 'center bottom' }} />,
];

const CategorySection: React.FC = () => {
  const navigate = useNavigate();
  const [showPrintModal, setShowPrintModal] = useState(false);

  const handleClick = (cat: typeof categories[0]) => {
    if (cat.title === 'Printing') setShowPrintModal(true);
    else if (cat.route) navigate(cat.route);
  };

  return (
    <>
      <section className="py-6 px-4" style={{ backgroundColor: '#f0f0f0' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-white rounded-3xl px-6 py-8 md:px-10 md:py-10" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            <div className="text-center mb-8">
              <h2 className="font-bold text-gray-900 mb-2 text-2xl md:text-3xl">What do you want to create?</h2>
              <p className="text-sm md:text-base" style={{ color: '#9ca3af' }}>Select a category to get started with your order.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4" style={{ paddingTop: '48px' }}>
              {categories.map((cat, i) => {
                const Illustration = illustrations[i];
                return (
                  <div
                    key={cat.title}
                    onClick={() => handleClick(cat)}
                    className="relative rounded-2xl cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                    style={{ background: cat.bg, minHeight: '180px', paddingTop: '100px' }}
                  >
                    {/* Illustration — overlaps top of card */}
                    <div className="absolute left-0 right-0 flex items-end justify-center"
                      style={{ top: '-40px', height: '180px', pointerEvents: 'none' }}>
                      <Illustration />
                    </div>
                    {/* Text bottom */}
                    <div className="text-center pb-5 px-4 pt-2">
                      <h3 className="text-white font-bold text-xl">{cat.title}</h3>
                      <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.9)' }}>{cat.subtitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
      {showPrintModal && <PrintTypeModal onClose={() => setShowPrintModal(false)} />}
    </>
  );
};


export default CategorySection;
