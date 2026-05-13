import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginModal from './LoginModal';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // Generate initials from user name
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  // Debug logging
  console.log('Navbar: Current user:', user);
  console.log('Navbar: Generated initials:', initials);
  console.log('Navbar: Is authenticated:', isAuthenticated);

  return (
    <>
      <nav className="sticky top-0 z-50 py-4" style={{ backgroundColor: '#f0f0f0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-3">

          {/* White pill card */}
          <div
            className="flex-1 flex items-center justify-between px-4 sm:px-5 h-16 sm:h-18 bg-white"
            style={{ borderRadius: '14px', boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}
          >
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <img
                src="/ChatGPT Image Apr 16, 2026, 03_06_38 PM.png"
                alt="speedcopy logo"
                style={{
                  width: '190px',
                  height: 'auto',
                  objectFit: 'cover',
                  objectPosition: 'center 8%',
                }}
              />
            </div>

            {/* Right buttons */}
            <div className="flex items-center gap-1">
              {isAuthenticated ? (
                /* Logged in: show avatar button that opens sidebar */
                <button
                  onClick={() => setShowSidebar(true)}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-gray-100 transition"
                >
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover"
                      style={{ border: '2px solid #e5e7eb' }}
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: '#111111' }}
                    >
                      {initials}
                    </div>
                  )}
                  <span className="text-sm font-semibold text-gray-700 max-w-[100px] truncate">
                    {user?.name?.split(' ')[0]}
                  </span>
                </button>
              ) : (
                /* Not logged in: show Sign Up + Login */
                <>
                  <button
                    onClick={() => setShowLogin(true)}
                    className="hidden sm:block px-4 py-2 text-white font-semibold rounded-full hover:bg-gray-700 transition text-sm"
                    style={{ backgroundColor: '#111111' }}
                  >
                    Sign Up
                  </button>
                  <button
                    onClick={() => setShowLogin(true)}
                    className="hidden sm:block px-3 py-2 font-medium text-gray-600 hover:text-gray-900 transition text-sm"
                  >
                    Login
                  </button>
                </>
              )}

              {/* Hamburger — always visible */}
              <button
                onClick={() => setShowSidebar(true)}
                className="p-2 text-gray-700 hover:text-gray-900 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Refer button */}
          <button
            onClick={() => navigate('/refer')}
            className="flex items-center gap-2 text-white font-bold hover:opacity-90 transition flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #f97316 0%, #f43f5e 100%)',
              borderRadius: '14px',
              padding: '12px 16px',
              fontSize: '15px',
            }}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
            </svg>
            <span className="hidden xs:inline sm:inline">Refer</span>
          </button>
        </div>
      </nav>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      {showSidebar && <Sidebar onClose={() => setShowSidebar(false)} />}
    </>
  );
};

export default Navbar;
