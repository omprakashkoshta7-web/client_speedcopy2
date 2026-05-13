import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginModal from './LoginModal';
import financeService from '../services/finance.service';
import orderService from '../services/order.service';

interface SidebarProps {
  onClose: () => void;
}

// Static menu items — wallet & orders badges injected dynamically below
const STATIC_MENU = [
  {
    icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>),
    label: 'Wallet', key: 'wallet', route: '/wallet',
  },
  {
    icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>),
    label: 'My Orders', key: 'orders', route: '/orders',
  },
  {
    icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>),
    label: 'Cart', key: 'cart', route: '/cart',
  },
  {
    icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>),
    label: 'Wishlist', key: 'wishlist', route: '/wishlist',
  },
  {
    icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>),
    label: 'Saved Addresses', key: 'addresses', route: '/addresses',
  },
  {
    icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>),
    label: 'Notifications', key: 'notifications', route: '/notifications',
  },
];

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [activeOrderCount, setActiveOrderCount] = useState<number | null>(null);

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  // Fetch wallet + active orders when sidebar opens (only if logged in)
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchSidebarData = async () => {
      try {
        const [walletRes, ordersRes] = await Promise.all([
          financeService.getWallet(),
          orderService.getMyOrders({ limit: 50, status: 'processing' }),
        ]);

        // Wallet balance
        const walletData = walletRes.data?.data || walletRes.data || walletRes;
        setWalletBalance(walletData?.balance ?? null);

        // Active orders count (processing + pending)
        const ordersData = ordersRes.data?.orders || ordersRes.data || [];
        setActiveOrderCount(Array.isArray(ordersData) ? ordersData.length : 0);
      } catch (err) {
        console.error('Sidebar data fetch failed:', err);
      }
    };

    fetchSidebarData();
  }, [isAuthenticated]);

  // Build dynamic badges
  const getBadge = (key: string): { text: string; style: React.CSSProperties } | null => {
    if (key === 'wallet') {
      if (walletBalance === null) return null;
      return {
        text: `₹${walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        style: { backgroundColor: '#f3f4f6', color: '#374151' },
      };
    }
    if (key === 'orders') {
      if (activeOrderCount === null) return null;
      if (activeOrderCount === 0) return null;
      return {
        text: `${activeOrderCount} Active`,
        style: { backgroundColor: '#fff7ed', color: '#ea580c' },
      };
    }
    return null;
  };

  const handleNav = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/');
  };
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      {/* Sidebar panel - slides from right with fade-in */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col bg-white"
        style={{
          width: '320px',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
          animation: 'sidebarFadeIn 0.8s ease forwards',
        }}
      >
        {/* Close button */}
        <div className="flex justify-end px-5 pt-5 pb-2">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 px-6 pb-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-full overflow-hidden" style={{ border: '2px solid #e5e7eb' }}>
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: '#111111' }}>
                  {initials}
                </div>
              )}
            </div>
            {isAuthenticated && (
              <div className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e', border: '2px solid white' }} />
            )}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-base">
              {isAuthenticated ? (user?.name || 'User') : 'Guest'}
            </p>
            {isAuthenticated ? (
              <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition" onClick={() => handleNav('/profile')}>
                View Profile
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <p className="text-sm text-gray-400">Sign in to continue</p>
            )}
          </div>
        </div>

        {/* Mobile: Sign Up / Login buttons — only when NOT logged in */}
        {!isAuthenticated && (
          <div className="flex gap-2 px-6 pb-4 sm:hidden">
            <button onClick={() => { onClose(); setShowLogin(true); }}
              className="flex-1 py-2.5 text-white font-bold rounded-full text-sm hover:bg-gray-700 transition"
              style={{ backgroundColor: '#111111' }}>
              Sign Up
            </button>
            <button onClick={() => { onClose(); setShowLogin(true); }}
              className="flex-1 py-2.5 font-semibold rounded-full text-sm hover:bg-gray-100 transition"
              style={{ border: '1.5px solid #e5e7eb', color: '#374151' }}>
              Login
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="mx-6 mb-2" style={{ height: '1px', backgroundColor: '#f3f4f6' }} />

        {/* Menu Items */}
        <div className="px-4 py-1">
          {STATIC_MENU.map((item) => {
            const badge = getBadge(item.key);
            return (
              <button
                key={item.label}
                onClick={() => handleNav(item.route)}
                className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-gray-50 transition group"
              >
                <div className="flex items-center gap-3">
                  <span style={{ color: '#6b7280' }}>{item.icon}</span>
                  <span className="text-base font-medium text-gray-800">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {badge && (
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={badge.style}
                    >
                      {badge.text}
                    </span>
                  )}
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            );
          })}

          {/* Refer & Earn - highlighted */}
          <button
            onClick={() => handleNav('/refer')}
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl mt-1 hover:opacity-90 transition"
            style={{
              backgroundColor: '#fff1f2',
              border: '1.5px solid #fda4af',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: '#ffe4e6' }}
              >
                <svg className="w-5 h-5" style={{ color: '#e11d48' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-base font-bold" style={{ color: '#e11d48' }}>Refer &amp; Earn</p>
                <p className="text-xs" style={{ color: '#f43f5e' }}>Get ₹50 for every friend</p>
              </div>
            </div>
            <svg className="w-5 h-5" style={{ color: '#e11d48' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Help & Support */}
          <button className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-gray-50 transition mt-1" onClick={() => handleNav('/help')}>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" style={{ color: '#6b7280' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span className="text-base font-medium text-gray-800">Help &amp; Support</span>
            </div>
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Bottom section */}
        <div className="px-6 pb-4 pt-2" style={{ borderTop: '1px solid #f3f4f6' }}>
          {/* Logout / Login button */}
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 text-white font-bold rounded-full text-base hover:bg-gray-700 transition mb-3"
              style={{ backgroundColor: '#111111' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          ) : (
            <button
              onClick={() => { onClose(); setShowLogin(true); }}
              className="w-full flex items-center justify-center gap-2 py-3 text-white font-bold rounded-full text-base hover:bg-gray-700 transition mb-3"
              style={{ backgroundColor: '#111111' }}
            >
              Login / Sign Up
            </button>
          )}

          {/* Social icons */}
          <div className="flex items-center justify-center gap-5 mb-4">
            {/* X (Twitter) */}
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition">
              <svg className="w-4 h-4" style={{ color: '#9ca3af' }} viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </button>
            {/* Instagram */}
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition">
              <svg className="w-4 h-4" style={{ color: '#9ca3af' }} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </button>
            {/* LinkedIn */}
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition">
              <svg className="w-4 h-4" style={{ color: '#9ca3af' }} viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </button>
          </div>

          <p className="text-center text-xs" style={{ color: '#d1d5db' }}>© 2024 SpeedCopy Inc.</p>
        </div>
      </div>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
};

export default Sidebar;