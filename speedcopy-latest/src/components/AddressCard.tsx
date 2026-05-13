import React from 'react';

type AddressRecord = {
  _id?: string;
  id?: string;
  label?: string;
  fullName?: string;
  name?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  houseNo?: string;
  house?: string;
  area?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  isDefault?: boolean;
};

type AddressCardProps = {
  address: AddressRecord;
  selected?: boolean;
  onClick?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};

const buildLineOne = (address: AddressRecord) => {
  if (address.line1) return address.line1;

  const house = address.houseNo || address.house || '';
  const area = address.area || '';
  return [house, area].filter(Boolean).join(', ');
};

const buildLineTwo = (address: AddressRecord) => {
  if (address.line2) return address.line2;
  return address.landmark || '';
};

const AddressCard: React.FC<AddressCardProps> = ({
  address,
  selected = false,
  onClick,
  actionLabel,
  onAction,
  compact = false,
}) => {
  const title = address.fullName || address.name || 'Saved Address';
  const subtitle = address.label || 'Address';
  const lineOne = buildLineOne(address);
  const lineTwo = buildLineTwo(address);
  const cityLine = [address.city, address.state, address.pincode].filter(Boolean).join(', ');

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-3xl overflow-hidden transition group"
      style={{
        border: selected ? '2px solid #111111' : '1px solid #eceff3',
        background: selected
          ? 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
          : 'linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%)',
        boxShadow: selected ? '0 14px 34px rgba(17, 24, 39, 0.12)' : '0 8px 24px rgba(15, 23, 42, 0.06)',
      }}
    >
      <div
        className="px-5 pt-5 pb-4"
        style={{
          background: selected
            ? 'linear-gradient(135deg, rgba(17,17,17,0.06) 0%, rgba(59,130,246,0.03) 100%)'
            : 'linear-gradient(135deg, rgba(15,23,42,0.03) 0%, rgba(255,255,255,0.2) 100%)',
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: selected ? 'linear-gradient(135deg, #111111 0%, #374151 100%)' : '#f3f4f6',
              }}
            >
              <svg className="w-5 h-5" style={{ color: selected ? '#ffffff' : '#4f46e5' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className="font-bold text-gray-900 truncate" style={{ fontSize: compact ? '14px' : '15px' }}>
                  {title}
                </p>
                {address.isDefault && (
                  <span
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                    style={{ backgroundColor: '#ecfdf3', color: '#15803d', border: '1px solid #bbf7d0' }}
                  >
                    Default
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: selected ? '#111111' : '#9ca3af' }}>
                {subtitle}
              </p>
            </div>
          </div>

          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: selected ? '#111111' : '#ffffff',
              border: selected ? 'none' : '1.5px solid #d1d5db',
            }}
          >
            {selected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
          </div>
        </div>

        <div className="space-y-1.5">
          {lineOne && (
            <p className="text-sm leading-relaxed" style={{ color: '#4b5563' }}>
              {lineOne}
            </p>
          )}
          {lineTwo && (
            <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>
              {lineTwo}
            </p>
          )}
          {cityLine && (
            <p className="text-sm leading-relaxed" style={{ color: '#4b5563' }}>
              {cityLine}
            </p>
          )}
        </div>
      </div>

      <div
        className="px-5 py-3.5 flex items-center justify-between gap-3"
        style={{ borderTop: '1px solid #edf2f7', backgroundColor: 'rgba(255,255,255,0.75)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#f8fafc', border: '1px solid #e5e7eb' }}>
            <svg className="w-4 h-4" style={{ color: '#475569' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <span className="text-sm font-medium truncate" style={{ color: '#475569' }}>
            {address.phone || 'No phone added'}
          </span>
        </div>

        {actionLabel && onAction && (
          <span
            onClick={(event) => {
              event.stopPropagation();
              onAction();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition"
            style={{
              backgroundColor: selected ? '#111111' : '#f8fafc',
              color: selected ? '#ffffff' : '#111111',
              border: selected ? 'none' : '1px solid #dbe3ea',
            }}
          >
            {actionLabel}
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        )}
      </div>
    </button>
  );
};

export default AddressCard;
