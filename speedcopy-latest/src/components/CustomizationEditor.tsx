import React, { useEffect, useState } from 'react';
import designService from '../services/design.service';

interface TemplateConfig {
  id: string;
  name: string;
  canvas: { width: number; height: number; unit: string; dpi?: number };
  slots: Array<{
    slotId: string;
    name: string;
    type: 'image' | 'text';
    geometry: { x: number; y: number; width: number; height: number };
    required?: boolean;
  }>;
  assets: {
    editorBaseImage?: string;
    overlayImage?: string;
    maskImage?: string;
    mockupSceneImage?: string;
  };
}

interface CustomizationEditorProps {
  variantId: string;
  templateId: string;
}

const CustomizationEditor: React.FC<CustomizationEditorProps> = ({ variantId, templateId }) => {
  const [config, setConfig] = useState<TemplateConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchConfig() {
      setLoading(true);
      setError('');
      try {
        // Prefer fetching by templateId for accuracy
        const res = await designService.getTemplateById(templateId);
        if (res.success && res.data) {
          setConfig(res.data as TemplateConfig);
        } else {
          setError('Template not found');
        }
      } catch (e) {
        setError('Failed to load template config');
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, [variantId, templateId]);

  if (loading) return <div>Loading editor...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!config) return null;

  return (
    <div style={{ padding: 24 }}>
      <h2>Editor: {config.name}</h2>
      <div style={{ border: '1px solid #ddd', width: config.canvas.width, height: config.canvas.height, position: 'relative', background: '#fafafa' }}>
        {/* Render slots */}
        {config.slots.map(slot => (
          <div
            key={slot.slotId}
            style={{
              position: 'absolute',
              left: slot.geometry.x,
              top: slot.geometry.y,
              width: slot.geometry.width,
              height: slot.geometry.height,
              border: '1px dashed #888',
              background: slot.type === 'image' ? '#e0e7ff' : '#fef9c3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: '#333',
            }}
          >
            {slot.type === 'image' ? 'Image Slot' : 'Text Slot'}
            <br />
            {slot.name}
          </div>
        ))}
        {/* Overlay, mask, etc. can be rendered here using config.assets */}
      </div>
      {/* Add upload, text input, preview, finalize controls here as needed */}
    </div>
  );
};

export default CustomizationEditor;
