import React from 'react';

const reviews = [
  { stars: 5, text: '"Amazing quality and fast delivery! The custom mug I ordered for my sister\'s birthday was perfect. Highly recommend SpeedCopy!"', name: 'Sarah Jenkins' },
  { stars: 5, text: '"I was skeptical about ordering personalized items online, but the print quality on the t-shirt is outstanding. Will order again!"', name: 'Michael Chen' },
  { stars: 5, text: '"The photo frame arrived well-packaged and looks even better in person. Great customer service team helped me with the design."', name: 'Emily Rodriguez' },
];

const Stars: React.FC<{ count: number }> = ({ count }) => (
  <div className="flex gap-0.5 mb-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <svg key={i} className="w-4 h-4" style={{ color: i < count ? '#f59e0b' : '#e5e7eb' }} fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
);

const TestimonialsSection: React.FC = () => (
  <section className="py-10 px-4" style={{ backgroundColor: '#f0f0f0' }}>
    <div className="max-w-7xl mx-auto px-6">
      <h2 className="font-bold text-gray-900 text-center mb-8 text-2xl md:text-3xl">What Our Customers Are Saying</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
        {reviews.map((review, i) => {
          const isMid = i === 1;
          return (
            <div
              key={review.name}
              className="bg-white rounded-2xl flex flex-col"
              style={{
                padding: isMid ? '28px' : '20px',
                boxShadow: isMid ? '0 8px 24px rgba(0,0,0,0.12)' : '0 1px 6px rgba(0,0,0,0.06)',
                border: isMid ? '1px solid #e5e7eb' : '1px solid #f3f4f6',
                transform: isMid ? 'scale(1.06)' : 'scale(1)',
                position: 'relative',
                zIndex: isMid ? 1 : 0,
              }}
            >
              <Stars count={review.stars} />
              <p className="leading-relaxed mb-5 flex-1" style={{ color: '#374151', fontSize: isMid ? '15px' : '14px' }}>{review.text}</p>
              <div className="flex items-center justify-between mt-auto">
                <span className="font-semibold text-gray-900" style={{ fontSize: isMid ? '15px' : '14px' }}>{review.name}</span>
                <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#16a34a' }}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Verified Buyer
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
