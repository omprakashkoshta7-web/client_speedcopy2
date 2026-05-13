import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';


const faqs = [
  {
    q: 'How do I track my order?',
    a: 'You can track your order by visiting the Orders page from your account dashboard. Each order has a tracking number that you can use to see real-time updates on your shipment status.',
  },
  {
    q: 'What do the different order statuses mean?',
    a: 'Order statuses include: Processing (we\'re preparing your order), Shipped (order is on its way), Out for Delivery (arriving today), and Delivered (order has been delivered).',
  },
  {
    q: 'How long does delivery take?',
    a: 'Standard delivery takes 3-5 business days. Express delivery is available for 1-2 business days. You\'ll receive an estimated delivery date when your order ships.',
  },
  {
    q: 'Can I change my delivery address after placing an order?',
    a: 'Yes, you can change your delivery address within 2 hours of placing the order. After that, please contact our support team for assistance.',
  },
  {
    q: 'What if my order is delayed?',
    a: 'If your order is delayed beyond the estimated delivery date, please check the tracking information first. If there are no updates, contact our support team with your order number.',
  },
];

const OrderTrackingFAQPage: React.FC = () => {
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8l2-2zM13 8h4l3 3v5h-7V8z" />
            </svg>
          </div>
          <h1 className="font-bold text-gray-900 mb-2" style={{ fontSize: '32px' }}>Order Tracking</h1>
          <p className="text-gray-600 leading-relaxed">Everything you need to know about tracking your orders and managing deliveries.</p>
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

export default OrderTrackingFAQPage;
