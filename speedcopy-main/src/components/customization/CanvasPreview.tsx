import React from 'react';
import { resolveImageUrl } from '../../utils/image.utils';

interface CanvasPreviewProps {
  template: any;
  slotValues?: Record<string, any>;
  onSlotImageEdit?: (slotId: string, newImage: string) => void;
}

const CanvasPreview: React.FC<CanvasPreviewProps> = ({ template, slotValues = {} }) => {
  const editorBaseImage = resolveImageUrl(template.assets?.editorBaseImage);
  
  // Use canvas dimensions from template
  const canvasWidth = template.canvas?.width || template.width || 800;
  const canvasHeight = template.canvas?.height || template.height || 600;
  const previewWidth = 400;
  const previewHeight = (canvasHeight / canvasWidth) * previewWidth;

  return (
    <div className="border w-full bg-gray-100 flex items-center justify-center relative" style={{ height: previewHeight }}>
      {editorBaseImage && (
        <img
          src={editorBaseImage}
          alt="Base"
          className="absolute top-0 left-0 w-full h-full object-contain z-0"
          style={{ pointerEvents: 'none' }}
        />
      )}
      {/* Render all image slots */}
      {template.slots?.filter((slot: any) => slot.type === 'image').map((slot: any) => {
        const slotValue = slotValues[slot.slotId];
        const previewUrl = slotValue?.previewUrl;
        const originalUrl = slotValue?.uploadedAsset?.originalUrl;
        const imageUrl = previewUrl || (originalUrl ? resolveImageUrl(originalUrl) : '');
        if (!imageUrl) return null;
        
        const geometryX = parseFloat(slot.geometry?.x || 0);
        const geometryY = parseFloat(slot.geometry?.y || 0);
        const geometryWidth = parseFloat(slot.geometry?.width || 200);
        const geometryHeight = parseFloat(slot.geometry?.height || 300);
        
        
        
        return (
          <div
            key={slot.slotId}
            className="absolute flex items-center justify-center overflow-hidden"
            style={{
              left: `${(geometryX / canvasWidth) * 100}%`,
              top: `${(geometryY / canvasHeight) * 100}%`,
              width: `${(geometryWidth / canvasWidth) * 100}%`,
              height: `${(geometryHeight / canvasHeight) * 100}%`,
              zIndex: 2,
              pointerEvents: 'auto',
            }}
          >
            <img
              src={imageUrl}
              alt={slot.name}
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: slot.imageConfig?.fitMode === 'contain' ? 'contain' : 'cover', 
                borderRadius: 8, 
                boxShadow: '0 2px 8px #0002' 
              }}
            />
          </div>
        );
      })}
      <span className="z-10 text-gray-400">Live Preview (Canvas)</span>
    </div>
  );
};

export default CanvasPreview;
