import React, { useState, useCallback } from 'react';
import PinturaCropModal from './PinturaCropModal';
import designService, { type CustomizationAsset } from '../../services/design.service';

interface ImageSlotEditorProps {
  slot: {
    slotId: string;
    name: string;
    type: string;
    geometry?: {
      width?: number;
      height?: number;
    };
    imageConfig?: {
      acceptedMimeTypes?: string[];
      fitMode?: 'cover' | 'contain' | 'fill';
      minZoom?: number;
      maxZoom?: number;
      minResolution?: { width: number; height: number };
      maxFileSizeMb?: number;
    };
  };
  customizationId?: string;
  value: {
    file?: File;
    previewUrl?: string;
    asset?: {
      assetId?: string;
      originalUrl?: string;
      processedUrl?: string;
    };
    transform?: {
      x?: number;
      y?: number;
      scale?: number;
      rotation?: number;
      zoom?: number;
    };
  };
  onChange: (value: any) => void;
  onAssetUpload?: (asset: CustomizationAsset) => void;
}

const ImageSlotEditor: React.FC<ImageSlotEditorProps> = ({ 
  slot, 
  customizationId,
  value, 
  onChange, 
  onAssetUpload 
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(value?.previewUrl || null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    onChange({ 
      file, 
      previewUrl: objectUrl, 
      transform: { scale: 1, x: 0, y: 0, rotation: 0, zoom: 1 } 
    });
  }, [onChange]);

  const handleCropSave = useCallback(async (cropped: {
    dataUrl: string;
    file: File;
    width: number;
    height: number;
  }) => {
    setPreviewUrl(cropped.dataUrl);
    setShowCropModal(false);
    
    const newState = {
      file: cropped.file,
      previewUrl: cropped.dataUrl,
      width: cropped.width,
      height: cropped.height,
      transform: { scale: 1, x: 0, y: 0, rotation: 0, zoom: 1 },
    };
    onChange(newState);

    if (customizationId && onAssetUpload) {
      await uploadAssetToBackend(cropped.file, newState);
    }
  }, [customizationId, onChange, onAssetUpload]);

  const uploadAssetToBackend = async (file: File, baseState?: any) => {
    if (!customizationId) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      const response = await designService.uploadCustomizationAsset(
        customizationId,
        file,
        (pct) => setUploadProgress(pct)
      );
      
      if (response.success && response.data) {
        onAssetUpload?.(response.data);
        onChange({
          ...baseState,
          asset: {
            assetId: response.data.assetId,
            originalUrl: response.data.originalUrl,
            processedUrl: response.data.processedUrl,
          },
        });
      }
    } catch (error) {
      console.error('Failed to upload asset:', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const aspectRatio = slot.geometry?.width && slot.geometry?.height
    ? slot.geometry.width / slot.geometry.height
    : 1;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <label className="block font-semibold text-gray-800 text-sm">
          {slot.name}
          {slot.imageConfig?.minResolution && (
            <span className="text-gray-500 font-normal ml-2">
              (min {slot.imageConfig.minResolution.width}x{slot.imageConfig.minResolution.height})
            </span>
          )}
        </label>
        
        {uploading && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Uploading {uploadProgress}%
          </div>
        )}
      </div>

      {!previewUrl ? (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 transition-all cursor-pointer group">
          <input
            type="file"
            accept={slot.imageConfig?.acceptedMimeTypes?.join(',') || 'image/*'}
            onChange={handleFileChange}
            className="hidden"
            id={`file-input-${slot.slotId}`}
          />
          <label
            htmlFor={`file-input-${slot.slotId}`}
            className="cursor-pointer flex flex-col items-center"
          >
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3 group-hover:bg-gray-200 transition">
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Click to upload image</span>
            <span className="text-xs text-gray-500 mt-1">
              JPG, PNG up to {slot.imageConfig?.maxFileSizeMb || 10}MB
            </span>
          </label>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div
            className="relative overflow-hidden rounded-xl border-2 border-gray-200 bg-gray-50"
            style={{
              width: 240,
              height: 240,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={previewUrl}
              alt={slot.name}
              className="max-w-full max-h-full object-contain"
            />
            
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                <svg className="w-8 h-8 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-white text-sm mt-2">{uploadProgress}%</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label
              htmlFor={`file-input-${slot.slotId}`}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition cursor-pointer"
            >
              Change
            </label>
            <input
              type="file"
              accept={slot.imageConfig?.acceptedMimeTypes?.join(',') || 'image/*'}
              onChange={handleFileChange}
              className="hidden"
              id={`file-input-${slot.slotId}`}
            />
            
            <button
              onClick={() => setShowCropModal(true)}
              disabled={uploading}
              className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
            >
              Crop & Edit
            </button>
          </div>
        </div>
      )}

      {showCropModal && previewUrl && (
        <PinturaCropModal
          src={previewUrl}
          slotId={slot.slotId}
          aspectRatio={aspectRatio}
          onSave={handleCropSave}
          onCancel={() => setShowCropModal(false)}
        />
      )}
    </div>
  );
};

export default ImageSlotEditor;