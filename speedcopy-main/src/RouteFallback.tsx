import React from 'react';

const RouteFallback: React.FC = () => (
  <div
    className="min-h-screen flex items-center justify-center text-sm font-semibold"
    style={{ backgroundColor: '#f0f0f0', color: '#6b7280' }}
  >
    {/* intentionally blank — TopLoadingBar handles the visual feedback */}
  </div>
);

export default RouteFallback;
