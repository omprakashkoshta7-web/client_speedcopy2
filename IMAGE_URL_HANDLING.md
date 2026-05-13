# Image URL Handling - Integration Guide

## Summary

Backend returns various image URL formats (relative paths, full URLs, etc.). All frontend code should use centralized utilities to normalize these URLs.

## Utility Files

### speedcopy-main
**File:** `src/utils/image.utils.ts`

```typescript
import { 
  normalizeImageUrl,
  resolveImageUrl,
  resolveThumbnail,
  getProductImageUrl,
  getPlaceholderImage 
} from '../utils/image.utils';
```

**Functions:**
- `normalizeImageUrl(url)` - Convert relative path to full CDN URL
- `resolveThumbnail(images[], thumbnail, image, imageUrl)` - Resolve with fallbacks
- `getProductImageUrl(url)` - Get product image with placeholder fallback
- `getPlaceholderImage()` - Returns default placeholder URL

### admin-main
**File:** `src/utils/imageUtils.ts`

```typescript
import { 
  resolveImageUrl,
  resolveThumbnail,
  getPlaceholderImage 
} from '../../utils/imageUtils';
```

## Usage Examples

### Product Card
```tsx
<img src={resolveThumbnail(product.images, product.thumbnail, product.image)} />
```

### Variant Selector
```tsx
<img src={resolveImageUrl(variant.thumbnail)} />
```

### Template Gallery
```tsx
<img src={normalizeImageUrl(template.previewImage || template.thumbnail)} />
```

### Placeholder Fallback
```tsx
<img src={product.thumbnail ? resolveImageUrl(product.thumbnail) : getPlaceholderImage()} />
```

## CDN URLs

- **CDN:** `https://cdn-202671058278.asia-east1.run.app`
- **Uploads:** `https://uploads-202671058278.asia-east1.run.app`

## What Gets Normalized

| Input | Output |
|-------|--------|
| `/uploads/products/abc.jpg` | `https://cdn-202671058278.asia-east1.run.app/uploads/products/abc.jpg` |
| `https://cdn.example.com/img.png` | `https://cdn.example.com/img.png` |
| `data:image/...` | `data:image/...` |
| `` (empty) | `` |

## Backward Compatible

All existing `onError` handlers still work as fallback:
```tsx
onError={(e) => { e.target.src = '/placeholder-product.jpg'; }}
```