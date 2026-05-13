import React, { useCallback, useMemo, useRef, useState } from 'react';
import { PinturaEditor } from '@pqina/react-pintura';
import {
  createDefaultImageWriter,
  getEditorDefaults,
  type PinturaDefaultImageWriterResult,
} from '@pqina/pintura';
import { resolveImageUrl } from '../../utils/image.utils';

import '@pqina/pintura/pintura.css';

interface PinturaCropModalProps {
  src: string;
  slotId?: string;
  aspectRatio?: number;
  outputSize?: { width: number; height: number };
  onSave: (data: {
    dataUrl: string;
    file?: File;
    width: number;
    height: number;
  }) => void;
  onCancel: () => void;
}

const PinturaCropModal: React.FC<PinturaCropModalProps> = ({
  src,
  aspectRatio,
  outputSize = { width: 1200, height: 1200 },
  onSave,
  onCancel,
}) => {
  const editorRef = useRef<any>(null);
  const [processing, setProcessing] = useState(false);
  const editorConfig = useMemo(
    () => getEditorDefaults({
      imageWriter: createDefaultImageWriter({
        targetSize: {
          ...outputSize,
          fit: 'cover',
        },
      }),
    }),
    [outputSize],
  );

  const handleProcess = useCallback(async (result: PinturaDefaultImageWriterResult) => {
    if (processing) return;

    setProcessing(true);
    try {
      const file = result.dest;
      const dataUrl = URL.createObjectURL(file);

      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.src = dataUrl;
      });

      onSave({
        dataUrl,
        file,
        width: img.width,
        height: img.height,
      });
    } catch (error) {
      console.error('Pintura process failed:', error);
    } finally {
      setProcessing(false);
    }
  }, [onSave, processing]);

  const handleReset = useCallback(() => {
    if (editorRef.current?.editor) {
      editorRef.current.editor.reset();
    }
  }, []);

  const resolvedSrc = resolveImageUrl(src);
  const cropAspectRatio = aspectRatio || outputSize.width / outputSize.height;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="bg-white rounded-2xl overflow-hidden shadow-2xl"
        style={{
          width: '95vw',
          maxWidth: 1000,
          height: '90vh',
          maxHeight: 800,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: '#e5e7eb' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Edit Image</h3>
              <p className="text-xs text-gray-500">Crop, rotate, and adjust your image</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              Reset
            </button>
            <button
              onClick={onCancel}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden bg-gray-900">
          <PinturaEditor
            ref={editorRef}
            {...editorConfig}
            src={resolvedSrc}
            imageCropAspectRatio={cropAspectRatio}
            imageCropLimitToImage={false}
            imageCropMinSize={{ width: 200, height: 200 }}
            imageCropMaxSize={{ width: 4096, height: 4096 }}
            cropEnableButtonFlipHorizontal={true}
            cropEnableButtonFlipVertical={true}
            cropEnableButtonRotateLeft={true}
            cropEnableButtonRotateRight={true}
            cropEnableRotationInput={true}
            cropEnableZoomInput={true}
            onProcess={handleProcess}
            onClose={onCancel}
          />
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4 border-t"
          style={{ borderColor: '#e5e7eb', background: '#f9fafb' }}
        >
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Mouse wheel to zoom</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span>Drag to pan</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span>Rotate with handles</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              disabled={processing}
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (editorRef.current?.editor) {
                  editorRef.current.editor.processImage();
                }
              }}
              disabled={processing}
              className="px-6 py-2 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition disabled:opacity-50 flex items-center gap-2"
            >
              {processing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </>
              ) : (
                'Apply Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PinturaCropModal;
