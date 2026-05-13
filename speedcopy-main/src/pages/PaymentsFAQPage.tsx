import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';


const faqs = [
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit cards (Visa, Mastercard, American Express), debit cards, UPI, net banking, and digital wallets like Paytm, PhonePe, and Google Pay.',
  },
  {
    q: 'How do I request a refund?',
    a: 'To request a refund, go to your Orders page, select the order, and click "Request Refund". Refunds are processed within 5-7 business days to your original payment method.',
  },
  {
    q: 'When will I receive my refund?',
    a: 'Refunds are typically processed within 5-7 business days. The time it takes to appear in your account depends on your bank or payment provider.',
  },
  {
    q: 'Can I get an invoice for my order?',
    a: 'Yes, you can download invoices from your Orders page. Click on any order and select "Download Invoice" to get a PDF copy.',
  },
  {
    q: 'Is my payment information secure?',
    a: 'Yes, we use industry-standard encryption and secure payment gateways. We never store your complete card details on our servers.',
  },
  {
    q: 'Can I save my payment method for future orders?',
    a: 'Yes, you can securely save your payment methods in your Wallet for faster checkout on future orders.',
  },
];

const PaymentsFAQPage: React.FC = () => {
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h1 className="font-bold text-gray-900 mb-2" style={{ fontSize: '32px' }}>Payments & Refunds</h1>
          <p className="text-gray-600 leading-relaxed">Learn about payment methods, billing, invoices, and refund policies.</p>
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

export default PaymentsFAQPage;
