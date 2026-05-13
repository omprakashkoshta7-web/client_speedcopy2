import React from 'react';

export type PaymentMethodType = 'razorpay' | 'wallet' | 'gpay' | 'phonepe';

interface PaymentMethodSelectorProps {
  method: PaymentMethodType;
  onSelect: (m: PaymentMethodType) => void;
  walletBalance?: number;
}

// Real logos
const GPAY_LOGO = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR3881GLtHK4APbxVlNESFKYF7SfFwBv3t8yg&s';
const PHONEPE_LOGO = 'https://www.phonepe.com/webstatic/13909/static/PhonePe_vertical-16158be8710408f3561e1d07d01d5d89.png';

const Radio: React.FC<{ selected: boolean }> = ({ selected }) => (
  <div
    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
    style={{ border: selected ? '2px solid #111111' : '2px solid #d1d5db' }}
  >
    {selected && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#111111' }} />}
  </div>
);

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  method,
  onSelect,
  walletBalance = 0,
}) => {
  const options: {
    id: PaymentMethodType;
    label: string;
    sub: string;
    icon: React.ReactNode;
    badge?: { text: string; bg: string; color: string };
    last?: boolean;
  }[] = [
    {
      id: 'razorpay',
      label: 'Credit / Debit Card',
      sub: 'Visa · Mastercard · RuPay · Net Banking',
      icon: (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#f0f4ff' }}>
          <svg className="w-5 h-5" style={{ color: '#3b5bdb' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
      ),
      badge: { text: 'Cards', bg: '#f3f4f6', color: '#6b7280' },
    },
    {
      id: 'gpay',
      label: 'Google Pay',
      sub: 'Pay via UPI using Google Pay',
      icon: (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ backgroundColor: '#fff', border: '1.5px solid #e5e7eb' }}>
          <img
            src={GPAY_LOGO}
            alt="Google Pay"
            className="w-8 h-8 object-contain"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      ),
      badge: { text: 'UPI', bg: '#e8f5e9', color: '#2e7d32' },
    },
    {
      id: 'phonepe',
      label: 'PhonePe',
      sub: 'Pay via UPI using PhonePe',
      icon: (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ backgroundColor: '#5f259f' }}>
          <img
            src={PHONEPE_LOGO}
            alt="PhonePe"
            className="w-7 h-7 object-contain"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      ),
      badge: { text: 'UPI', bg: '#f3e8ff', color: '#6b21a8' },
    },
    {
      id: 'wallet',
      label: 'SpeedWallet',
      sub: `Balance: ₹${walletBalance.toFixed(2)}`,
      icon: (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#f0fdf4' }}>
          <svg className="w-5 h-5" style={{ color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
      ),
      badge: { text: 'Instant', bg: '#dcfce7', color: '#166534' },
      last: true,
    },
  ];

  return (
    <div>
      <h2 className="font-bold text-gray-900 mb-4" style={{ fontSize: '18px' }}>Payment Method</h2>
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
        {options.map(opt => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className="w-full flex items-center gap-4 px-4 py-4 transition hover:bg-gray-50 text-left"
            style={{
              borderBottom: opt.last ? 'none' : '1px solid #f3f4f6',
              backgroundColor: method === opt.id ? '#fafafa' : '#ffffff',
            }}
          >
            <Radio selected={method === opt.id} />
            {opt.icon}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{opt.label}</p>
              <p className="text-xs mt-0.5 truncate" style={{ color: '#9ca3af' }}>{opt.sub}</p>
            </div>
            {opt.badge && (
              <span
                className="hidden sm:inline text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ backgroundColor: opt.badge.bg, color: opt.badge.color }}
              >
                {opt.badge.text}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
