/**
 * FRAMES API INTEGRATION EXAMPLES
 * 
 * This file shows different ways to use the Product Frames API
 * GET /api/designs/product/:productId/frames
 */

import React, { useState } from 'react';
import ProductFramesSelector from './src/components/ProductFramesSelector';
import designService, { Frame } from './src/services/design.service';

// ============================================
// EXAMPLE 1: Using ProductFramesSelector Component
// ============================================
export function Example1_UsingComponent() {
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  const productId = 'product_123'; // Your product ID

  const handleFrameSelect = (frame: Frame) => {
    console.log('Selected frame:', frame);
    setSelectedFrame(frame);
    
    // You can now use the frame's canvasJson in your editor
    // applyFrameToCanvas(frame.canvasJson);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Select a Frame</h2>
      
      <ProductFramesSelector
        productId={productId}
        onFrameSelect={handleFrameSelect}
        selectedFrameId={selectedFrame?._id}
        className="mb-6"
      />

      {selectedFrame && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">Selected Frame:</h3>
          <p>Name: {selectedFrame.frameName}</p>
          <p>ID: {selectedFrame._id}</p>
          <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto">
            {JSON.stringify(selectedFrame.canvasJson, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================
// EXAMPLE 2: Direct API Call in useEffect
// ============================================
export function Example2_DirectAPICall() {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [loading, setLoading] = useState(false);
  const productId = 'product_123';

  React.useEffect(() => {
    const loadFrames = async () => {
      setLoading(true);
      try {
        const response = await designService.getProductFrames(productId);
        if (response.success) {
          setFrames(response.data);
        }
      } catch (error) {
        console.error('Failed to load frames:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFrames();
  }, [productId]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Available Frames</h2>
      
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {frames.map(frame => (
            <div key={frame._id} className="border rounded p-4">
              <img 
                src={frame.thumbnail || frame.image} 
                alt={frame.frameName}
                className="w-full h-32 object-cover rounded mb-2"
              />
              <p className="font-medium">{frame.frameName}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// EXAMPLE 3: Using Helper Method
// ============================================
export function Example3_HelperMethod() {
  const [frames, setFrames] = useState<Frame[]>([]);

  const loadFrames = async (productId: string) => {
    // Using the helper method (simpler)
    const framesData = await designService.loadProductFrames(productId);
    setFrames(framesData);
  };

  React.useEffect(() => {
    loadFrames('product_123');
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Frames (Helper Method)</h2>
      <p className="text-gray-600 mb-4">
        Loaded {frames.length} frames using loadProductFrames()
      </p>
      
      <div className="space-y-2">
        {frames.map(frame => (
          <div key={frame._id} className="flex items-center gap-3 p-3 border rounded">
            {frame.thumbnail && (
              <img 
                src={frame.thumbnail} 
                alt={frame.frameName}
                className="w-16 h-16 object-cover rounded"
              />
            )}
            <div>
              <p className="font-medium">{frame.frameName}</p>
              <p className="text-sm text-gray-500">
                {frame.dimensions?.width} × {frame.dimensions?.height}
                {frame.dimensions?.unit}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// EXAMPLE 4: Integration with Design Editor
// ============================================
export function Example4_DesignEditorIntegration() {
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  const [canvasData, setCanvasData] = useState<any>(null);
  const productId = 'product_123';

  const applyFrameToCanvas = (frame: Frame) => {
    setSelectedFrame(frame);
    
    // Apply the frame's canvas JSON to your editor
    setCanvasData(frame.canvasJson);
    
    // If using Fabric.js or similar:
    // canvas.loadFromJSON(frame.canvasJson, () => {
    //   canvas.renderAll();
    // });
    
    console.log('Applied frame to canvas:', frame.frameName);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar with frames */}
      <div className="w-80 border-r overflow-y-auto p-4">
        <h3 className="font-bold mb-4">Choose Frame</h3>
        <ProductFramesSelector
          productId={productId}
          onFrameSelect={applyFrameToCanvas}
          selectedFrameId={selectedFrame?._id}
        />
      </div>

      {/* Canvas area */}
      <div className="flex-1 p-6">
        <h2 className="text-2xl font-bold mb-4">Design Editor</h2>
        
        {selectedFrame ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
            <p className="text-center text-gray-600 mb-4">
              Canvas with frame: {selectedFrame.frameName}
            </p>
            
            {/* Your canvas component here */}
            <div className="bg-white shadow-lg rounded-lg p-4">
              <pre className="text-xs overflow-auto">
                {JSON.stringify(canvasData, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
            Select a frame from the sidebar to start designing
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// EXAMPLE 5: Async/Await Pattern
// ============================================
export function Example5_AsyncAwaitPattern() {
  const handleLoadFrames = async () => {
    try {
      // Method 1: Using getProductFrames
      const response = await designService.getProductFrames('product_123');
      
      if (response.success) {
        console.log('Frames loaded:', response.data);
        
        // Process frames
        response.data.forEach(frame => {
          console.log(`Frame: ${frame.frameName}`);
          console.log(`Dimensions: ${frame.dimensions?.width}x${frame.dimensions?.height}`);
        });
      }
    } catch (error) {
      console.error('Error loading frames:', error);
    }
  };

  return (
    <div className="p-6">
      <button
        onClick={handleLoadFrames}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Load Frames
      </button>
    </div>
  );
}

// ============================================
// EXAMPLE 6: With Error Handling
// ============================================
export function Example6_WithErrorHandling() {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadFramesWithErrorHandling = async (productId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await designService.getProductFrames(productId);
      
      if (response.success) {
        if (response.data.length === 0) {
          setError('No frames available for this product');
        } else {
          setFrames(response.data);
        }
      } else {
        setError('Failed to load frames');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
      console.error('Frame loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <button
        onClick={() => loadFramesWithErrorHandling('product_123')}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Load Frames'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded">
          {error}
        </div>
      )}

      {frames.length > 0 && (
        <div className="mt-4">
          <p className="font-semibold">Loaded {frames.length} frames</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// USAGE IN EXISTING PAGES
// ============================================

/**
 * How to integrate in CardEditorPage.tsx:
 */
/*
import ProductFramesSelector from '../components/ProductFramesSelector';
import { Frame } from '../services/design.service';

// Inside your component:
const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);

const handleFrameSelect = (frame: Frame) => {
  setSelectedFrame(frame);
  // Apply frame to your card editor
  applyFrameToCard(frame.canvasJson);
};

// In your JSX:
<ProductFramesSelector
  productId={productId}
  onFrameSelect={handleFrameSelect}
  selectedFrameId={selectedFrame?._id}
/>
*/

/**
 * How to integrate in DesignEditorPage.tsx:
 */
/*
import designService from '../services/design.service';

useEffect(() => {
  const loadFrames = async () => {
    const frames = await designService.loadProductFrames(productId);
    setAvailableFrames(frames);
  };
  
  if (productId) {
    loadFrames();
  }
}, [productId]);
*/

/**
 * How to integrate in ProductDetailPage.tsx:
 */
/*
// Show frame count in product details
const [frameCount, setFrameCount] = useState(0);

useEffect(() => {
  const checkFrames = async () => {
    const response = await designService.getProductFrames(product._id);
    if (response.success) {
      setFrameCount(response.data.length);
    }
  };
  
  checkFrames();
}, [product._id]);

// Display in UI:
{frameCount > 0 && (
  <p className="text-sm text-gray-600">
    {frameCount} design frames available
  </p>
)}
*/
