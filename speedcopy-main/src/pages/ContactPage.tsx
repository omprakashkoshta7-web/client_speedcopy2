import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import BackButton from '../components/BackButton';
import Footer from '../components/Footer';

const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(true);
      setFormData({ name: '', email: '', message: '' });
      setTimeout(() => setSuccess(false), 3000);
    } catch (_err) {
      setError('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <Navbar />
      <BackButton label="Back" className="mb-6" />
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-bold text-gray-900 mb-2" style={{ fontSize: '28px' }}>Contact Us</h1>
          <p className="text-gray-600">Send us a message and we'll get back to you soon.</p>
        </div>

        {/* Simple Contact Form */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your name"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-400 text-sm"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-400 text-sm"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Message *</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="How can we help you?"
                required
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-gray-400 text-sm resize-none"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl" style={{ backgroundColor: '#fee2e2', border: '1px solid #fecaca' }}>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="p-3 rounded-xl" style={{ backgroundColor: '#dcfce7', border: '1px solid #bbf7d0' }}>
                <p className="text-sm text-green-600">✓ Message sent successfully!</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-center pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 text-white font-bold rounded-xl hover:bg-gray-700 transition text-sm disabled:opacity-60"
                style={{ backgroundColor: '#111111' }}
              >
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
        </div>

        {/* Contact Info */}
        <div className="mt-8 text-center">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <p className="text-xs text-gray-500 mb-1">Email</p>
              <p className="font-bold text-gray-900 text-sm">support@speedcopy.com</p>
            </div>
            <div className="bg-white rounded-xl p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <p className="text-xs text-gray-500 mb-1">Phone</p>
              <p className="font-bold text-gray-900 text-sm">+91 1800-SPEED-CO</p>
            </div>
            <div className="bg-white rounded-xl p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <p className="text-xs text-gray-500 mb-1">Hours</p>
              <p className="font-bold text-gray-900 text-sm">Mon-Sat, 9AM-7PM</p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ContactPage;
