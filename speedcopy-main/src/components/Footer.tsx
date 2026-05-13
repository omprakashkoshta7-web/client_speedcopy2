import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const productLinks: Record<string, string> = {
    'Pricing': '/service-package',
    'Locations': '/pickup-location',
    'Print Drivers': '/help',
    'API for Developers': '/help',
  };

  const companyLinks: Record<string, string> = {
    'About Us': '/help',
    'Careers': '/help',
    'Blog': '/help',
    'Legal': '/help',
    "FAQ's": '/help',
  };

  return (
    <footer className="pt-14 pb-8 px-4" style={{ backgroundColor: '#f0f0f0', borderTop: '1px solid #e5e7eb' }}>
      <div className="max-w-7xl mx-auto">
        <div className="rounded-2xl p-8" style={{ backgroundColor: '#f7f8fa', border: '1px solid #e5e7eb' }}>
        <div className="grid grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-1.5 mb-4">
              <img
                src="/ChatGPT Image Apr 16, 2026, 03_06_38 PM.png"
                alt="speedcopy logo"
                className="h-7 w-auto"
                style={{ objectFit: 'contain' }}
              />
            </div>
            <p className="text-base leading-relaxed mb-5" style={{ color: '#6b7280' }}>
              The fastest way to print your documents online. Delivered to your doorstep with care and precision.
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-2.5">
              {/* Google Play - colorful */}
              <div className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition" style={{ backgroundColor: '#f3f4f6' }}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M3 20.5v-17c0-.83 1-1.3 1.7-.8l14 8.5c.7.4.7 1.5 0 1.9l-14 8.5c-.7.5-1.7.03-1.7-.8z" fill="#4CAF50"/>
                  <path d="M3 3.5l9.5 9.5L3 22.5" fill="#2196F3" opacity="0.8"/>
                  <path d="M3 3.5l9.5 9.5-6 6" fill="#F44336" opacity="0.8"/>
                  <path d="M12.5 13l4 4-9.5-13.5" fill="#FFEB3B" opacity="0.9"/>
                </svg>
              </div>
              {/* App Store */}
              <div className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition" style={{ backgroundColor: '#f3f4f6' }}>
                <svg className="w-4 h-4" style={{ color: '#374151' }} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
              </div>
              {/* Instagram */}
              <div className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition" style={{ backgroundColor: '#f3f4f6' }}>
                <svg className="w-4 h-4" style={{ color: '#374151' }} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-5 text-base">Product</h4>
            <ul className="space-y-3">
              {Object.entries(productLinks).map(([item, path]) => (
                <li key={item}>
                  <button onClick={() => navigate(path)} className="text-base hover:text-gray-800 transition text-left" style={{ color: '#6b7280' }}>{item}</button>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-5 text-base">Company</h4>
            <ul className="space-y-3">
              {Object.entries(companyLinks).map(([item, path]) => (
                <li key={item}>
                  <button onClick={() => navigate(path)} className="text-base hover:text-gray-800 transition text-left" style={{ color: '#6b7280' }}>{item}</button>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2 text-base">Stay in the loop</h4>
            <p className="text-base mb-5" style={{ color: '#6b7280' }}>
              Subscribe to our newsletter for tips and exclusive deals.
            </p>
            <div className="flex items-center gap-0 bg-white rounded-full border border-gray-200 overflow-hidden pr-1 pl-4 py-1">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                className="flex-1 text-base focus:outline-none bg-transparent"
                style={{ color: '#374151' }}
              />
              <button
                className="w-9 h-9 text-white rounded-full flex items-center justify-center flex-shrink-0 hover:bg-gray-700 transition"
                style={{ backgroundColor: '#111111' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex items-center justify-between" style={{ borderTop: '1px solid #f3f4f6' }}>
          <p style={{ color: '#9ca3af', fontSize: '13px' }}>© 2023 SpeedCopy Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/help')} className="hover:text-gray-600 transition" style={{ color: '#9ca3af', fontSize: '13px' }}>Privacy Policy</button>
            <button onClick={() => navigate('/help')} className="hover:text-gray-600 transition" style={{ color: '#9ca3af', fontSize: '13px' }}>Terms of Service</button>
          </div>
        </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

