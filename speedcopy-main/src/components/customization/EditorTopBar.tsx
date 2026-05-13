import React from 'react';

interface EditorTopBarProps {
  productName: string;
  onBack: () => void;
  onPreview: () => void;
  saving: boolean;
  allFilled: boolean;
}

const EditorTopBar: React.FC<EditorTopBarProps> = ({
  productName,
  onBack,
  onPreview,
  saving,
  allFilled,
}) => (
  <div
    className="flex items-center justify-between px-4 bg-white z-20 flex-shrink-0"
    style={{ height: 56, borderBottom: '1px solid #f3f4f6', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}
  >
    {/* Back */}
    <button
      onClick={onBack}
      className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      <span className="text-sm font-medium hidden sm:inline">Back</span>
    </button>

    {/* Title */}
    <div className="text-center">
      <p className="font-bold text-gray-900 text-sm leading-tight truncate max-w-[160px] sm:max-w-xs">
        {productName}
      </p>
      <p className="text-[10px] text-gray-400 mt-0.5">Customization Editor</p>
    </div>

    {/* Preview */}
    <button
      onClick={onPreview}
      disabled={saving || !allFilled}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition disabled:opacity-40"
      style={{ background: allFilled ? '#111' : '#e5e7eb', color: allFilled ? '#fff' : '#9ca3af' }}
    >
      {saving ? (
        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
      {saving ? 'Generating…' : 'Preview'}
    </button>
  </div>
);

export default EditorTopBar;
