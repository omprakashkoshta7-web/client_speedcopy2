import React, { useState, useCallback } from 'react';
import ImageSlotEditor from './ImageSlotEditor';
import TextSlotEditor from './TextSlotEditor';
import CanvasPreview from './CanvasPreview';
import FinalizeCustomizationButton from './FinalizeCustomizationButton';
import { type CustomizationAsset } from '../../services/design.service';

interface CustomizationEditorProps {
  templateConfig: any;
  customizationId?: string;
  onAssetUpload?: (slotId: string, asset: CustomizationAsset) => void;
}

const CustomizationEditor: React.FC<CustomizationEditorProps> = ({ 
  templateConfig, 
  customizationId,
  onAssetUpload 
}) => {
  const [slotValues, setSlotValues] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [finalized, setFinalized] = useState(false);

  const handleSlotChange = useCallback((slotId: string, value: any) => {
    setSlotValues(prev => ({ ...prev, [slotId]: value }));
  }, []);

  const handleFinalize = () => {
    setFinalized(true);
    setError(null);
  };

  const handleSlotImageEdit = (slotId: string, newImage: string) => {
    setSlotValues(prev => ({ ...prev, [slotId]: { ...prev[slotId], previewUrl: newImage } }));
  };

  if (!templateConfig?.template) return <div>No template loaded.</div>;

  return (
    <div className="space-y-4">
      <CanvasPreview
        template={templateConfig.template}
        slotValues={slotValues}
        onSlotImageEdit={handleSlotImageEdit}
      />
      {templateConfig.template.slots.map((slot: any) => (
        <div key={slot.slotId}>
          {slot.type === 'image' ? (
            <ImageSlotEditor 
              slot={slot} 
              customizationId={customizationId}
              value={slotValues[slot.slotId]} 
              onChange={val => handleSlotChange(slot.slotId, val)}
              onAssetUpload={(asset) => onAssetUpload?.(slot.slotId, asset)}
            />
          ) : slot.type === 'text' ? (
            <TextSlotEditor slot={slot} value={slotValues[slot.slotId]} onChange={val => handleSlotChange(slot.slotId, val)} />
          ) : null}
        </div>
      ))}
      {error && <div className="text-red-500">{error}</div>}
      <FinalizeCustomizationButton onFinalize={handleFinalize} disabled={finalized} />
    </div>
  );
};

export default CustomizationEditor;
