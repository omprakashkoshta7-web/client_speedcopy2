import React, { useState, useCallback } from 'react';
import { getCroppedImg } from './utils/cropImage';

interface ImageEditorProps {
  imageSrc: string;
  onSave: (croppedImage: string) => void;
  onCancel: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ imageSrc, onSave, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels] = useState({ x: 0, y: 0, width: 800, height: 600 });

  const handleSave = useCallback(async () => {
    const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
    onSave(croppedImage);
  }, [croppedAreaPixels, imageSrc, rotation, onSave]);

  return (
    <div style={{ width: '100%', background: '#333', padding: 16, borderRadius: 12 }}>
      <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <img
          src={imageSrc}
          alt="Crop preview"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            transform: `translate(${crop.x}px, ${crop.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            transition: 'transform 120ms ease',
          }}
        />
      </div>
      <div style={{ marginTop: 16, color: '#fff' }}>
        <label>Zoom</label>
        <input
          type="range"
          value={zoom}
          min={1}
          max={3}
          step={0.1}
          onChange={(event) => setZoom(Number(event.target.value))}
          style={{ width: '100%' }}
        />
        <label>Rotate</label>
        <input
          type="range"
          value={rotation}
          min={0}
          max={360}
          step={1}
          onChange={(event) => setRotation(Number(event.target.value))}
          style={{ width: '100%' }}
        />
        <label>Move X</label>
        <input
          type="range"
          value={crop.x}
          min={-200}
          max={200}
          step={1}
          onChange={(event) => setCrop((prev) => ({ ...prev, x: Number(event.target.value) }))}
          style={{ width: '100%' }}
        />
        <label>Move Y</label>
        <input
          type="range"
          value={crop.y}
          min={-200}
          max={200}
          step={1}
          onChange={(event) => setCrop((prev) => ({ ...prev, y: Number(event.target.value) }))}
          style={{ width: '100%' }}
        />
        <button type="button" onClick={handleSave} style={{ marginRight: 8, padding: '8px 16px' }}>
          Save
        </button>
        <button type="button" onClick={onCancel} style={{ padding: '8px 16px' }}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ImageEditor;
