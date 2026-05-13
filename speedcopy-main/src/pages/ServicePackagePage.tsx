import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BackButton from '../components/BackButton';
import FindCenterModal from '../components/FindCenterModal';

type DeliveryType = 'Pickup' | 'Delivery';

const defaultPackages = [
  {
    id: 'standard',
    name: 'Standard',
    desc: 'Best for non-urgent bulk orders. Reliable and cost-effective.',
    oldPrice: '₹12.00',
    price: '₹9.00',
    save: 'Save ₹3.00',
    features: ['Ready in 3 days', 'Standard paper quality', 'Pickup at counter'],
    badge: null,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#6b7280' }}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
      </svg>
    ),
  },
  {
    id: 'express',
    name: 'Express',
    desc: 'Perfect balance of speed and value for most business needs.',
    oldPrice: '₹18.00',
    price: '₹14.50',
    save: 'Save ₹3.50',
    features: ['Ready in 24 hours', 'High priority queue', 'Pickup at counter'],
    badge: 'MOST POPULAR',
    icon: (
      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: 'instant',
    name: 'Instant',
    desc: 'When every minute counts. Delivered directly to your door.',
    oldPrice: '₹30.00',
    price: '₹25.00',
    save: 'Save ₹5.00',
    features: ['Delivered within 4 hours', 'Immediate processing', 'Direct courier delivery'],
    badge: null,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#6b7280' }}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
  },
];

const ServicePackagePage: React.FC = () => {
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('Delivery');
  const [selected, setSelected] = useState('express');
  const [showFindCenter, setShowFindCenter] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const configId = searchParams.get('configId') || '';
  const printType = searchParams.get('type') || '';

  const handleSelect = (pkgId: string) => {
    setSelected(pkgId);
    navigate(`/print-checkout?configId=${configId}&type=${printType}&package=${pkgId}`);
  };

  return (
    <>
    <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <Navbar />
      <BackButton label="Back" className="mb-6" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

        {/* Pickup / Delivery toggle */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center bg-white rounded-full p-1" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
            {(['Pickup', 'Delivery'] as DeliveryType[]).map(type => (
              <button key={type} onClick={() => {
                setDeliveryType(type);
                if (type === 'Pickup') { setDeliveryType('Pickup'); navigate(`/pickup-location?configId=${configId}&type=${printType}`); return; }
              }}
                className="px-10 py-2.5 rounded-full text-sm font-semibold transition"
                style={{ backgroundColor: deliveryType === type ? '#111111' : 'transparent', color: deliveryType === type ? '#ffffff' : '#6b7280' }}>
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h1 className="font-bold text-gray-900 mb-1 text-2xl sm:text-3xl">Select Your Service Package</h1>
          <p className="text-sm" style={{ color: '#9ca3af' }}>
            Fulfilled by: <span style={{ color: '#6b7280' }}>Downtown SpeedCopy Center</span>
          </p>
        </div>

        {/* Packages grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {defaultPackages.map(pkg => {
            const isSelected = selected === pkg.id;
            return (
              <div key={pkg.id} onClick={() => handleSelect(pkg.id)}
                className="relative rounded-2xl p-5 cursor-pointer transition"
                style={{
                  backgroundColor: '#ffffff',
                  border: isSelected ? '2px solid #111111' : '1.5px solid #e5e7eb',
                  boxShadow: isSelected ? '0 4px 20px rgba(0,0,0,0.1)' : '0 1px 6px rgba(0,0,0,0.05)',
                }}>

                {pkg.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-xs font-bold whitespace-nowrap"
                    style={{ backgroundColor: '#111111' }}>
                    {pkg.badge}
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: isSelected ? '#111111' : '#f3f4f6' }}>
                    {pkg.icon}
                  </div>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ border: isSelected ? 'none' : '1.5px solid #d1d5db', backgroundColor: isSelected ? '#111111' : 'transparent' }}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>

                <h3 className="font-bold text-gray-900 mb-1" style={{ fontSize: '17px' }}>{pkg.name}</h3>
                <p className="text-xs leading-relaxed mb-4" style={{ color: '#9ca3af' }}>{pkg.desc}</p>

                <div className="mb-4" style={{ borderTop: isSelected ? '1px solid #e5e7eb' : 'none', paddingTop: isSelected ? '12px' : '0' }}>
                  <p className="line-through text-xs mb-0.5" style={{ color: '#9ca3af' }}>{pkg.oldPrice}</p>
                  <div className="flex items-baseline gap-2">
                    <p className="font-bold text-gray-900" style={{ fontSize: '22px' }}>{pkg.price}</p>
                    <p className="text-xs font-bold" style={{ color: '#16a34a' }}>{pkg.save}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {pkg.features.map(f => (
                    <div key={f} className="flex items-center gap-2">
                      <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs font-medium" style={{ color: isSelected ? '#111111' : '#6b7280', fontWeight: isSelected ? 700 : 500 }}>
                        {f}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Disclaimer */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#9ca3af' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs" style={{ color: '#9ca3af' }}>Prices reflect current discounts for your Gold Tier account.</p>
        </div>

      </div>
    </div>

    {showFindCenter && (
      <FindCenterModal
        onClose={() => { setShowFindCenter(false); setDeliveryType('Delivery'); }}
        configId={configId}
        printType={printType}
      />
    )}
  </>
  );
};

export default ServicePackagePage;
