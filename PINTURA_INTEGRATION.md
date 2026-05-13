# Pintura Image Editor Integration

## Installed Packages

```bash
npm install @pqina/pintura @pqina/react-pintura
```

## Features Enabled

- **Crop** - Crop images with predefined aspect ratios
- **Zoom** - Mouse wheel/touchpad zoom control
- **Rotate** - 90° step rotation + free rotation
- **Pan** - Drag to move image within crop area
- **Aspect ratios** - Square (1:1), 16:9, 4:3, custom

## Files Created

### speedcopy-main
- `src/components/customization/PinturaCropModal.tsx` - Crop modal component
- Updated `src/components/customization/ImageSlotEditor.tsx` - Uses Pintura

### admin-main
- Install same packages in package.json

## Usage

```tsx
import PinturaCropModal from './components/customization/PinturaCropModal';

<PinturaCropModal
  src={imageUrl}
  aspectRatio={1}  // 1:1 square, or undefined for free
  onSave={(resultUrl) => {
    // resultUrl is cropped image as data URL
  }}
  onCancel={() => setShowModal(false)}
/>
```

## API Response

When user saves, `onSave` receives:
- Cropped JPEG image as data URL (base64)
- Max size: 1200x1200 (configurable)

## Customization Options

```tsx
<PinturaEditor
  {...getCropperDefaults()}  // Minimal crop only
  {...getImageEditorDefaults()} // Full editor
  src={src}
  imageCropAspectRatio={1}    // 1:1, 16/9, 4/3, or undefined
  imageCropAllowFlip={true}
  imageCropAllowRotation={true}
  imageCropAllowZoom={true}
  onProcess={handleSave}
/>
```