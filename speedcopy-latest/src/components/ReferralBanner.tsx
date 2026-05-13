import React from 'react';
import { useNavigate } from 'react-router-dom';

const ReferralBanner: React.FC = () => {
  const navigate = useNavigate();
  return (
  <section className="py-6 px-4" style={{ backgroundColor: '#f0f0f0' }}>
    <div className="max-w-7xl mx-auto px-6">
      <div className="rounded-2xl px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{ background: 'linear-gradient(to right, #f97316, #f43f5e)' }}>
        <div>
          <h3 className="text-white text-lg font-bold mb-0.5">Give ₹10, Get ₹10</h3>
          <p className="text-white/80 text-sm">Invite friends to SpeedCopy. They get a discount, you get credit.</p>
        </div>
        <button onClick={() => navigate('/refer')} className="flex items-center gap-2 px-5 py-2.5 font-semibold rounded-full transition text-sm whitespace-nowrap flex-shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.92)', color: '#1f2937' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Invite Friends
        </button>
      </div>
    </div>
  </section>
  );
};

export default ReferralBanner;
