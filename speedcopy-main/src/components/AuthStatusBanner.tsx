import React, { useEffect, useState } from 'react';

interface AuthStatusBannerProps {
  onLoginClick: () => void;
}

const AuthStatusBanner: React.FC<AuthStatusBannerProps> = ({ onLoginClick }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('auth_token');
      const user = localStorage.getItem('user');
      
      if (!token || !user) {
        setShow(true);
        console.log('🔴 No authentication token found');
      } else {
        setShow(false);
        console.log('✅ Authentication token present:', token.substring(0, 20) + '...');
      }
    };

    checkAuth();

    // Listen for auth changes
    const handleAuthChange = () => checkAuth();
    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('auth:unauthorized', handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('auth:unauthorized', handleAuthChange);
    };
  }, []);

  if (!show) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center"
      style={{ backgroundColor: '#fee2e2', borderBottom: '2px solid #ef4444' }}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-sm font-semibold text-red-800">
            You are not logged in. Please login to access all features.
          </p>
        </div>
        <button
          onClick={onLoginClick}
          className="px-4 py-1.5 bg-red-600 text-white text-sm font-bold rounded-full hover:bg-red-700 transition"
        >
          Login Now
        </button>
      </div>
    </div>
  );
};

export default AuthStatusBanner;
