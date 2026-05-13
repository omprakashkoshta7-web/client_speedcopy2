import React from 'react';

interface TextSlotEditorProps {
  slot: any;
  value: any;
  onChange: (value: any) => void;
}

const TextSlotEditor: React.FC<TextSlotEditorProps> = ({ slot, value, onChange }) => {
  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">{slot.name}</label>
      <input
        type="text"
        value={value?.text?.value || ''}
        maxLength={slot.textConfig?.maxLength || 50}
        onChange={e => onChange({ ...value, text: { ...value?.text, value: e.target.value } })}
        className="border px-2 py-1 rounded w-full"
      />
      {/* Font, color, alignment controls can be added here */}
    </div>
  );
};

export default TextSlotEditor;
