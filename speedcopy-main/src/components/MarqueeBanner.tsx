import React from 'react';

const MarqueeBanner: React.FC = () => {
  const text = "⚡ FLASH SALE: 20% OFF on all Custom Mugs! Use code: GIFT20 | New arrivals in Personalized Stationery are now live! 🌟 FLASH SALE: 20% OFF on all Custom Mugs! Use code: GIFT20 | New arrivals in Personalized Stationery are now live! ";

  return (
    <div className="bg-gray-900 text-white text-sm py-2.5 overflow-hidden whitespace-nowrap">
      <div className="flex animate-marquee">
        <span className="px-4">{text}</span>
        <span className="px-4">{text}</span>
      </div>
    </div>
  );
};

export default MarqueeBanner;
