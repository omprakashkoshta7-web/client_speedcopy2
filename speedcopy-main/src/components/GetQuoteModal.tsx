import React, { useState } from 'react';

type Props = { onClose: () => void };

export default function GetQuoteModal({ onClose }: Props) {
  const [form, setForm] = useState({ name: '', email: '', mobile: '', description: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Quote Request from ${form.name}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nMobile: ${form.mobile}\n\nDescription:\n${form.description}`
    );
    window.location.href = `mailto:support@speedcopy.com?subject=${subject}&body=${body}`;
    setSubmitted(true);
    setTimeout(onClose, 1500);
  };

  const inputClass = "w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition";
  const inputStyle = { border: '1.5px solid #e5e7eb', color: '#374151', backgroundColor: '#fafafa' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}>
      <div className="bg-white rounded-3xl w-full overflow-hidden"
        style={{ maxWidth: '460px', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-4">
          <div>
            <h2 className="font-bold text-gray-900" style={{ fontSize: '22px' }}>Get a Quote</h2>
            <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>We'll get back to you within 24 hours</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {submitted ? (
          <div className="px-7 pb-7 flex flex-col items-center gap-3 py-8">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: '#dcfce7' }}>
              <svg className="w-7 h-7" style={{ color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-bold text-gray-900">Request Sent!</p>
            <p className="text-sm text-center" style={{ color: '#9ca3af' }}>Your email client has opened. We'll respond shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-7 pb-7 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Username</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Your name" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Email ID</label>
              <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Mobile No.</label>
              <input required type="tel" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                placeholder="+91 00000 00000" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Description</label>
              <textarea required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe what you need..." rows={4}
                className={inputClass + " resize-none"} style={inputStyle} />
            </div>
            <button type="submit"
              className="w-full py-3.5 text-white font-bold rounded-full hover:opacity-90 transition text-sm"
              style={{ backgroundColor: '#111111' }}>
              Submit Request ↗
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
