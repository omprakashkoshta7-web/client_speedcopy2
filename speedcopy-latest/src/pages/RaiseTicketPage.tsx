import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ticketService from '../services/ticket.service';
import orderService from '../services/order.service';
import { useAuth } from '../context/AuthContext';

// Map UI issue types to backend category enum
const categoryMap: Record<string, 'order_issue' | 'payment_issue' | 'delivery_issue' | 'product_issue' | 'account_issue' | 'other'> = {
  order: 'order_issue',
  payment: 'payment_issue',
  quality: 'product_issue',
  delivery: 'delivery_issue',
  technical: 'account_issue',
  other: 'other',
};

const RaiseTicketPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [form, setForm] = useState({ issueType: '', orderId: '', description: '' });
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRecentOrders();
    }
  }, [isAuthenticated]);

  const fetchRecentOrders = async () => {
    try {
      const response: any = await orderService.getMyOrders({ limit: 5 });
      const ordersData = Array.isArray(response) ? response : (response.data?.orders || response.orders || response.data || []);
      setRecentOrders(ordersData);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files).filter(file => file.size <= 10 * 1024 * 1024);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files).filter(file => file.size <= 10 * 1024 * 1024);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!form.issueType || !form.description.trim()) {
      setError('Please select an issue type and provide a description.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const issueTypeLabel: Record<string, string> = {
        order: 'Order Issue',
        payment: 'Payment / Refund',
        quality: 'Print Quality',
        delivery: 'Delivery Problem',
        technical: 'Technical Issue',
        other: 'Other',
      };

      const payload: any = {
        subject: issueTypeLabel[form.issueType] || 'Support Request',
        description: form.description.trim(),
        category: categoryMap[form.issueType] || 'other',
      };

      if (attachments.length > 0) {
        try {
          const uploadResponse = await ticketService.uploadAttachments(attachments);
          payload.attachments = uploadResponse?.data?.attachments || [];
        } catch (uploadErr) {
          console.warn('Attachment upload failed, proceeding without attachments:', uploadErr);
          // Continue without attachments
        }
      }

      if (form.orderId && form.orderId !== 'none') {
        payload.orderId = form.orderId;
      }

      const response = await ticketService.createTicket(payload);
      const createdTicket = response.data;
      setTicketId(createdTicket?._id ? `#SC-${createdTicket._id.slice(-6).toUpperCase()}` : `#SC-${Math.floor(80000 + Math.random() * 9999)}`);
      setSubmitted(true);
    } catch (err: any) {
      console.error('Failed to create ticket:', err);
      setError(err.response?.data?.message || 'Failed to submit ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-7xl mx-auto px-6 py-16 flex justify-center">
          <div className="bg-white rounded-3xl p-10 text-center w-full" style={{ maxWidth: '480px', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ backgroundColor: '#6366f1', boxShadow: '0 0 0 12px #ede9fe' }}>
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-bold text-gray-900 mb-2" style={{ fontSize: '22px' }}>Ticket Submitted!</h2>
            <p className="text-sm mb-1" style={{ color: '#9ca3af' }}>Your ticket ID is</p>
            <p className="font-bold text-gray-900 mb-4" style={{ fontSize: '18px' }}>{ticketId}</p>
            <p className="text-sm mb-6" style={{ color: '#9ca3af' }}>Our support team will respond within <span className="font-bold text-gray-700">24 hours</span>.</p>
            <div className="space-y-3">
              <button onClick={() => navigate('/help')}
                className="w-full py-3 text-white font-bold rounded-full hover:bg-gray-700 transition text-sm"
                style={{ backgroundColor: '#111111' }}>
                Back to Help Center
              </button>
              <button onClick={() => navigate('/')}
                className="w-full py-3 font-bold rounded-full hover:bg-gray-100 transition text-sm"
                style={{ border: '1.5px solid #e5e7eb', color: '#374151' }}>
                Go to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectStyle = {
    border: '1.5px solid #e5e7eb',
    color: form.issueType ? '#374151' : '#9ca3af',
    backgroundColor: '#f3f4f6',
    appearance: 'none' as const,
  };

  return (
    <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Back */}
        <button
          onClick={() => navigate('/help')}
          className="flex items-center gap-1.5 text-sm font-semibold mb-6 hover:opacity-70 transition"
          style={{ color: '#9ca3af' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Support
        </button>

        {/* Title */}
        <div className="mb-6 px-1">
          <h1 className="font-bold text-gray-900 mb-1" style={{ fontSize: '28px' }}>Raise Support Ticket</h1>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>Tell us what's wrong and our team will get back to you shortly.</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl p-8" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>

          {/* Issue Type + Related Order */}
          <div className="grid grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Issue Type</label>
              <div className="relative">
                <select
                  name="issueType"
                  value={form.issueType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition"
                  style={selectStyle}
                >
                  <option value="" disabled>Select issue type</option>
                  <option value="order">Order Issue</option>
                  <option value="payment">Payment / Refund</option>
                  <option value="quality">Print Quality</option>
                  <option value="delivery">Delivery Problem</option>
                  <option value="technical">Technical Issue</option>
                  <option value="other">Other</option>
                </select>
                <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#9ca3af' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Related Order</label>
              <div className="relative">
                <select
                  name="orderId"
                  value={form.orderId}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition"
                  style={{ ...selectStyle, color: form.orderId ? '#374151' : '#9ca3af' }}
                >
                  <option value="" disabled>Select a recent order ID</option>
                  {recentOrders.length > 0 ? (
                    recentOrders.map(order => (
                      <option key={order._id} value={order._id}>
                        {order.orderNumber || order._id} — {order.items?.[0]?.productName || 'Order'}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="ORD-2023-8710">ORD-2023-8710 — A4 Flyers</option>
                      <option value="ORD-2023-8832">ORD-2023-8832 — Business Cards</option>
                    </>
                  )}
                  <option value="none">Not related to an order</option>
                </select>
                <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#9ca3af' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Detailed Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={5}
              placeholder="Please describe the issue in detail so we can help you faster..."
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition resize-none"
              style={{ border: '1.5px solid #e5e7eb', color: '#374151', backgroundColor: '#f9fafb' }}
            />
          </div>

          {/* Attachments */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Attachments</label>
            <div
              className="flex flex-col items-center justify-center py-8 rounded-2xl cursor-pointer hover:bg-gray-100 transition"
              style={{ 
                border: '2px dashed #d1d5db', 
                backgroundColor: dragActive ? '#f0f9ff' : '#f9fafb',
                borderColor: dragActive ? '#3b82f6' : '#d1d5db'
              }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-input"
                multiple
                onChange={handleFileInput}
                style={{ display: 'none' }}
                accept="image/*,.pdf,.doc,.docx"
              />
              <label htmlFor="file-input" className="flex flex-col items-center cursor-pointer w-full">
                <svg className="w-8 h-8 mb-3" style={{ color: '#9ca3af' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm font-semibold text-gray-700">Click to upload or drag and drop</p>
                <p className="text-xs mt-1" style={{ color: '#6366f1' }}>Photos, PDFs, or Screenshots (Max 10MB)</p>
              </label>
            </div>
            {attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" style={{ color: '#6366f1' }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                        <path fillRule="evenodd" d="M3 4a2 2 0 00-2 2v4a1 1 0 001 1h12a1 1 0 001-1V6a2 2 0 00-2-2H3zm0 1h10v4H3V5z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-700">{file.name}</span>
                    </div>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="text-red-500 hover:text-red-700 text-sm font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/help')}
              className="text-sm font-semibold text-gray-500 hover:text-gray-700 transition"
            >
              Cancel
            </button>
            {error && (
              <p className="text-sm font-medium" style={{ color: '#ef4444' }}>{error}</p>
            )}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-7 py-3.5 text-white font-bold rounded-xl hover:bg-gray-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#111111', fontSize: '14px' }}
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  Submit Ticket
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RaiseTicketPage;




