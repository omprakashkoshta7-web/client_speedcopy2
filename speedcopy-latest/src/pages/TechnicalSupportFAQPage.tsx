import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';


const faqs = [
  {
    q: 'What file formats do you support?',
    a: 'We support PDF, JPG, PNG, SVG, AI, PSD, and DOCX files. For best results, we recommend uploading high-resolution PDF files.',
  },
  {
    q: 'Why is my file upload failing?',
    a: 'File uploads may fail if the file is too large (max 50MB), corrupted, or in an unsupported format. Try compressing your file or converting it to PDF.',
  },
  {
    q: 'How do I use the design editor?',
    a: 'Our design editor allows you to add text, images, and shapes to your designs. Click on any element to edit it, and use the toolbar to customize colors, fonts, and sizes.',
  },
  {
    q: 'Can I save my design and edit it later?',
    a: 'Yes, all your designs are automatically saved to your account. You can access them from the "My Designs" section and continue editing anytime.',
  },
  {
    q: 'What resolution should my images be?',
    a: 'For best print quality, we recommend images at 300 DPI or higher. Lower resolution images may appear pixelated when printed.',
  },
  {
    q: 'The editor is not loading. What should I do?',
    a: 'Try clearing your browser cache, disabling browser extensions, or using a different browser. If the issue persists, contact our technical support team.',
  },
];

const TechnicalSupportFAQPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* Back button */}
        <button onClick={() => navigate('/help')} className="flex items-center gap-2 mb-6 text-sm font-semibold text-gray-600 hover:text-gray-900 transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Help Center
        </button>

        {/* Header */}
        <div className="bg-white rounded-3xl p-8 mb-6" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: '#f3f4f6' }}>
            <svg className="w-7 h-7" style={{ color: '#374151' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="font-bold text-gray-900 mb-2" style={{ fontSize: '32px' }}>Technical Support</h1>
          <p className="text-gray-600 leading-relaxed">Get help with design tools, file uploads, formatting, and technical issues.</p>
        </div>

        {/* FAQs */}
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
              <h3 className="font-bold text-gray-900 mb-3" style={{ fontSize: '16px' }}>{faq.q}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default TechnicalSupportFAQPage;
