import React from 'react';
import { useNavigate } from 'react-router-dom';

const FrameEditorTestPage: React.FC = () => {
  const navigate = useNavigate();

  const testProducts = [
    {
      id: '60eabb572abd6042bd053a',
      name: 'Photo Frame Test 1',
      description: 'Test product with multiple frame images'
    },
    {
      id: '675b7b5e2abd6042bd053a',
      name: 'Photo Frame Test 2', 
      description: 'Another test product for frame editor'
    }
  ];

  const openSimpleEditor = (productId: string) => {
    navigate(`/simple-frame-editor?productId=${productId}&flow=gifting`);
  };

  const openOriginalEditor = (productId: string) => {
    navigate(`/design-editor?productId=${productId}&flow=gifting`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Frame Editor Test Page</h1>
          
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Test Products</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {testProducts.map((product) => (
                <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{product.description}</p>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => openSimpleEditor(product.id)}
                      className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    >
                      Simple Frame Editor
                    </button>
                    <button
                      onClick={() => openOriginalEditor(product.id)}
                      className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                      Original Editor
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-2">Simple Frame Editor Features:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>✅ Proper frame loading from product images</li>
              <li>✅ Simple canvas with frame background</li>
              <li>✅ Easy image upload and placement</li>
              <li>✅ Frame switching functionality</li>
              <li>✅ Zoom controls</li>
              <li>✅ Download and preview options</li>
              <li>✅ Add to cart integration</li>
            </ul>
          </div>

          <div className="mt-6">
            <button
              onClick={() => navigate(-1)}
              className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FrameEditorTestPage;