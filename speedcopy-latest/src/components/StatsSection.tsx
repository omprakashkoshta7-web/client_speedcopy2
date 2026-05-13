import React from 'react';

const stats = [
  { icon: <svg className="w-6 h-6" style={{ color: '#374151' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 9V2H18V9M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" /></svg>, value: '30,000+', label: 'Happy Customers' },
  { icon: <svg className="w-6 h-6" style={{ color: '#374151' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8l2-2zM13 8h4l3 3v5h-7V8z" /></svg>, value: '50,000+', label: 'Orders Delivered' },
  { icon: <svg className="w-6 h-6" style={{ color: '#374151' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, value: '30,00,000+', label: 'Papers Printed' },
];

const StatsSection: React.FC = () => (
  <section className="py-6 px-4" style={{ backgroundColor: '#f0f0f0' }}>
    <div className="max-w-7xl mx-auto px-6">
      <div className="bg-white rounded-3xl px-6 py-12 md:px-10 md:py-14" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div className="text-center mb-8">
          <h2 className="font-bold text-gray-900 mb-1.5 text-lg md:text-xl">Trusted by thousands of customers every day.</h2>
          <p className="text-base" style={{ color: '#9ca3af' }}>Real number that reflect our growing community and impact</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map(stat => (
            <div key={stat.label} className="flex items-center gap-4 rounded-2xl px-6 py-8" style={{ backgroundColor: '#f3f4f6' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#e5e7eb' }}>{stat.icon}</div>
              <div>
                <p className="font-bold text-gray-900 text-lg md:text-xl">{stat.value}</p>
                <p className="text-sm" style={{ color: '#6b7280' }}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default StatsSection;
