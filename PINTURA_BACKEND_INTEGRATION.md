# Pintura Image Editor - Backend Integration

## Flow

```
User uploads image
    ↓
Client-side preview (URL.createObjectURL)
    ↓
[Optional] Pintura crop/zoom/rotate editing
    ↓
Upload to backend: POST /api/designs/customizations/:id/assets
    ↓
Backend returns: { assetId, originalUrl, processedUrl, width, height }
    ↓
Save slot state: PATCH /api/designs/customizations/:id/slots/:slotId
    ↓
Render preview: POST /api/designs/customizations/:id/render-preview
    ↓
Finalize: POST /api/designs/customizations/:id/finalize
```

## API Integration

### 1. Create Customization Session
```typescript
POST /api/designs/customizations
{ variantId, templateId? }

// Returns: { _id, variantId, templateId, slots: [], status: 'draft' }
```

### 2. Upload Image Asset
```typescript
POST /api/designs/customizations/:id/assets
Content-Type: multipart/form-data
Field: image (File)

// Returns: { assetId, originalUrl, processedUrl, mimeType, width, height, sizeBytes }
```

### 3. Update Slot State
```typescript
PATCH /api/designs/customizations/:id/slots/:slotId

// Image slot:
{
  type: 'image',
  asset: { assetId, originalUrl, processedUrl },
  transform: { x: 0, y: 0, scale: 1, rotation: 0, zoom: 1 },
  crop: { x: 0, y: 0, width: 0, height: 0, unit: 'px' }
}

// Text slot:
{
  type: 'text',
  text: { value: 'Hello', fontFamily: 'Roboto', fontSize: 24, color: '#000', alignment: 'center' }
}
```

### 4. Render Preview
```typescript
POST /api/designs/customizations/:id/render-preview
// Returns: { renderedPreview: { url, width, height, generatedAt } }
```

### 5. Finalize
```typescript
POST /api/designs/customizations/:id/finalize
// Returns: { printReadyAsset: { url, dpi: 300, format: 'jpeg' } }
```

## Frontend Components

### ImageSlotEditor
- File input handling
- Preview display
- Pintura crop modal integration
- Backend upload with progress
- Slot state updates

### PinturaCropModal
- Crop with aspect ratio
- Rotate (90° steps + free)
- Zoom (mouse wheel, slider)
- Pan (drag)
- Output: JPEG up to 1200x1200

### CustomizationEditor
- Slot value management
- Canvas preview rendering
- Mockup preview
- Asset upload callbacks
- Finalize button

## State Management

```typescript
interface SlotValue {
  file?: File;
  previewUrl?: string;
  asset?: {
    assetId?: string;
    originalUrl?: string;
    processedUrl?: string;
  };
  width?: number;
  height?: number;
  transform?: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
    zoom: number;
  };
}
```

## Pintura Features Configured

- `getCropperDefaults()` - Crop, zoom, rotate only (lightweight)
- Aspect ratio: from template geometry
- Min size: 200px
- Max size: 4096px
- Flip: enabled
- Rotation: enabled
- Zoom: enabled
- Output: 1200x1200 JPEG