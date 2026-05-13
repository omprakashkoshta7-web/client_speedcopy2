import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { TemplateConfig, TemplateSlot } from '../../services/design.service';
import type { SlotState } from '../../pages/CustomizationEditorPage';
import { getAlternateImageUrl, getPlaceholderImage, resolveImageUrl } from '../../utils/image.utils';

interface EditorPreviewProps {
  template: TemplateConfig;
  slotStates: Record<string, SlotState>;
  activeSlotId: string | null;
  onSlotClick: (slotId: string) => void;
  onTransformChange: (slotId: string, transform: SlotState['transform']) => void;
  onCropChange: (slotId: string, crop: SlotState['crop']) => void;
}

const EditorPreview: React.FC<EditorPreviewProps> = ({
  template,
  slotStates,
  activeSlotId,
  onSlotClick,
  onTransformChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasW = template.canvas.width || 600;
  const canvasH = template.canvas.height || 600;
  const editorBaseImage = resolveImageUrl(template.assets.editorBaseImage);
  const overlayImage = resolveImageUrl(template.assets.overlayImage);
  const handleBaseImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const fallback = getAlternateImageUrl(editorBaseImage, img.src);
    if (fallback && !img.dataset.fallbackTried) {
      img.dataset.fallbackTried = '1';
      img.src = fallback;
      return;
    }
    img.src = getPlaceholderImage();
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-100 overflow-auto p-4 pb-24">
      <div
        ref={containerRef}
        data-customization-preview="true"
        className="relative bg-white rounded-2xl overflow-hidden shadow-xl"
        style={{
          width: '100%',
          maxWidth: 420,
          aspectRatio: `${canvasW} / ${canvasH}`,
        }}
      >
        {/* Base product image */}
        {editorBaseImage && (
          <img
            src={editorBaseImage}
            alt="Product base"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ zIndex: 0 }}
            onError={handleBaseImageError}
          />
        )}

        {/* Slot overlays */}
        {template.slots.map(slot => (
          <SlotOverlay
            key={slot.slotId}
            slot={slot}
            state={slotStates[slot.slotId]}
            isActive={activeSlotId === slot.slotId}
            canvasW={canvasW}
            canvasH={canvasH}
            onClick={() => onSlotClick(slot.slotId)}
            onTransformChange={(transform) => onTransformChange(slot.slotId, transform)}
          />
        ))}

        {/* Overlay image (frame/mask on top) */}
        {overlayImage && (
          <img
            src={overlayImage}
            alt="Overlay"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ zIndex: 50 }}
          />
        )}
      </div>
    </div>
  );
};

// ── Slot Overlay ─────────────────────────────────────────────────────
interface SlotOverlayProps {
  slot: TemplateSlot;
  state?: SlotState;
  isActive: boolean;
  canvasW: number;
  canvasH: number;
  onClick: () => void;
  onTransformChange: (transform: SlotState['transform']) => void;
}

const SlotOverlay: React.FC<SlotOverlayProps> = ({
  slot,
  state,
  isActive,
  canvasW,
  canvasH,
  onClick,
  onTransformChange,
}) => {
  const g = (slot.geometry as any) || {};
  const leftPct = ((g.x || 0) / canvasW) * 100;
  const topPct = ((g.y || 0) / canvasH) * 100;
  const widthPct = ((g.width || 100) / canvasW) * 100;
  const heightPct = ((g.height || 100) / canvasH) * 100;

  const isCircle = g.shape === 'circle';
  const zIndex = (slot.zIndex ?? 10) + 1;

  const transform = state?.transform;
  const zoom = Math.max(1, Math.min(4, transform?.zoom ?? 1)); // Backend: 1-4
  const tx = transform?.x ?? 0;
  const ty = transform?.y ?? 0;
  const rot = transform?.rotation ?? 0;
  const movesSlot = slot.type === 'text' || (state as any)?.type === 'graphic';

  // Drag state
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, tx: 0, ty: 0 });

  // Handle drag start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isActive) {
      onClick();
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, tx, ty });
  }, [isActive, tx, ty, onClick]);

  // Global mouse events for drag
  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (dragging && isActive) {
        const dx = ((e.clientX - dragStart.x) / canvasW) * 100;
        const dy = ((e.clientY - dragStart.y) / canvasH) * 100;
        onTransformChange({
          ...transform,
          x: dragStart.tx + dx,
          y: dragStart.ty + dy,
        });
      }
    };

    const handleMouseUp = () => {
      setDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, isActive, transform, dragStart, canvasW, canvasH, onTransformChange]);

// Check both previewUrl and uploadedAsset to show image - use previewUrl (blob) first, fallback to server URL
  const imageSrc = state?.previewUrl || state?.uploadedAsset?.originalUrl || '';
  const hasImage = slot.type === 'image' && !!imageSrc;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseDown={handleMouseDown}
      className="absolute cursor-pointer transition-all"
      style={{
        left:   movesSlot ? `calc(${leftPct}% + ${tx}%)` : `${leftPct}%`,
        top:    movesSlot ? `calc(${topPct}% + ${ty}%)` : `${topPct}%`,
        width:  `${widthPct}%`,
        height: `${heightPct}%`,
        transform: movesSlot ? `rotate(${rot}deg)` : undefined,
        transformOrigin: 'center',
        zIndex,
        borderRadius: isCircle ? '50%' : '8px',
        overflow: slot.type === 'text' ? 'visible' : 'hidden',
        outline: isActive ? '3px solid #f97316' : '2px dashed rgba(0,0,0,0.15)',
        outlineOffset: isActive ? '2px' : '0px',
        boxShadow: isActive ? '0 0 20px rgba(249,115,22,0.4)' : 'none',
        cursor: dragging ? 'grabbing' : (isActive ? 'move' : 'pointer'),
        background: isActive ? 'rgba(249,115,22,0.05)' : 'transparent',
      }}
      data-slot={slot.slotId}
    >
      {/* Image content - Show if uploaded */}
      {hasImage && imageSrc && (
        <div className="absolute inset-0">
          <img
            src={imageSrc}
            alt={slot.name}
            className="absolute"
            style={{
              left: '50%',
              top: '50%',
              width: `${100 * zoom}%`,
              height: `${100 * zoom}%`,
              transform: `translate(calc(-50% + ${tx}%), calc(-50% + ${ty}%)) rotate(${rot}deg)`,
              transformOrigin: 'center',
              objectFit: slot.imageConfig?.fitMode === 'contain' ? 'contain' : 'cover',
            }}
          />
        </div>
      )}

      {/* Text content */}
      {slot.type === 'text' && (
        <div
          className="w-full h-full flex items-center justify-center px-2"
          style={{
            fontFamily: state?.text?.fontFamily ?? 'Roboto',
            fontSize: `clamp(8px, ${(state?.text?.fontSize ?? 20) / (canvasW / 100)}vw, 48px)`,
            fontWeight: state?.text?.fontWeight ?? 'normal',
            color: state?.text?.value ? (state.text.color ?? '#111') : '#d1d5db',
            textAlign: state?.text?.alignment ?? 'center',
            whiteSpace: 'nowrap',
            overflow: 'visible',
            lineHeight: 1,
            minWidth: 'max-content',
          }}
        >
          {state?.text?.value || slot.name}
        </div>
      )}
    </div>
  );
};

export default EditorPreview;
