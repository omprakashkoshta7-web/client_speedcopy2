# Card Editor Setup Guide

## Installation

The Card Editor requires `html2canvas` package for downloading cards as images.

### Install Dependencies

```bash
cd client
npm install
```

This will install `html2canvas@^1.4.1` along with other dependencies.

## Features Implemented

### 1. Download Function
- Converts the business card to a PNG image
- Uses `html2canvas` to capture the card design
- Downloads with filename: `business-card-{name}-{timestamp}.png`
- High quality (2x scale)

### 2. Save Design Function
- Saves card design to localStorage
- Stores:
  - Template selection
  - Color scheme
  - Layout choice
  - All text fields
  - Timestamp
- Can be loaded later for editing

## Usage

### Download Card
1. Design your card in the editor
2. Click "Download" button in top-right
3. Card will be downloaded as PNG image

### Save Design
1. Design your card in the editor
2. Click "Save Design" button in top-right
3. Design is saved to browser localStorage
4. Success message appears

## Technical Details

### Download Implementation
```typescript
const handleDownload = async () => {
  // Convert card div to canvas
  const canvas = await html2canvas(cardRef.current, {
    backgroundColor: null,
    scale: 2, // 2x quality
    logging: false,
  });
  
  // Convert to blob and download
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `business-card-${name}-${timestamp}.png`;
    link.click();
  }, 'image/png');
};
```

### Save Implementation
```typescript
const handleSave = () => {
  const designData = {
    template: selectedTemplate,
    color: selectedColor,
    layout: selectedLayout,
    text: cardText,
    savedAt: new Date().toISOString(),
  };
  
  localStorage.setItem('businessCardDesign', JSON.stringify(designData));
};
```

## Files Modified

1. `client/src/pages/CardEditorPage.tsx`
   - Added `useRef` for card element
   - Implemented `handleDownload()` function
   - Implemented `handleSave()` function
   - Added `html2canvas` import

2. `client/package.json`
   - Added `html2canvas: ^1.4.1` dependency

## Testing

1. Navigate to `/card-editor`
2. Customize your card (template, colors, text)
3. Click "Download" - PNG should download
4. Click "Save Design" - Success message should appear
5. Check browser localStorage for saved design

## Troubleshooting

### Download not working
- Check browser console for errors
- Ensure `html2canvas` is installed: `npm list html2canvas`
- Try different browser (Chrome/Firefox recommended)

### Save not working
- Check if localStorage is enabled in browser
- Check browser console for errors
- Clear localStorage and try again: `localStorage.clear()`

## Future Enhancements

- Load saved designs from localStorage
- Export as PDF using jsPDF
- Share design via URL
- Multiple saved designs
- Cloud storage integration
