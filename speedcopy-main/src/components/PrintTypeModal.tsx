import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface BindingType {
  label: string;
  desc: string;
  icon: React.ReactNode;
}

const bindingTypes: BindingType[] = [
  {
    label: 'Standard\nPrinting',
    desc: 'Perfect for reports & essays',
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    label: 'Soft Binding',
    desc: 'Clean professional look',
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    label: 'Spiral Binding',
    desc: 'Durable & easy to flip',
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4" />
      </svg>
    ),
  },
  {
    label: 'Thesis Binding',
    desc: 'Official university standard',
    icon: (
      <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
      </svg>
    ),
  },
];

interface PrintTypeModalProps {
  onClose: () => void;
}

const PrintTypeModal: React.FC<PrintTypeModalProps> = ({ onClose }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const navigate = useNavigate();

  return (
    <>
      {/* STEP 1 */}
      {step === 1 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(3px)' }}
          onClick={onClose}
        >
          <div
            className="rounded-2xl sm:rounded-3xl overflow-hidden w-full"
            style={{ maxWidth: '700px', backgroundColor: '#eaecf0', padding: '24px 20px', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-end mb-1">
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="text-center mb-6 sm:mb-8">
              <h1 className="font-bold text-gray-900 leading-tight mb-2 text-xl sm:text-3xl">
                What would you like to{' '}
                <span style={{ color: '#2bb5b8' }}>print</span>
                <br />today?
              </h1>
              <p className="text-xs sm:text-sm" style={{ color: '#9ca3af' }}>
                Select a category below to customize your high-quality prints.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Document Printing */}
              <div
                className="bg-white rounded-2xl sm:rounded-3xl p-4 cursor-pointer hover:shadow-lg transition-shadow flex flex-col min-h-[360px]"
                style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}
                onClick={() => setStep(2)}
              >
                <div className="relative mb-4" style={{ height: '170px', borderRadius: '14px', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '14px', overflow: 'hidden' }}>
                    <img
                      src="/Copilot-20260414-131931-optimized.jpg"
                      alt="Document Printing"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                      style={{ borderRadius: '14px' }}
                    />
                  </div>
                  <div className="absolute bottom-3 left-3 w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#3b82f6' }}>
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <h2 className="font-bold text-gray-900 mb-1 px-1 text-sm sm:text-base">Document Printing</h2>
                <p className="text-xs leading-relaxed mb-3 px-1 flex-1" style={{ color: '#6b7280' }}>Resumes, essays, flyers, and personal documents. Perfect for students and home offices.</p>
                <button className="w-full mt-auto flex items-center justify-center gap-2 py-2.5 font-bold rounded-xl text-xs" style={{ backgroundColor: '#f3f4f6', color: '#111111', minHeight: '44px' }}>
                  Start Personal Print
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>

              {/* Business Printing */}
              <div
                className="bg-white rounded-2xl sm:rounded-3xl p-4 cursor-pointer hover:shadow-lg transition-shadow flex flex-col min-h-[360px]"
                style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}
                onClick={() => { onClose(); navigate('/business-printing'); }}
              >
                <div className="relative mb-4" style={{ height: '170px' }}>
                  <img
                    src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80"
                    alt="Business Printing"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                    style={{ borderRadius: '14px' }}
                  />
                  <div className="absolute bottom-3 left-3 w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#3b82f6' }}>
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <h2 className="font-bold text-gray-900 mb-1 px-1 text-sm sm:text-base">Business Printing</h2>
                <p className="text-xs leading-relaxed mb-3 px-1 flex-1" style={{ color: '#6b7280' }}>Marketing materials, bound reports, business cards, and bulk orders. High-volume solutions.</p>
                <button
                  className="w-full mt-auto flex items-center justify-center gap-2 py-2.5 font-bold rounded-xl text-xs"
                  style={{ backgroundColor: '#f3f4f6', color: '#111111', minHeight: '44px' }}
                  onClick={() => { onClose(); navigate('/business-printing'); }}
                >
                  Start Business Print
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <div
            className="rounded-2xl sm:rounded-3xl overflow-hidden w-full"
            style={{ maxWidth: '560px', backgroundColor: '#eaecf0', padding: '20px', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setStep(1)} className="flex items-center gap-2 text-gray-700 text-sm font-semibold hover:opacity-70 transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="text-center mb-5">
              <h2 className="font-bold text-gray-900 text-lg sm:text-xl mb-1">Select Print Type</h2>
              <p className="text-xs sm:text-sm" style={{ color: '#9ca3af' }}>Choose your document binding style</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {bindingTypes.map((pt, idx) => (
                <button
                  key={pt.label}
                  className="flex flex-col items-center justify-center py-7 sm:py-9 px-4 rounded-2xl bg-white hover:bg-gray-50 transition text-center"
                  style={{ border: '1.5px solid #e5e7eb', minHeight: '160px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                  onClick={() => {
                    const types = ['standard', 'soft-binding', 'spiral-binding', 'thesis-binding'];
                    onClose();
                    // Navigate directly to print config - skip address step
                    navigate(`/print-config?type=${types[idx]}`);
                  }}
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center mb-3 sm:mb-4" style={{ backgroundColor: '#f3f4f6' }}>
                    {pt.icon}
                  </div>
                  <p className="font-bold text-gray-900 mb-1 whitespace-pre-line text-sm sm:text-base">{pt.label}</p>
                  <p className="text-xs" style={{ color: '#9ca3af' }}>{pt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PrintTypeModal;
