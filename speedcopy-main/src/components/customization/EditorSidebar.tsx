import React, { useRef, useState } from 'react';
import type { TemplateConfig, TemplateSlot } from '../../services/design.service';
import type { SlotState } from '../../pages/CustomizationEditorPage';
import PinturaCropModal from './PinturaCropModal';

interface EditorSidebarProps {
  template: TemplateConfig;
  slotStates: Record<string, SlotState>;
  activeSlotId: string | null;
  onSlotSelect: (slotId: string) => void;
  onImageUpload: (slotId: string, file: File) => void;
  onTransformChange: (slotId: string, transform: SlotState['transform']) => void;
  onTextChange: (slotId: string, text: SlotState['text']) => void;
  onDeleteText: () => void;
}

const EditorSidebar: React.FC<EditorSidebarProps> = ({
  template,
  slotStates,
  activeSlotId,
  onSlotSelect,
  onImageUpload,
  onTransformChange,
  onTextChange,
  onDeleteText,
}) => {
  
   return (
     <div
       className="w-full sm:w-80 bg-white overflow-y-auto flex-shrink-0 pb-20"
       style={{ borderRight: '1px solid #f3f4f6' }}
     >
       <div className="p-4 space-y-3">
         <div className="flex items-center justify-between gap-2 mb-3">
           <h2 className="font-bold text-gray-900 text-sm">Customization Slots</h2>
         </div>
         {template.slots.map(slot => {
           // Skip free text slots as they're not allowed per guide
           if (slot.slotId.startsWith('free_text_')) return null;
           
return (
              <SlotCard
                key={slot.slotId}
                slot={slot}
                state={slotStates[slot.slotId]}
                isActive={activeSlotId === slot.slotId}
                onSelect={() => onSlotSelect(slot.slotId)}
                onImageUpload={file => onImageUpload(slot.slotId, file)}
                onTransformChange={t => onTransformChange(slot.slotId, t)}
                onTextChange={txt => onTextChange(slot.slotId, txt)}
                onDeleteText={onDeleteText}
              />
            );
         })}
       </div>
     </div>
   );
};

// ─── Slot Card ────────────────────────────────────────────────────────────────
interface SlotCardProps {
  slot: TemplateSlot;
  state?: SlotState;
  isActive: boolean;
  onSelect: () => void;
  onImageUpload: (file: File) => void;
  onTransformChange: (transform: SlotState['transform']) => void;
  onTextChange: (text: SlotState['text']) => void;
  onDeleteText: () => void;
}

const SlotCard: React.FC<SlotCardProps> = ({
  slot,
  state,
  isActive,
  onSelect,
  onImageUpload,
  onTransformChange,
  onTextChange,
  onDeleteText,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) onImageUpload(e.target.files[0]);
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) onImageUpload(e.target.files[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onImageUpload(files[0]);
    }
  };

  const aspectRatio = slot.geometry?.width && slot.geometry?.height
    ? slot.geometry.width / slot.geometry.height
    : undefined;

  const outputSize = {
    width: Math.max(800, slot.geometry?.width ?? 1200),
    height: Math.max(800, slot.geometry?.height ?? 1200),
  };

