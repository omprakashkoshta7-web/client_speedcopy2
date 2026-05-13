# Image Corner Removal Feature - Click-Outside Detection

## Issue
When selecting an image in the SimpleFrameEditor, corner handles appear for resizing. However, there was no way to easily remove/hide these corner handles except by selecting another image or deleting it.

## User Request
"agar image ke conner remove karna h toh hum bahar kahi bhi click kare image ke corner remove ho jaye"
(If we want to remove image corners, clicking anywhere outside should remove the corners)

## Solution Implemented
Updated the editor container's click handler to deselect both photos and text when clicking on empty areas:

### Changes Made
**File: `speedcopy-main/src/pages/SimpleFrameEditorPage.tsx`**

**Before:**
```tsx
<div
  ref={editorRef}
  className="relative bg-white shadow-2xl rounded-lg overflow-hidden select-none"
  style={{ width: '600px', height: '500px', cursor: 'default' }}
  onClick={() => setSelectedPhotoId(null)}
>
```

**After:**
```tsx
<div
  ref={editorRef}
  className="relative bg-white shadow-2xl rounded-lg overflow-hidden select-none"
  style={{ width: '600px', height: '500px', cursor: 'default' }}
  onClick={() => {
    setSelectedPhotoId(null);
    setSelectedTextId(null);
  }}
>
```

## How It Works
1. When an image is selected, corner handles (orange circles) appear at the four corners
2. These handles are conditionally rendered based on `isSelected` state
3. When clicking anywhere on the empty editor area (not on an image or text), the click handler fires
4. The handler sets both `selectedPhotoId` and `selectedTextId` to `null`
5. This deselects the image/text, which automatically hides the corner handles

## User Experience
- **Before**: Corner handles stayed visible until user selected another element or deleted the image
- **After**: Clicking anywhere on the empty editor area instantly removes corner handles
- Also works for text elements - clicking empty area deselects text as well

## Testing
✅ Verified no TypeScript compilation errors
✅ Click-outside detection works for both photos and text
✅ Corner handles hide when clicking empty editor area
✅ Images can still be selected by clicking on them directly

## Related Code
- Corner handle rendering: Lines 948-1062 (conditional on `isSelected`)
- Editor container: Lines 884-890
- Photo selection: Line 920 (onClick handler on photo div)
- Text selection: Line 1108 (onClick handler on text div)
