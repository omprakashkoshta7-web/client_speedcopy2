import React, { useState } from 'react';

interface Props {
  onClose: () => void;
  onSave: (data: any) => void;
  error?: string;
  loading?: boolean;
  editingAddress?: any;
}

const AddressModal: React.FC<Props> = ({ onClose, onSave, error, loading, editingAddress }) => {
  const isEditing = !!editingAddress;
  const [addressType, setAddressType] = useState<'Home' | 'Office' | 'Other'>(
    editingAddress?.label || 'Home'
  );
  const [form, setForm] = useState({
    name: editingAddress?.fullName || '',
    phone: editingAddress?.phone || '',
    pincode: editingAddress?.pincode || '',
    house: editingAddress?.houseNo || editingAddress?.line1?.split(',')[0] || '',
    area: editingAddress?.area || editingAddress?.line1?.split(',')[1] || '',
    landmark: editingAddress?.landmark || editingAddress?.line2 || '',
    isDefault: editingAddress?.isDefault || false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = () => {
    onSave({ ...form, type: addressType });
  };

  const inputClass = "w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 transition";
  const inputStyle = { border: '1.5px solid #e5e7eb', color: '#374151' };
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1.5";

  const iconInput = (icon: React.ReactNode, name: string, placeholder: string, value: string) => (
    <div className="flex items-center gap-2 px-4 py-3 rounded-xl focus-within:ring-2 focus-within:ring-gray-200 transition" style={{ border: '1.5px solid #e5e7eb' }}>
      <span className="flex-shrink-0" style={{ color: '#9ca3af' }}>{icon}</span>
      <input name={name} value={value} onChange={handleChange} placeholder={placeholder}
        className="flex-1 text-sm focus:outline-none bg-transparent" style={{ color: '#374151' }} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="bg-white rounded-3xl w-full overflow-y-auto" style={{ maxWidth: '520px', maxHeight: '92vh', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-7 pt-7 pb-4">
          <h2 className="font-bold text-gray-900" style={{ fontSize: '22px' }}>
            {isEditing ? 'Edit Address' : 'Add New Address'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-7 pb-7">
          <p className="font-bold text-gray-900 mb-3" style={{ fontSize: '14px' }}>Save address as</p>
          <div className="flex items-center gap-3 mb-6">
            {(['Home', 'Office', 'Other'] as const).map(t => (
              <button key={t} onClick={() => setAddressType(t)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition"
                style={{ border: addressType === t ? '2px solid #111' : '1.5px solid #e5e7eb', color: addressType === t ? '#111' : '#6b7280', backgroundColor: '#fff' }}>
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass}>Full Name</label>
              {iconInput(
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
                'name', 'John Doe', form.name
              )}
            </div>
            <div>
              <label className={labelClass}>Phone Number</label>
              {iconInput(
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>,
                'phone', '+1 234 567 8900', form.phone
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass}>Pincode</label>
              <input name="pincode" value={form.pincode} onChange={handleChange} placeholder="10001" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass}>House No. / Flat No.</label>
              <input name="house" value={form.house} onChange={handleChange} placeholder="Apt 4B, 123 Main St" className={inputClass} style={inputStyle} />
            </div>
          </div>

          <div className="mb-4">
            <label className={labelClass}>Area / Street</label>
            <input name="area" value={form.area} onChange={handleChange} placeholder="Downtown District" className={inputClass} style={inputStyle} />
          </div>

          <label className="flex items-center gap-3 mb-7 cursor-pointer">
            <input type="checkbox" name="isDefault" checked={form.isDefault} onChange={handleChange}
              className="w-5 h-5 rounded-md" style={{ accentColor: '#111' }} />
            <span className="text-sm font-medium text-gray-700">Make this my default address</span>
          </label>

          {error && (
            <div className="mb-4 p-3 rounded-xl" style={{ backgroundColor: '#fee2e2', border: '1px solid #fecaca' }}>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-4">
            <button onClick={onClose} disabled={loading} className="flex-1 py-3.5 text-gray-700 font-bold text-sm hover:bg-gray-50 transition rounded-full disabled:opacity-50" style={{ border: '1.5px solid #e5e7eb' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={loading} className="py-3.5 px-10 text-white font-bold text-sm rounded-full hover:bg-gray-700 transition disabled:opacity-50" style={{ backgroundColor: '#111111', flex: 2 }}>
              {loading ? (isEditing ? 'Updating...' : 'Saving...') : (isEditing ? 'Update Address' : 'Save Address')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddressModal;
