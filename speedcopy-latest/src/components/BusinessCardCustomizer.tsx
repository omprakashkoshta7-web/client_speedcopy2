import React from 'react';
import { Palette } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type BusinessCardCustomizerProps = {
  onCustomizationChange?: (data: BusinessCardCustomization) => void;
  productImage?: string;   // selected product image to pass to editor
};

export type BusinessCardCustomization = {
  uploadedImage?: string;
  designTemplate?: string;
  textContent?: {
    name?: string;
    title?: string;
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
  };
  colorScheme?: string;
  layout?: string;
};

const BusinessCardCustomizer: React.FC<BusinessCardCustomizerProps> = ({ productImage }) => {
  const navigate = useNavigate();

  const handleCustomizeClick = () => {
    // Pass product image as query param so CardEditorPage can preload it
    if (productImage) {
      navigate(`/card-editor?productImage=${encodeURIComponent(productImage)}`);
    } else {
      navigate('/card-editor');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header with only Customize Card button */}
      <div className="px-6 py-6 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">Customize Your Business Card</h3>
          <p className="text-sm text-gray-600 mt-1">Upload your design or use our templates</p>
        </div>
        <button
          onClick={handleCustomizeClick}
          className="px-6 py-2.5 bg-gray-900 text-white rounded-full font-semibold text-sm hover:bg-gray-800 transition flex items-center gap-2"
        >
          <Palette size={16} />
          Customize Card
        </button>
      </div>
    </div>
  );
};

export default BusinessCardCustomizer;
