import React from 'react';

const EnvTest: React.FC = () => {
  // Get all environment variables
  const env = (import.meta as any)?.env || {};
  
  // Specifically check Razorpay key
  const razorpayKey = env.VITE_RAZORPAY_KEY_ID || env.VITE_RAZORPAY_KEY;
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Environment Variables Test</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Razorpay Configuration */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Razorpay Configuration</h3>
          <div className="space-y-2 text-sm">
            <div>
              <strong>VITE_RAZORPAY_KEY_ID:</strong> 
              <span className={`ml-2 ${razorpayKey ? 'text-green-600' : 'text-red-600'}`}>
                {razorpayKey ? `${razorpayKey.substring(0, 8)}...` : 'Not found'}
              </span>
            </div>
            <div>
              <strong>Status:</strong> 
              <span className={`ml-2 ${razorpayKey ? 'text-green-600' : 'text-red-600'}`}>
                {razorpayKey ? '✅ Configured' : '❌ Missing'}
              </span>
            </div>
            <div>
              <strong>Valid Format:</strong> 
              <span className={`ml-2 ${razorpayKey?.startsWith('rzp_') ? 'text-green-600' : 'text-red-600'}`}>
                {razorpayKey?.startsWith('rzp_') ? '✅ Valid' : '❌ Invalid format'}
              </span>
            </div>
          </div>
        </div>

        {/* API Configuration */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">API Configuration</h3>
          <div className="space-y-2 text-sm">
            <div>
              <strong>VITE_API_URL:</strong> 
              <span className="ml-2 text-gray-700">{env.VITE_API_URL || 'Not set'}</span>
            </div>
            <div>
              <strong>VITE_APP_NAME:</strong> 
              <span className="ml-2 text-gray-700">{env.VITE_APP_NAME || 'Not set'}</span>
            </div>
            <div>
              <strong>NODE_ENV:</strong> 
              <span className="ml-2 text-gray-700">{env.NODE_ENV || 'Not set'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* All Environment Variables */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-2">All Environment Variables</h3>
        <pre className="text-xs overflow-auto bg-white p-3 rounded border">
          {JSON.stringify(env, null, 2)}
        </pre>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-800 mb-2">Setup Instructions</h3>
        <div className="text-sm text-yellow-700 space-y-2">
          <p><strong>1. Check .env file location:</strong> Should be in <code>client/.env</code></p>
          <p><strong>2. Verify .env content:</strong></p>
          <pre className="bg-yellow-100 p-2 rounded text-xs">
VITE_RAZORPAY_KEY_ID=rzp_test_6vdMK3ln1NsDMj
VITE_API_URL=http://localhost:4000
          </pre>
          <p><strong>3. Restart dev server:</strong> <code>npm run dev</code> or <code>yarn dev</code></p>
          <p><strong>4. Check browser console:</strong> Look for environment variable logs</p>
        </div>
      </div>

      {/* Test Button */}
      <div className="mt-6 text-center">
        <button 
          onClick={() => {
            console.log('🔍 Environment Variables:', env);
            console.log('🔑 Razorpay Key:', razorpayKey);
            alert(`Razorpay Key: ${razorpayKey ? `${razorpayKey.substring(0, 8)}...` : 'Not found'}`);
          }}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-600"
        >
          Test Environment Variables
        </button>
      </div>
    </div>
  );
};

export default EnvTest;