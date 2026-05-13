# Product Frames API Integration Guide

## API Endpoint
```
GET /api/designs/product/:productId/frames
```

## Integration Status
✅ **INTEGRATED** - The API is now fully integrated in the client frontend.

## Configuration

### 1. API Config (`client/src/config/api.config.ts`)
```typescript
DESIGNS: {
  // ... other endpoints
  PRODUCT_FRAMES: (productId: string) => `/api/designs/product/${productId}/frames`,
}
```

### 2. Design Service (`client/src/services/design.service.ts`)
```typescript
/**
 * Get Product Frames
 * GET /api/designs/product/:productId/frames
 */
async getProductFrames(productId: string): Promise<{ success: boolean; data: Frame[] }> {
  try {
    console.log('🖼️ Getting frames for product:', productId);
    const response = await apiClient.get(API_CONFIG.ENDPOINTS.DESIGNS.PRODUCT_FRAMES(productId));
    console.log('✅ Product frames response:', response.data);
    return response.data;
  } catch (error) {
    console.warn('⚠️ Product frames API not available, using fallback:', error);
    return this.wrapSuccess([]);
  }
}
```

## Usage Examples

### Example 1: Load Frames in Component
```typescript
import designService from '../services/design.service';
import { Frame } from '../services/design.service';

function MyComponent() {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFrames = async (productId: string) => {
    setLoading(true);
    try {
      const response = await designService.getProductFrames(productId);
      if (response.success) {
        setFrames(response.data);
        console.log('Loaded frames:', response.data);
      }
    } catch (error) {
      console.error('Failed to load frames:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {loading ? (
        <p>Loading frames...</p>
      ) : (
        <div>
          {frames.map(frame => (
            <div key={frame._id}>
              <h3>{frame.name}</h3>
              {frame.thumbnail && <img src={frame.thumbnail} alt={frame.name} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Example 2: Using with useEffect
```typescript
import { useEffect, useState } from 'react';
import designService from '../services/design.service';

function ProductFramesViewer({ productId }: { productId: string }) {
  const [frames, setFrames] = useState<Frame[]>([]);

  useEffect(() => {
    const fetchFrames = async () => {
      const response = await designService.getProductFrames(productId);
      if (response.success) {
        setFrames(response.data);
      }
    };

    if (productId) {
      fetchFrames();
    }
  }, [productId]);

  return (
    <div className="frames-grid">
      {frames.map(frame => (
        <div key={frame.id} className="frame-card">
          <img src={frame.thumbnail || frame.image} alt={frame.frameName} />
          <p>{frame.frameName}</p>
        </div>
      ))}
    </div>
  );
}
```

### Example 3: Load Frames Helper Method
```typescript
// Already available in design service
const frames = await designService.loadProductFrames(productId);
console.log('Frames:', frames);
```

## Frame Interface
```typescript
export interface Frame {
  _id: string;
  id: string;
  name: string;
  frameName: string;
  canvasJson: any;
  thumbnail?: string;
  image?: string;
  dimensions?: {
    width?: number;
    height?: number;
    unit?: string;
  };
}
```

## API Response Format
```json
{
  "success": true,
  "data": [
    {
      "_id": "frame_123",
      "id": "frame_123",
      "name": "Modern Frame",
      "frameName": "Modern Frame",
      "canvasJson": { ... },
      "thumbnail": "https://...",
      "dimensions": {
        "width": 800,
        "height": 600,
        "unit": "px"
      }
    }
  ]
}
```

## Error Handling
The service includes automatic fallback:
- If API fails, returns empty array `[]`
- Logs warnings to console
- No errors thrown to component

## Deployment URL
```
Production Gateway: https://gateway-202671058278.asia-south1.run.app
Full Endpoint: https://gateway-202671058278.asia-south1.run.app/api/designs/product/:productId/frames
```

## Testing
```typescript
// Test in browser console
import designService from './services/design.service';

// Test with a product ID
const response = await designService.getProductFrames('product_123');
console.log('Frames:', response);
```

## Integration Checklist
- [x] API endpoint added to `api.config.ts`
- [x] Service method implemented in `design.service.ts`
- [x] TypeScript interface defined (`Frame`)
- [x] Error handling with fallback
- [x] Console logging for debugging
- [x] Helper method `loadProductFrames()` available
- [x] Production API URL configured in `.env`

## Next Steps
1. Use `designService.getProductFrames(productId)` in your components
2. Display frames in UI (grid, carousel, etc.)
3. Allow users to select frames for their designs
4. Apply frame canvas JSON to design editor

## Support
If frames are not loading:
1. Check browser console for API errors
2. Verify product ID is correct
3. Check network tab for API response
4. Ensure backend design service is deployed
5. Verify gateway routes frames endpoint correctly
