# Printshoppy-Style Canvas Editor Implementation Guide

## Current Implementation vs Printshoppy

### Printshoppy Approach:
1. **Template with Image Zones** - Pre-defined areas where users can add photos
2. **Drag & Drop** - Users drag photos into specific zones
3. **Auto-positioning** - Photos automatically fit into zones
4. **Real-time Preview** - Shows exactly how it will print
5. **Multiple Zones** - Different areas for different photos

### Our Current Approach:
- Free-form canvas editing
- Manual positioning required
- Single image at a time

## How to Implement Printshoppy-Style

### Step 1: Define Image Zones in Template

```typescript
type ImageZone = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio?: number;
  imageUrl?: string;
};

type TemplateWithZones = {
  id: string;
  name: string;
  frameImage: string;
  zones: ImageZone[];
  canvasWidth: number;
  canvasHeight: number;
};
```

### Step 2: Load Template with Zones

```typescript
const loadTemplateWithZones = async (templateId: string) => {
  // Fetch template with predefined zones
  const template = await designService.getTemplateWithZones(templateId);
  
  // Load frame image
  const frameImg = await loadImageAsync(template.frameImage);
  canvas.add(frameImg);
  
  // Draw zone rectangles (for visualization)
  template.zones.forEach(zone => {
    const rect = new fabric.Rect({
      left: zone.x,
      top: zone.y,
      width: zone.width,
      height: zone.height,
      fill: 'transparent',
      stroke: '#ff6a3d',
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
    canvas.add(rect);
  });
};
```

### Step 3: Drag Photo into Zone

```typescript
const addPhotoToZone = (photoUrl: string, zoneId: string) => {
  const zone = template.zones.find(z => z.id === zoneId);
  if (!zone) return;
  
  fabric.Image.fromURL(photoUrl, (img) => {
    // Auto-fit image to zone
    const scale = Math.min(
      zone.width / img.width,
      zone.height / img.height
    );
    
    img.set({
      left: zone.x + zone.width / 2,
      top: zone.y + zone.height / 2,
      originX: 'center',
      originY: 'center',
      scaleX: scale,
      scaleY: scale,
    });
    
    canvas.add(img);
    canvas.renderAll();
  });
};
```

### Step 4: Saved Photos Section with Zone Mapping

```typescript
{uploadedAssets.length > 0 && (
  <div className="space-y-3">
    {template.zones.map(zone => (
      <div key={zone.id} className="rounded-lg border border-gray-200 p-3">
        <p className="text-xs font-semibold text-slate-600 mb-2">{zone.name}</p>
        <div className="grid grid-cols-2 gap-2">
          {uploadedAssets.map((asset, idx) => (
            <button
              key={`${zone.id}-${idx}`}
              onClick={() => addPhotoToZone(asset, zone.id)}
              className="rounded-lg overflow-hidden border border-gray-200"
            >
              <img src={asset} alt="photo" className="h-16 w-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    ))}
  </div>
)}
```

## Benefits of This Approach

✅ **User-Friendly** - Clear zones show where to add photos
✅ **Professional** - Ensures proper photo placement
✅ **Predictable** - Users know exactly how it will look
✅ **Printshop-Ready** - Perfect for printing workflows
✅ **Multiple Photos** - Support for multi-photo templates

## Implementation Steps

1. **Backend**: Add template zones to database
2. **API**: Create endpoint to fetch templates with zones
3. **Frontend**: Implement zone-based photo adding
4. **UI**: Show zones in saved photos section
5. **Preview**: Real-time preview with all photos

## Current Status

- ✅ Canvas editor working
- ✅ Photo upload working
- ✅ Frame loading working
- ⏳ Need: Zone-based template system
- ⏳ Need: Zone mapping in saved photos
- ⏳ Need: Auto-positioning in zones
