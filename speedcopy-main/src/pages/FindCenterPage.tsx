import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';

const recentLocations = [
  { id: '1', label: 'Home', address: '123 Maple Street, Apt 4B, Springfield' },
  { id: '2', label: 'Office', address: '45 Tech Park Blvd, Suite 200, Innovation District' },
  { id: '3', label: 'University Library Branch', address: '890 Campus Drive, Student Center' },
];

const FindCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const handleUseCurrentLocation = () => {
    navigate('/pickup-location');
  };

  const handleSelectRecent = (locationId: string) => {
    navigate('/pickup-location', { state: { locationId } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f0f0f0' }}>
      <div className="w-full max-w-2xl bg-white rounded-3xl p-8 sm:p-12" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <BackButton label="Back" className="mb-6" />
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Find a SpeedCopy center</h1>
          <p className="text-sm sm:text-base" style={{ color: '#9ca3af' }}>
            Enter your location to see available printing services, pricing,<br className="hidden sm:block" />
            and delivery times nearby.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            ), label: 'Fast Delivery' },
            { icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ), label: 'Quality Guaranteed' },
            { icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ), label: '24/7 Support' },
          ].map((f, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#3b82f615', color: '#3b82f6' }}>
                {f.icon}
              </div>
              <span className="text-xs font-semibold text-gray-600">{f.label}</span>
            </div>
          ))}
        </div>

        {/* Search input */}
        <div className="mb-4">
          <div className="relative">
            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Enter Area or Pincode (e.g. Downtown, 10001)"
              className="w-full pl-12 pr-4 py-4 rounded-2xl text-sm focus:outline-none"
              style={{ border: '1.5px solid #e5e7eb', backgroundColor: '#fafafa', color: '#374151' }} />
          </div>
        </div>

        {/* OR divider */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 h-px" style={{ backgroundColor: '#e5e7eb' }} />
          <span className="text-xs font-semibold" style={{ color: '#9ca3af' }}>or</span>
          <div className="flex-1 h-px" style={{ backgroundColor: '#e5e7eb' }} />
        </div>

        {/* Use Current Location button */}
        <button onClick={handleUseCurrentLocation}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold transition hover:bg-blue-50"
          style={{ border: '1.5px solid #3b82f6', color: '#3b82f6', backgroundColor: '#3b82f615' }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Use Current Location
        </button>

        {/* Recently Used Locations */}
        <div className="mt-8">
          <p className="text-xs font-bold mb-4" style={{ color: '#9ca3af', letterSpacing: '0.05em' }}>RECENTLY USED LOCATIONS</p>
          <div className="space-y-2">
            {recentLocations.map(loc => (
              <button key={loc.id} onClick={() => handleSelectRecent(loc.id)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl transition hover:bg-gray-50"
                style={{ border: '1px solid #f3f4f6', backgroundColor: '#fafafa' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }}>
                  <svg className="w-5 h-5" style={{ color: '#9ca3af' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-bold text-gray-900 text-sm">{loc.label}</p>
                  <p className="text-xs truncate" style={{ color: '#9ca3af' }}>{loc.address}</p>
                </div>
                <svg className="w-5 h-5 flex-shrink-0" style={{ color: '#d1d5db' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default FindCenterPage;