return (
  <div
    onClick={onSelect}
    onDragOver={handleDragOver}
    onDrop={handleDrop}
    className="border rounded-xl p-3 cursor-pointer transition"
    style={{
      borderColor: isActive ? '#f97316' : '#e5e7eb',
      backgroundColor: isActive ? '#fff7ed' : '#fff',
      boxShadow: isActive ? '0 0 0 3px rgba(249,115,22,0.1)' : 'none',
    }}
  >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {slot.type === 'image' ? (
            <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900 text-xs leading-tight">{slot.name}</p>
            {slot.required !== false && (
              <span className="text-[9px] text-red-400 font-medium">Required</span>
            )}
          </div>
        </div>
        {state?.saved && (
          <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Image slot controls */}
{slot.type === 'image' && (
         <div className="space-y-2">
           <div
             onDragOver={handleDragOver}
             onDrop={handleDrop}
             className={`border-2 border-dashed rounded-lg p-4 text-center transition-all ${
               state?.uploading ? 'border-orange-400 bg-orange-50' : 'border-gray-300 bg-gray-50'
             }`}
           >
             <p className="text-sm text-gray-600 mb-2">
               {state?.uploading 
                 ? `Uploading ${state.uploadProgress ?? 0}%` 
                 : 'Drag & drop image here, or click to select'}
             </p>
             <p className="text-xs text-gray-500">
               PNG, JPG, GIF (Max 10MB)
             </p>
             <input
               ref={fileInputRef}
               type="file"
               accept={slot.imageConfig?.acceptedMimeTypes?.join(',') || 'image/*'}
               onChange={handleFileChange}
               className="hidden"
               multiple
             />
             {/* Camera input */}
             <input
               ref={cameraInputRef}
               type="file"
               accept="image/*"
               capture="environment"
               onChange={handleCameraCapture}
               className="hidden"
             />
           </div>
           
           {/* Upload buttons */}
           <div className="grid grid-cols-3 gap-1.5">
             <button
               onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
               className="py-2 rounded-lg text-[10px] font-bold transition bg-orange-500 text-white hover:bg-orange-600"
             >
               📁 Gallery
             </button>
             <button
               onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}
               className="py-2 rounded-lg text-[10px] font-bold transition bg-blue-500 text-white hover:bg-blue-600"
             >
               📸 Camera
             </button>
             <button
               onClick={e => { e.stopPropagation(); alert('Social media import coming soon!'); }}
               className="py-2 rounded-lg text-[10px] font-bold transition bg-purple-500 text-white hover:bg-purple-600"
               title="Import from Facebook, Instagram, etc."
             >
               🌐 Social
             </button>
           </div>

          {state?.previewUrl && (
            <div
              className="rounded-lg border border-gray-200 bg-white overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="h-28 bg-gray-100 flex items-center justify-center">
                <img
                  src={state.previewUrl}
                  alt={slot.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <button
                onClick={e => {
                  e.stopPropagation();
                  setShowCropModal(true);
                }}
                disabled={state.uploading}
                className="w-full py-2 text-[10px] font-bold bg-black text-white hover:bg-gray-800 transition disabled:opacity-50"
              >
                Crop & Edit
              </button>
            </div>
          )}

          {state?.uploadError && (
            <p className="text-[10px] text-red-500">{state.uploadError}</p>
          )}

          {/* Transform controls */}
          {state?.previewUrl && slot.behavior?.zoomEnabled && (
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1">Zoom</label>
              <input
                type="range"
                min={slot.imageConfig?.minZoom ?? 1}
                max={slot.imageConfig?.maxZoom ?? 3}
                step={0.01}
                value={state.transform?.zoom ?? 1}
                onChange={e => onTransformChange({ x: 0, y: 0, scale: 1, rotation: 0, ...state?.transform, zoom: Number(e.target.value) })}
                onClick={e => e.stopPropagation()}
                className="w-full"
              />
            </div>
          )}

          {state?.previewUrl && slot.behavior?.movable && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">Move X</label>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={state.transform?.x ?? 0}
                  onChange={e => { const t = { x: 0, y: 0, scale: 1, rotation: 0, zoom: 1, ...state?.transform }; onTransformChange({ ...t, x: Number(e.target.value) }); }}
                  onClick={e => e.stopPropagation()}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">Move Y</label>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={state.transform?.y ?? 0}
                  onChange={e => { const t = { x: 0, y: 0, scale: 1, rotation: 0, zoom: 1, ...state?.transform }; onTransformChange({ ...t, y: Number(e.target.value) }); }}
                  onClick={e => e.stopPropagation()}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {state?.previewUrl && slot.behavior?.rotateEnabled && (
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1">Rotate</label>
              <input
                type="range"
                min={0}
                max={360}
                value={state.transform?.rotation ?? 0}
                onChange={e => onTransformChange({ x: 0, y: 0, scale: 1, zoom: 1, ...state?.transform, rotation: Number(e.target.value) })}
                onClick={e => e.stopPropagation()}
                className="w-full"
              />
            </div>
          )}

          {/* Crop controls */}
          {state?.previewUrl && slot.behavior?.cropEnabled && (
            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              <p className="text-[10px] font-medium text-gray-500">Crop Tool</p>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="block text-[9px] text-gray-400">X%</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={state.crop?.x ?? 0}
                    onChange={e => onTransformChange({ 
                      ...state?.transform, 
                      x: Number(e.target.value) 
                    })}
                    onClick={e => e.stopPropagation()}
                    className="w-full px-1 py-0.5 border border-gray-200 rounded text-[10px]"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-gray-400">Y%</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={state.crop?.y ?? 0}
                    onChange={e => onTransformChange({ 
                      ...state?.transform, 
                      y: Number(e.target.value) 
                    })}
                    onClick={e => e.stopPropagation()}
                    className="w-full px-1 py-0.5 border border-gray-200 rounded text-[10px]"
                  />
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); 
                  onTransformChange({ ...state?.transform, scale: 1, x: 0, y: 0, rotation: 0, zoom: 1 });
                }}
                className="w-full py-1 rounded text-[10px] font-medium bg-gray-100 hover:bg-gray-200 transition"
              >
                Reset Transform
              </button>
            </div>
          )}

          {showCropModal && state?.previewUrl && (
            <PinturaCropModal
              src={state.previewUrl}
              slotId={slot.slotId}
              aspectRatio={aspectRatio}
              outputSize={outputSize}
              onSave={({ file }) => {
                setShowCropModal(false);
                if (file) onImageUpload(file);
              }}
              onCancel={() => setShowCropModal(false)}
            />
          )}
        </div>
      )}

      {/* Text slot controls */}
      {slot.type === 'text' && (
        <div className="space-y-2">
          {slot.slotId.startsWith('free_text_') && (
            <button
              onClick={e => {
                e.stopPropagation();
                onDeleteText();
              }}
              className="w-full py-2 rounded-lg text-[10px] font-bold bg-red-50 text-red-600 hover:bg-red-100 transition"
            >
              Delete Text
            </button>
          )}

          <textarea
            value={state?.text?.value ?? ''}
            maxLength={slot.textConfig?.maxLength ?? 100}
            onChange={e => onTextChange({ ...state?.text, value: e.target.value } as SlotState['text'])}
            onClick={e => e.stopPropagation()}
            placeholder={`Enter ${slot.name.toLowerCase()}…`}
            className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
            rows={2}
          />

          <div className="space-y-2 pt-2 border-t border-gray-100">
            <p className="text-[10px] font-medium text-gray-500">Position</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">
                  Move X: {Math.round(state?.transform?.x ?? 0)}
                </label>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={state?.transform?.x ?? 0}
                  onChange={e => {
                    const t = { x: 0, y: 0, scale: 1, rotation: 0, zoom: 1, ...state?.transform };
                    onTransformChange({ ...t, x: Number(e.target.value) });
                  }}
                  onClick={e => e.stopPropagation()}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">
                  Move Y: {Math.round(state?.transform?.y ?? 0)}
                </label>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={state?.transform?.y ?? 0}
                  onChange={e => {
                    const t = { x: 0, y: 0, scale: 1, rotation: 0, zoom: 1, ...state?.transform };
                    onTransformChange({ ...t, y: Number(e.target.value) });
                  }}
                  onClick={e => e.stopPropagation()}
                  className="w-full"
                />
              </div>
            </div>
            <button
              onClick={e => {
                e.stopPropagation();
                onTransformChange({ x: 0, y: 0, scale: 1, rotation: 0, zoom: 1 });
              }}
              className="w-full py-1.5 rounded text-[10px] font-medium bg-gray-100 hover:bg-gray-200 transition"
            >
              Reset Position
            </button>
          </div>

          {/* Font family */}
          {slot.textConfig?.allowedFonts && slot.textConfig.allowedFonts.length > 0 && (
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1">Font</label>
              <select
                value={state?.text?.fontFamily ?? slot.textConfig.defaultFontFamily ?? 'Roboto'}
                onChange={e => onTextChange({ ...state?.text, fontFamily: e.target.value } as SlotState['text'])}
                onClick={e => e.stopPropagation()}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                {slot.textConfig.allowedFonts.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          )}

          {/* Font size */}
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-1">
              Size: {state?.text?.fontSize ?? slot.textConfig?.defaultFontSize ?? 24}px
            </label>
            <input
              type="range"
              min={slot.textConfig?.minFontSize ?? 12}
              max={slot.textConfig?.maxFontSize ?? 72}
              value={state?.text?.fontSize ?? slot.textConfig?.defaultFontSize ?? 24}
              onChange={e => onTextChange({ ...state?.text, fontSize: Number(e.target.value) } as SlotState['text'])}
              onClick={e => e.stopPropagation()}
              className="w-full"
            />
          </div>

          {/* Color */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-medium text-gray-500">Color</label>
            <input
              type="color"
              value={state?.text?.color ?? slot.textConfig?.color ?? '#111111'}
              onChange={e => onTextChange({ ...state?.text, color: e.target.value } as SlotState['text'])}
              onClick={e => e.stopPropagation()}
              className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
            />
            <span className="text-[10px] text-gray-400 font-mono">
              {state?.text?.color ?? slot.textConfig?.color ?? '#111111'}
            </span>
          </div>

          {/* Alignment */}
          <div>
            <label className="block text-[10px] font-medium text-gray-500 mb-1">Alignment</label>
            <div className="flex gap-1">
              {(['left', 'center', 'right'] as const).map(align => (
                <button
                  key={align}
                  onClick={e => { e.stopPropagation(); onTextChange({ ...state?.text, alignment: align } as SlotState['text']); }}
                  className="flex-1 py-1.5 rounded text-xs font-medium transition"
                  style={{
                    background: (state?.text?.alignment ?? 'center') === align ? '#111' : '#f3f4f6',
                    color: (state?.text?.alignment ?? 'center') === align ? '#fff' : '#6b7280',
                  }}
                >
                  {align[0].toUpperCase() + align.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorSidebar;
