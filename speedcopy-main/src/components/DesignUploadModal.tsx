import React, { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle } from 'lucide-react';

interface DesignUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (files: File[]) => void;
  productName: string;
}

const DesignUploadModal: React.FC<DesignUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete,
  productName,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const validFiles = Array.from(files).filter(file => {
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'application/postscript', 'image/vnd.adobe.photoshop'];
      return validTypes.includes(file.type) || file.name.endsWith('.ai') || file.name.endsWith('.psd');
    });

    setUploadedFiles(prev => [...prev, ...validFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (uploadedFiles.length > 0) {
      onUploadComplete(uploadedFiles);
      setUploadedFiles([]);
      onClose();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-gray-900" style={{ fontSize: '20px' }}>Upload Your Design</h2>
            <p className="text-sm text-gray-500 mt-1">For: {productName}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center mb-5 transition ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <Upload size={32} className="text-blue-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-2">Drag & drop your files here</h3>
          <p className="text-sm text-gray-500 mb-4">or click to browse</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Browse Files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.ai,.psd"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <p className="text-xs text-gray-400 mt-4">
            Supported formats: PDF, PNG, JPG, AI, PSD (Max 50MB per file)
          </p>
        </div>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="mb-5">
            <h3 className="font-bold text-gray-900 mb-3 text-sm">
              Uploaded Files ({uploadedFiles.length})
            </h3>
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <FileText size={20} className="text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                  <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 hover:bg-red-100 rounded transition flex-shrink-0"
                  >
                    <X size={16} className="text-red-600" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-4 mb-5">
          <h4 className="font-bold text-gray-900 text-sm mb-2">Design Guidelines:</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Ensure your design is print-ready with correct dimensions</li>
            <li>• Use high resolution (300 DPI minimum)</li>
            <li>• Include bleed area if required (3mm on all sides)</li>
            <li>• Convert all text to outlines/curves</li>
            <li>• Use CMYK color mode for best results</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploadedFiles.length === 0}
            className="flex-1 px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue with {uploadedFiles.length} {uploadedFiles.length === 1 ? 'File' : 'Files'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DesignUploadModal;
