import React, { useEffect, useState } from 'react';
import type { Frame } from '../services/design.service';
import designService from '../services/design.service';
import { Loader2, Image as ImageIcon } from 'lucide-react';

interface ProductFramesSelectorProps {
  productId: string;
  onFrameSelect?: (frame: Frame) => void;
  selectedFrameId?: string;
  className?: string;
}

/**
 * Product Frames Selector Component
 * Fetches and displays frames for a specific product using the Frames API
 * GET /api/designs/product/:productId/frames
 */
const ProductFramesSelector: React.FC<ProductFramesSelectorProps> = ({
  productId,
  onFrameSelect,
  selectedFrameId,
  className = '',
}) => {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFrames = async () => {
      if (!productId) {
        setError('Product ID is required');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log('🖼️ Fetching frames for product:', productId);
        const response = await designService.getProductFrames(productId);

        if (response.success) {
          setFrames(response.data);
          console.log('✅ Loaded frames:', response.data.length);
        } else {
          setError('Failed to load frames');
        }
      } catch (err) {
        console.error('❌ Error loading frames:', err);
        setError('Failed to load frames. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchFrames();
  }, [productId]);

  const handleFrameClick = (frame: Frame) => {
    if (onFrameSelect) {
      onFrameSelect(frame);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading frames...</span>
      </div>
    );
  }

  // Silently hide if error or no frames — don't show error to user
  if (error || frames.length === 0) {
    return null;
  }

  return (
    <div className={`${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Select a Frame
        </h3>
        <p className="text-sm text-gray-600">
          {frames.length} frame{frames.length !== 1 ? 's' : ''} available
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {frames.map((frame) => (
          <div
            key={frame._id}
            onClick={() => handleFrameClick(frame)}
            className={`
              relative cursor-pointer rounded-lg border-2 overflow-hidden
              transition-all duration-200 hover:shadow-lg
              ${
                selectedFrameId === frame._id
                  ? 'border-blue-600 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-blue-400'
              }
            `}
          >
            {/* Frame Preview Image */}
            <div className="aspect-[3/2] bg-gray-100 flex items-center justify-center">
              {frame.thumbnail || frame.image ? (
                <img
                  src={frame.thumbnail || frame.image}
                  alt={frame.frameName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback if image fails to load
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = `
                      <div class="flex items-center justify-center w-full h-full">
                        <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    `;
                  }}
                />
              ) : (
                <ImageIcon className="w-12 h-12 text-gray-400" />
              )}
            </div>

            {/* Frame Name */}
            <div className="p-3 bg-white">
              <p className="text-sm font-medium text-gray-900 truncate">
                {frame.frameName || frame.name}
              </p>
              {frame.dimensions && (
                <p className="text-xs text-gray-500 mt-1">
                  {frame.dimensions.width} × {frame.dimensions.height}
                  {frame.dimensions.unit}
                </p>
              )}
            </div>

            {/* Selected Indicator */}
            {selectedFrameId === frame._id && (
              <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductFramesSelector;
