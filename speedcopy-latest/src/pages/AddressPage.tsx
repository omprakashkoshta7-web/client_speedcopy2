import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AddressModal from '../components/AddressModal';
import { useAuth } from '../context/AuthContext';
import userService from '../services/user.service';
import { Edit2, Trash2 } from 'lucide-react';

const AddressPage: React.FC = () => {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [modalError, setModalError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  
  // Get print type from navigation state
  const printType = (location.state as any)?.printType;
  const fromPrintFlow = (location.state as any)?.fromPrintFlow;

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchAddresses();
  }, [isAuthenticated]);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await userService.getAddresses();
      const addressesData = response.data || [];
      setAddresses(Array.isArray(addressesData) ? addressesData : []);
    } catch (err: any) {
      console.error('Failed to fetch addresses:', err);
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAddress = async (formData: any) => {
    try {
      setSavingAddress(true);
      setModalError('');

      // Validation
      if (!formData.name || !formData.phone || !formData.house || !formData.area || !formData.pincode) {
        setModalError('Please fill all required fields');
        setSavingAddress(false);
        return;
      }

      // Validate pincode format
      if (!/^\d{5,6}$/.test(formData.pincode.trim())) {
        setModalError('Please enter a valid 5-6 digit pincode');
        setSavingAddress(false);
        return;
      }

      // Validate phone format
      const cleanPhone = formData.phone.trim().replace(/\s/g, '').replace(/^\+/, '');
      if (!/^\d{10,15}$/.test(cleanPhone)) {
        setModalError('Please enter a valid phone number');
        setSavingAddress(false);
        return;
      }

      const formattedAddress: any = {
        label: formData.type as 'Home' | 'Office' | 'Other',
        fullName: formData.name.trim(),
        phone: cleanPhone, // Remove + sign and spaces
        houseNo: formData.house.trim(),
        area: formData.area.trim(),
        line1: `${formData.house.trim()}, ${formData.area.trim()}`,
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: formData.pincode.trim(),
        country: 'India',
        isDefault: formData.isDefault || false,
      };

      // Only add optional fields if they have values
      if (formData.landmark?.trim()) {
        formattedAddress.landmark = formData.landmark.trim();
        formattedAddress.line2 = formData.landmark.trim();
      }

      console.log('Sending address data:', formattedAddress);

      if (editingAddress) {
        // Update existing address
        const response = await userService.updateAddress(editingAddress._id, formattedAddress);
        const updatedAddress = response.data;
        setAddresses(addresses.map(a => a._id === editingAddress._id ? updatedAddress : a));
        setEditingAddress(null);
        setShowAddModal(false);
      } else {
        // Add new address
        const response = await userService.addAddress(formattedAddress);
        const newAddress = response.data;
        
        // If coming from print flow, navigate to print-config with new address
        if (fromPrintFlow && printType) {
          navigate(`/print-config?type=${printType}`, { state: { selectedAddress: newAddress } });
          return;
        } else {
          await fetchAddresses();
          setShowAddModal(false);
        }
      }
    } catch (err: any) {
      console.error('Failed to save address:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      console.error('Error message:', err.response?.data?.message);
      console.error('Validation errors:', err.response?.data?.errors);
      
      // Better error messages
      if (err.response?.status === 401) {
        setModalError('Please login to save address');
      } else if (err.response?.status === 422) {
        // Show specific validation errors if available
        const validationErrors = err.response?.data?.errors;
        if (validationErrors && Array.isArray(validationErrors)) {
          setModalError(`Validation failed: ${validationErrors.map((e: any) => e.message || e).join(', ')}`);
        } else {
          setModalError(err.response?.data?.message || 'Validation failed. Please check all fields.');
        }
      } else if (err.response?.status === 400) {
        setModalError(err.response?.data?.message || 'Invalid address data. Please check all fields.');
      } else if (err.response?.data?.message) {
        setModalError(err.response.data.message);
      } else {
        setModalError('Failed to save address. Please try again.');
      }
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;

    try {
      setDeletingId(id);
      await userService.deleteAddress(id);
      setAddresses(addresses.filter(a => a._id !== id));
    } catch (err) {
      console.error('Failed to delete address:', err);
      alert('Failed to delete address');
    } finally {
      setDeletingId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Login</h1>
          <p className="text-gray-600 mb-6">You need to be logged in to manage addresses</p>
          <button onClick={() => navigate('/')} className="px-6 py-3 bg-black text-white rounded-full font-bold hover:bg-gray-800">
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 h-64 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-start justify-between mb-8 px-1 gap-4">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm font-semibold mb-3 hover:opacity-70 transition"
              style={{ color: '#6b7280' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h1 className="font-bold text-gray-900 mb-1" style={{ fontSize: '28px' }}>
              {fromPrintFlow ? 'Select Delivery Address' : 'Saved Addresses'}
            </h1>
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>
              {fromPrintFlow 
                ? 'Choose where you want your printed documents delivered.' 
                : 'Manage your shipping and billing locations for faster checkout.'}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-3 text-white font-bold rounded-full hover:bg-gray-700 transition"
            style={{ backgroundColor: '#111111', fontSize: '14px' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Address
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {addresses.map((addr: any) => (
            <div key={addr._id} className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#f3f4f6' }}>
                  <svg className="w-5 h-5" style={{ color: '#6366f1' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900" style={{ fontSize: '15px' }}>{addr.fullName || addr.name}</p>
                  {addr.label && <p className="text-xs" style={{ color: '#9ca3af' }}>{addr.label}</p>}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingAddress(addr)}
                    className="p-2 hover:bg-blue-50 rounded-lg transition"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4 text-blue-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(addr._id)}
                    disabled={deletingId === addr._id}
                    className="p-2 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>

              <div className="mb-5">
                <p className="text-sm" style={{ color: '#6b7280', lineHeight: '1.7' }}>
                  {addr.line1 || `${addr.houseNo || addr.house}, ${addr.area}`}
                </p>
                {addr.line2 && <p className="text-sm" style={{ color: '#6b7280', lineHeight: '1.7' }}>{addr.line2}</p>}
                <p className="text-sm" style={{ color: '#6b7280', lineHeight: '1.7' }}>
                  {addr.city}, {addr.state} - {addr.pincode}
                </p>
              </div>

              <div className="flex items-center gap-1.5 pt-4 mb-3" style={{ borderTop: '1px solid #f3f4f6' }}>
                <svg className="w-3.5 h-3.5" style={{ color: '#6366f1' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-xs font-medium" style={{ color: '#6b7280' }}>{addr.phone}</span>
              </div>

              {/* Select Address Button - Show when coming from print flow */}
              {fromPrintFlow && printType && (
                <button
                  onClick={() => navigate(`/print-config?type=${printType}`, { state: { selectedAddress: addr } })}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-white font-bold rounded-full hover:bg-gray-700 transition text-sm"
                  style={{ backgroundColor: '#111111' }}
                >
                  Select Address
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Address Modal */}
      {(showAddModal || editingAddress) && (
        <AddressModal
          onClose={() => {
            setShowAddModal(false);
            setEditingAddress(null);
            setModalError('');
          }}
          onSave={handleSaveAddress}
          error={modalError}
          loading={savingAddress}
          editingAddress={editingAddress}
        />
      )}

      <Footer />
    </div>
  );
};

export default AddressPage;
