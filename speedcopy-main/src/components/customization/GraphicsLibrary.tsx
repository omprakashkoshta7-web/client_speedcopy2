import React, { useState } from 'react';

// Pre-made graphics/stickers library
const GRAPHICS_CATEGORIES = [
  {
    name: 'Shapes',
    items: [
      { id: 'shape-circle', name: 'Circle', svg: 'circle', color: '#f97316' },
      { id: 'shape-square', name: 'Square', svg: 'rect', color: '#3b82f6' },
      { id: 'shape-heart', name: 'Heart', svg: 'heart', color: '#ef4444' },
      { id: 'shape-star', name: 'Star', svg: 'star', color: '#eab308' },
    ],
  },
  {
    name: 'Occasions',
    items: [
      { id: 'occ-birthday', name: 'Birthday', emoji: '🎂' },
      { id: 'occ-wedding', name: 'Wedding', emoji: '💍' },
      { id: 'occ-anniversary', name: 'Anniversary', emoji: '🎉' },
      { id: 'occ-festival', name: 'Festival', emoji: '🎊' },
    ],
  },
  {
    name: 'Stickers',
    items: [
      { id: 'sticker-smile', name: 'Smile', emoji: '😊' },
      { id: 'sticker-love', name: 'Love', emoji: '❤️' },
      { id: 'sticker-star', name: 'Star', emoji: '⭐' },
      { id: 'sticker-flower', name: 'Flower', emoji: '🌸' },
      { id: 'sticker-music', name: 'Music', emoji: '🎵' },
      { id: 'sticker-sport', name: 'Sport', emoji: '⚽' },
    ],
  },
];

interface GraphicsLibraryProps {
  onSelectGraphic: (graphic: { id: string; name: string; type: 'emoji' | 'shape'; value: string; color?: string }) => void;
}

const GraphicsLibrary: React.FC<GraphicsLibraryProps> = ({ onSelectGraphic }) => {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Graphics & Clipart</p>
      
      {/* Category tabs */}
      <div className="flex gap-1 flex-wrap">
        {GRAPHICS_CATEGORIES.map((cat, idx) => (
          <button
            key={cat.name}
            onClick={() => setActiveCategory(idx)}
            className="px-2 py-1 rounded text-[10px] font-medium transition"
            style={{
              backgroundColor: activeCategory === idx ? '#f97316' : '#f3f4f6',
              color: activeCategory === idx ? '#fff' : '#6b7280',
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Graphics grid */}
      <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto">
        {GRAPHICS_CATEGORIES[activeCategory].items.map(item => (
          <button
            key={item.id}
            onClick={() => onSelectGraphic({
              id: item.id,
              name: item.name,
              type: 'emoji' in item ? 'emoji' : 'shape',
              value: 'emoji' in item ? item.emoji : item.svg,
              color: 'color' in item ? item.color : undefined,
            })}
            className="aspect-square rounded-lg border border-gray-200 flex items-center justify-center hover:border-orange-400 transition text-lg"
            title={item.name}
          >
            {'emoji' in item ? item.emoji : (
              <svg className="w-5 h-5" fill={item.color} viewBox="0 0 24 24">
                {item.svg === 'circle' && <circle cx="12" cy="12" r="8" />}
                {item.svg === 'rect' && <rect x="4" y="4" width="16" height="16" rx="2" />}
                {item.svg === 'heart' && <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />}
                {item.svg === 'star' && <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />}
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default GraphicsLibrary;
