import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import BackButton from '../components/BackButton';
import Footer from '../components/Footer';
import productService from '../services/product.service';

const PrintTypeModal: React.FC<{ onClose: () => void; printTypes: any[] }> = ({ onClose, printTypes }) => {
  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'document':
        return (
          <svg className="w-7 h-7 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'book':
        return (
          <svg className="w-7 h-7 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case 'spiral':
        return (
          <svg className="w-7 h-7 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M9 3v18" />
          </svg>
        );
      case 'thesis':
      case 'graduation':
        return (
          <svg className="w-7 h-7 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
          </svg>
        );
      default:
        return (
          <svg className="w-7 h-7 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  return (
    /* Full screen — light gray background exactly like the image */
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: '#d9d9d9' }}
    >
      {/* Back button — top left like image */}
      <div className="px-6 pt-6 pb-2">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-gray-700 font-semibold hover:text-gray-900 transition"
          style={{ fontSize: '16px' }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      {/* 2x2 Grid of white cards — centered */}
      <div className="flex-1 flex items-center justify-center px-6 pb-8">
        <div
          className="grid grid-cols-2 gap-5 w-full"
          style={{ maxWidth: '700px' }}
        >
          {printTypes.map((pt: any) => (
            <button
              key={pt.id || pt.label}
              className="flex flex-col items-center justify-center text-center transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '28px',
                padding: '40px 28px 36px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                border: 'none',
                minHeight: '220px',
              }}
              onClick={onClose}
            >
              {/* Icon circle — light gray like image */}
              <div
                className="flex items-center justify-center mb-5"
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  backgroundColor: '#ebebeb',
                }}
              >
                {getIcon(pt.icon)}
              </div>
              {/* Title */}
              <p
                className="font-bold text-gray-900 mb-2"
                style={{ fontSize: '18px', lineHeight: '1.3' }}
              >
                {pt.name || pt.label}
              </p>
              {/* Description */}
              <p
                className="text-sm leading-relaxed"
                style={{ color: '#9ca3af', fontSize: '13px' }}
              >
                {pt.description || pt.desc}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const PrintingPage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [printTypes, setPrintTypes] = useState<any[]>([]);

  const fetchPrintTypes = async () => {
    try {
      const response = await productService.getPrintingDocumentTypes();
      setPrintTypes(response.data || []);
    } catch (err) {
      console.error('Failed to fetch print types:', err);
      // Fallback to hardcoded data if API fails
      setPrintTypes([
        { label: 'Standard Printing', desc: 'Perfect for reports & essays', icon: 'document' },
        { label: 'Soft Binding', desc: 'Clean professional look', icon: 'book' },
        { label: 'Spiral Binding', desc: 'Durable & easy to flip', icon: 'spiral' },
        { label: 'Thesis Binding', desc: 'Official university standard', icon: 'thesis' },
      ]);
    }
  };

  useEffect(() => {
    fetchPrintTypes();
  }, []);

  return (
    <div style={{ backgroundColor: '#eaecf0', minHeight: '100vh' }}>
      <Navbar />
      <BackButton label="Back" className="mb-6" />

      <div className="max-w-7xl mx-auto px-6 py-16">

        {/* Heading */}
        <div className="text-center mb-12">
          <h1 className="font-bold text-gray-900 leading-tight mb-3" style={{ fontSize: '42px' }}>
            What would you like to{' '}
            <span style={{ color: '#2bb5b8' }}>print</span>
            <br />today?
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '15px' }}>
            Select a category below to customize your high-quality prints.
          </p>
        </div>

        {/* Two Cards */}
        <div className="grid grid-cols-2 gap-6 mb-10">

          {/* Document Printing */}
          <div
            className="bg-white rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition"
            style={{ border: '1px solid #f3f4f6' }}
            onClick={() => setShowModal(true)}
          >
            <div className="relative" style={{ height: '220px' }}>
              <img
                src="https://images.unsplash.com/photo-1568667256549-094345857637?w=700&q=80"
                alt="Document Printing"
                decoding="async"
                fetchPriority="high"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-3 w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#3b82f6' }}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="p-4 bg-white">
              <h2 className="font-bold text-gray-900 mb-2" style={{ fontSize: '17px' }}>Document Printing</h2>
              <p className="text-sm leading-relaxed mb-4" style={{ color: '#6b7280' }}>
                Resumes, essays, flyers, and personal documents. Perfect for students and home offices.
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-gray-400">Starting from</span>
                <span className="font-bold text-gray-900 text-sm">₹5.00</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <Footer />

      {showModal && <PrintTypeModal key={Date.now()} onClose={() => setShowModal(false)} printTypes={printTypes} />}
    </div>
  );
};

export default PrintingPage;
