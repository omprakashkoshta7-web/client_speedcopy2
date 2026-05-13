import React from 'react';
import type { SlotState } from '../../pages/CustomizationEditorPage';

interface LayersPanelProps {
  slots: { slotId: string; name: string; type: 'image' | 'text' }[];
  slotStates: Record<string, SlotState>;
  activeSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
  onReorder: (slotIds: string[]) => void;
  onToggleVisibility: (slotId: string) => void;
}

const LayersPanel: React.FC<LayersPanelProps> = ({
  slots,
  slotStates,
  activeSlotId,
  onSelectSlot,
  onToggleVisibility,
}) => {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Layers</p>
      
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {slots.map((slot, index) => {
          const state = slotStates[slot.slotId];
          const isActive = activeSlotId === slot.slotId;
          const hasContent = slot.type === 'image' 
            ? !!(state?.previewUrl || state?.uploadedAsset) 
            : !!(state?.text?.value);
          
          return (
            <div
              key={slot.slotId}
              onClick={() => onSelectSlot(slot.slotId)}
              className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition text-xs"
              style={{
                backgroundColor: isActive ? '#fff7ed' : '#fff',
                border: `1px solid ${isActive ? '#f97316' : '#e5e7eb'}`,
              }}
            >
              {/* Drag handle (placeholder for future) */}
              <span className="text-gray-300 cursor-move">⠿</span>
              
              {/* Type icon */}
              <span className="text-sm">
                {slot.type === 'image' ? '🖼️' : '📝'}
              </span>
              
              {/* Layer name */}
              <span className={`flex-1 truncate ${hasContent ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                {slot.name}
              </span>
              
              {/* Visibility toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); onToggleVisibility(slot.slotId); }}
                className="text-gray-400 hover:text-gray-600"
                title="Toggle visibility"
              >
                {state?.visible !== false ? '👁️' : '🚫'}
              </button>
              
              {/* Order badges */}
              <span className="text-[9px] text-gray-400">#{index + 1}</span>
            </div>
          );
        })}
      </div>
      
      <p className="text-[9px] text-gray-400 italic">
        Tip: Click layer to edit, drag to reorder (coming soon)
      </p>
    </div>
  );
};

export default LayersPanel;
