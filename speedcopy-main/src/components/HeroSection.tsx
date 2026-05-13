import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PrintTypeModal from './PrintTypeModal';

const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const [showPrintModal, setShowPrintModal] = useState(false);
  return (
    <>
    <section style={{ backgroundColor: '#f0f0f0' }} className="py-6 px-4">
      <div className="max-w-7xl mx-auto px-6">
        <div
          className="rounded-3xl px-8 py-10 flex flex-col lg:flex-row items-center justify-between gap-8"
          style={{ backgroundColor: '#f7f7f7' }}
        >
          {/* Left Content */}
          <div className="flex-1 max-w-lg">
            <p className="text-xs font-bold tracking-[0.2em] uppercase mb-4" style={{ color: '#111111' }}>
              FAST • TRANSPARENT • DELIVERED
            </p>
            <h1 className="font-bold text-gray-900 leading-tight mb-1" style={{ fontSize: '52px' }}>
              Print Smarter.
            </h1>
            <h1 className="font-bold leading-tight mb-5" style={{ fontSize: '52px', color: '#9ca3af' }}>
              Delivered Faster.
            </h1>
            <p className="text-gray-600 text-base leading-7 mb-6">
              The on-demand printing service that saves you time.
              Upload, customize, and get high-quality prints delivered
              to your door in 24 hours.
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 mb-5">
              <button
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 text-white font-bold rounded-full hover:bg-gray-700 transition text-sm"
                style={{ backgroundColor: '#111111' }}
                onClick={() => setShowPrintModal(true)}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M6 14h12v8H6z" />
                </svg>
                Start Printing
              </button>
              <button onClick={() => navigate('/shopping')} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 text-gray-800 font-semibold border border-gray-300 rounded-full hover:bg-gray-100 transition text-sm bg-white">
                Explore Services
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-xs font-semibold" style={{ color: '#16a34a' }}>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                No Hidden Fees
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Next Day Delivery
              </span>
            </div>
          </div>

          {/* Right - Upload Card + Badge */}
          <div className="flex-shrink-0 w-full lg:w-auto relative lg:pl-40 pl-0">
            {/* Status badge - absolute left, vertically centered */}
            <div
              className="hidden lg:flex absolute bg-white rounded-2xl items-center gap-3 z-10"
              style={{
                left: '50px',
                top: '65%',
                transform: 'translateY(0%)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.10)',
                padding: '10px 16px 10px 10px',
                minWidth: '170px',
              }}
            >
              <div className="rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#dcfce7', width: '36px', height: '36px' }}>
                <svg width="18" height="18" style={{ color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
              </div>
              <div>
                <p className="font-semibold uppercase tracking-widest mb-0.5" style={{ fontSize: '9px', color: '#9ca3af', letterSpacing: '0.12em' }}>STATUS</p>
                <p className="font-bold text-gray-900" style={{ fontSize: '13px' }}>Out for Delivery</p>
              </div>
            </div>

            {/* Upload Card */}
            <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100" style={{ width: '300px' }}>
              <div className="space-y-2 mb-4">
                <div className="h-2.5 rounded-full w-3/4" style={{ backgroundColor: '#e5e7eb' }}></div>
                <div className="h-2.5 rounded-full w-1/2" style={{ backgroundColor: '#e5e7eb' }}></div>
                <div className="h-2.5 rounded-full w-2/3" style={{ backgroundColor: '#e5e7eb' }}></div>
              </div>
              <div
                className="flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed"
                style={{ borderColor: '#d1d5db', backgroundColor: '#f9fafb' }}
              >
                <svg className="w-9 h-9 mb-2" style={{ color: '#9ca3af' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-xs mb-3" style={{ color: '#9ca3af' }}>Drop files to print</p>
                <button className="px-5 py-1.5 text-white text-xs font-semibold rounded-full hover:bg-gray-700 transition" style={{ backgroundColor: '#111111' }}>
                  Browse Files
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    {showPrintModal && <PrintTypeModal onClose={() => setShowPrintModal(false)} />}
  </>
  );
};

export default HeroSection;
