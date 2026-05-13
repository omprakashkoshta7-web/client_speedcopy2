import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import authService from '../services/auth.service';

interface LoginModalProps {
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose }) => {
  const { refreshUser } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [testOtp, setTestOtp] = useState<string | null>(null);
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (step === 'otp' && timer > 0) {
      const interval = setInterval(() => {
        setTimer((t) => (t > 0 ? t - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step, timer]);

  const handleSendOtp = async () => {
    if (phone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Send OTP via Twilio
      const response = await authService.sendPhoneOtp(`+91${phone}`);
      setStep('otp');
      setTimer(60); // 60 second countdown
      setOtp(['', '', '', '', '', '']);
      
      // Extract test OTP from response (for development/testing)
      const receivedOtp = (response.data as any)?._testOtp || (response as any)._testOtp;
      if (receivedOtp) {
        setTestOtp(receivedOtp);
        console.log('📱 Test OTP received:', receivedOtp);
        // Auto-fill OTP in development mode
        if (import.meta.env.DEV) {
          setTimeout(() => {
            const otpArray = receivedOtp.split('');
            setOtp(otpArray as any);
          }, 500);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs[index + 1].current?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setError('Please enter complete 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Verify OTP via Twilio and login
      const response = await authService.verifyPhoneOtp(`+91${phone}`, otpCode);
      
      console.log('LoginModal: Full OTP response:', response);
      
      // Backend returns: { success, message, data: { user, token } }
      // authService.verifyPhoneOtp returns response.data, so we get: { success, message, data: { user, token } }
      const token = response.data?.token;
      const user = response.data?.user;
      
      console.log('LoginModal: Extracted token:', !!token);
      console.log('LoginModal: Extracted user:', user);
      
      if (token && user) {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        console.log('LoginModal: Saved to localStorage - token:', token.substring(0, 20) + '...', 'user:', user.name);
        
        // Wait a bit for localStorage to sync, then refresh user
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        throw new Error('No token or user in response');
      }
      
      // Refresh user context
      await refreshUser();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Resend OTP via Twilio
      await authService.sendPhoneOtp(`+91${phone}`);
      setTimer(60);
      setOtp(['', '', '', '', '', '']);
    } catch (_err) {
      setError('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const maskedPhone = `+91 ${phone.slice(0, 2)}XXX XXX${phone.slice(-2)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>
        {step === 'phone' ? (
          /* ── Phone Step ── */
          <div className="bg-white rounded-3xl overflow-hidden w-96" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            {/* Top dark banner */}
            <div
              className="flex items-center justify-center overflow-hidden"
              style={{ height: '150px', background: '#111111' }}
            >
              <img
                src="/ChatGPT%20Image%20Apr%2028%2C%202026%2C%2011_13_07%20PM.png"
                alt="speedcopy logo"
                style={{
                  width: '200px',
                  height: '110px',
                  objectFit: 'contain',
                  flexShrink: 0,
                }}
              />
            </div>

            {/* Body */}
            <div className="px-7 py-6">
              <h2 className="font-bold text-gray-900 text-center mb-1" style={{ fontSize: '22px' }}>
                Login or Sign Up
              </h2>
              <p className="text-center text-xs mb-6" style={{ color: '#9ca3af' }}>
                Enter your phone number to continue.
              </p>

              {error && (
                <div className="mb-4 px-3 py-2 rounded-lg" style={{ backgroundColor: '#fee2e2', border: '1px solid #fecaca' }}>
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              <label className="block text-xs font-bold tracking-widest mb-2" style={{ color: '#374151' }}>
                PHONE NUMBER
              </label>
              <div
                className="flex items-center rounded-xl border px-3 py-2.5 mb-4"
                style={{ borderColor: '#e5e7eb' }}
              >
                <span className="text-sm font-medium text-gray-500 mr-2">+91</span>
                <div className="w-px h-4 bg-gray-200 mr-2"></div>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="00000 00000"
                  className="flex-1 text-sm focus:outline-none bg-transparent"
                  style={{ color: '#374151' }}
                />
              </div>

              <button
                onClick={handleSendOtp}
                disabled={loading || phone.length < 10}
                className="w-full py-3 text-white font-bold rounded-xl text-sm hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#111111' }}
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>

              <p className="text-center mt-4" style={{ fontSize: '10px', color: '#9ca3af' }}>
                By continuing, you agree to our{' '}
                <a href="#" className="underline font-medium text-gray-600">Terms</a>
                {' '}and{' '}
                <a href="#" className="underline font-medium text-gray-600">Privacy Policy</a>
              </p>
            </div>
          </div>
        ) : (
          /* ── OTP Step ── */
          <div className="bg-white rounded-3xl px-6 py-8 w-full max-w-md mx-4" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            <h2 className="font-bold text-gray-900 text-center mb-1" style={{ fontSize: '22px' }}>
              Verify OTP
            </h2>
            <div className="flex items-center justify-center gap-1.5 mb-7">
              <p className="text-xs" style={{ color: '#9ca3af' }}>Sent to {maskedPhone}</p>
              <button onClick={() => setStep('phone')}>
                <svg className="w-3.5 h-3.5" style={{ color: '#6b7280' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="mb-4 px-3 py-2 rounded-lg" style={{ backgroundColor: '#fee2e2', border: '1px solid #fecaca' }}>
                <p className="text-xs text-red-600 text-center">{error}</p>
              </div>
            )}

            {testOtp && (
              <div className="mb-4 px-3 py-2 rounded-lg" style={{ backgroundColor: '#dbeafe', border: '1px solid #93c5fd' }}>
                <p className="text-xs text-blue-600 text-center font-mono">
                  🔐 Test OTP: <span className="font-bold">{testOtp}</span>
                </p>
              </div>
            )}

            {/* OTP boxes */}
            <div className="flex justify-center gap-2 mb-6 px-2">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={otpRefs[i]}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="text-center text-lg font-bold focus:outline-none rounded-xl border-2 transition"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderColor: digit ? '#111111' : '#e5e7eb',
                    color: '#111111',
                  }}
                />
              ))}
            </div>

            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.join('').length < 6}
              className="w-full py-3 text-white font-bold rounded-xl text-sm hover:bg-gray-700 transition mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#111111' }}
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>

            <div className="text-center">
              <p className="text-xs mb-1" style={{ color: '#9ca3af' }}>Didn't receive code?</p>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={handleResendOtp}
                  className="text-xs font-bold disabled:opacity-50"
                  style={{ color: timer === 0 ? '#111111' : '#9ca3af' }}
                  disabled={timer > 0 || loading}
                >
                  Resend OTP
                </button>
                {timer > 0 && (
                  <span className="text-xs" style={{ color: '#9ca3af' }}>
                    in 0:{timer.toString().padStart(2, '0')}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
