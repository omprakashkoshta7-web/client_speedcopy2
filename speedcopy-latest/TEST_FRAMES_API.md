# Test Frames API Integration

## Quick Test in Browser Console

### 1. Open Browser Console
- Open your client app in browser
- Press F12 or Right-click → Inspect
- Go to Console tab

### 2. Test API Call
```javascript
// Import the service (if using module system)
// Or access it from window if exposed

// Test with a product ID
const testProductId = 'product_123'; // Replace with actual product ID

// Method 1: Using the service directly
fetch('https://gateway-202671058278.asia-south1.run.app/api/designs/product/' + testProductId + '/frames', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    // Add auth token if required
    // 'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(res => res.json())
.then(data => {
  console.log('✅ Frames API Response:', data);
  console.log('📊 Frame Count:', data.data?.length || 0);
  if (data.data && data.data.length > 0) {
    console.log('🖼️ First Frame:', data.data[0]);
  }
})
.catch(err => {
  console.error('❌ API Error:', err);
});
```

### 3. Test with Different Product IDs
```javascript
const productIds = ['product_123', 'product_456', 'product_789'];

productIds.forEach(async (productId) => {
  try {
    const response = await fetch(
      `https://gateway-202671058278.asia-south1.run.app/api/designs/product/${productId}/frames`
    );
    const data = await response.json();
    console.log(`Product ${productId}:`, data.data?.length || 0, 'frames');
  } catch (error) {
    console.error(`Error for ${productId}:`, error);
  }
});
```

## Test Using Design Service

### In React Component
```typescript
import { useEffect } from 'react';
import designService from './services/design.service';

function TestComponent() {
  useEffect(() => {
    const testFramesAPI = async () => {
      console.log('🧪 Testing Frames API...');
      
      const productId = 'product_123'; // Your test product ID
      
      try {
        const response = await designService.getProductFrames(productId);
        
        console.log('✅ API Response:', response);
        console.log('📊 Success:', response.success);
        console.log('🖼️ Frames Count:', response.data.length);
        
        if (response.data.length > 0) {
          console.log('📋 First Frame Details:');
          console.log('  - ID:', response.data[0]._id);
          console.log('  - Name:', response.data[0].frameName);
          console.log('  - Thumbnail:', response.data[0].thumbnail);
          console.log('  - Dimensions:', response.data[0].dimensions);
        }
      } catch (error) {
        console.error('❌ Test Failed:', error);
      }
    };
    
    testFramesAPI();
  }, []);
  
  return <div>Check console for test results</div>;
}
```

## Test Checklist

### ✅ Pre-Test Checklist
- [ ] Backend design service is deployed
- [ ] Gateway is routing to design service
- [ ] Product ID exists in database
- [ ] Frames exist for the product
- [ ] Auth token is valid (if required)

### 🧪 Test Cases

#### Test 1: Valid Product with Frames
```bash
# Expected: Success response with frames array
curl -X GET "https://gateway-202671058278.asia-south1.run.app/api/designs/product/VALID_PRODUCT_ID/frames" \
  -H "Content-Type: application/json"

# Expected Response:
{
  "success": true,
  "data": [
    {
      "_id": "frame_123",
      "id": "frame_123",
      "name": "Frame Name",
      "frameName": "Frame Name",
      "canvasJson": { ... },
      "thumbnail": "https://...",
      "dimensions": { "width": 800, "height": 600, "unit": "px" }
    }
  ]
}
```

#### Test 2: Product with No Frames
```bash
# Expected: Success response with empty array
curl -X GET "https://gateway-202671058278.asia-south1.run.app/api/designs/product/PRODUCT_NO_FRAMES/frames" \
  -H "Content-Type: application/json"

# Expected Response:
{
  "success": true,
  "data": []
}
```

#### Test 3: Invalid Product ID
```bash
# Expected: 404 or empty array
curl -X GET "https://gateway-202671058278.asia-south1.run.app/api/designs/product/INVALID_ID/frames" \
  -H "Content-Type: application/json"

# Expected Response:
{
  "success": false,
  "message": "Product not found"
}
# OR
{
  "success": true,
  "data": []
}
```

#### Test 4: With Authentication
```bash
# If auth is required
curl -X GET "https://gateway-202671058278.asia-south1.run.app/api/designs/product/PRODUCT_ID/frames" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

## Debugging

### Check Network Tab
1. Open DevTools → Network tab
2. Filter by "frames"
3. Look for the API call
4. Check:
   - Status code (should be 200)
   - Response body
   - Request headers
   - Response time

### Common Issues

#### Issue 1: 404 Not Found
```
Problem: API endpoint not found
Solution: 
- Check gateway routing configuration
- Verify design service is deployed
- Check endpoint URL spelling
```

#### Issue 2: Empty Array
```
Problem: No frames returned
Solution:
- Verify product ID is correct
- Check if frames exist in database
- Verify product has frames associated
```

#### Issue 3: CORS Error
```
Problem: CORS policy blocking request
Solution:
- Check gateway CORS configuration
- Verify origin is allowed
- Check if credentials are needed
```

#### Issue 4: 401 Unauthorized
```
Problem: Authentication required
Solution:
- Add Authorization header
- Check token validity
- Verify user permissions
```

## Integration Test

### Full Flow Test
```typescript
// Test complete flow from product to frames
async function testCompleteFlow() {
  console.log('🧪 Starting Complete Flow Test...\n');
  
  // Step 1: Get product
  console.log('1️⃣ Fetching product...');
  const product = await productService.getProductById('product_123');
  console.log('✅ Product:', product.data.name);
  
  // Step 2: Get frames for product
  console.log('\n2️⃣ Fetching frames...');
  const frames = await designService.getProductFrames(product.data._id);
  console.log('✅ Frames:', frames.data.length);
  
  // Step 3: Select a frame
  if (frames.data.length > 0) {
    console.log('\n3️⃣ Selecting first frame...');
    const selectedFrame = frames.data[0];
    console.log('✅ Selected:', selectedFrame.frameName);
    
    // Step 4: Use frame in design
    console.log('\n4️⃣ Applying frame to canvas...');
    console.log('✅ Canvas JSON:', selectedFrame.canvasJson);
  }
  
  console.log('\n✅ Complete Flow Test Passed!');
}

// Run test
testCompleteFlow();
```

## Performance Test

```typescript
// Test API response time
async function testPerformance() {
  const productId = 'product_123';
  const iterations = 10;
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await designService.getProductFrames(productId);
    const end = performance.now();
    times.push(end - start);
  }
  
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`Average response time: ${avg.toFixed(2)}ms`);
  console.log(`Min: ${Math.min(...times).toFixed(2)}ms`);
  console.log(`Max: ${Math.max(...times).toFixed(2)}ms`);
}
```

## Success Criteria

✅ API returns 200 status code
✅ Response has `success: true`
✅ Response has `data` array
✅ Each frame has required fields (_id, name, frameName, canvasJson)
✅ Thumbnails load correctly
✅ Canvas JSON is valid
✅ Response time < 1000ms
✅ No console errors
✅ Component renders frames correctly
✅ Frame selection works

## Next Steps After Testing

1. ✅ Verify API works in browser console
2. ✅ Test with ProductFramesSelector component
3. ✅ Integrate into design editor
4. ✅ Test frame application to canvas
5. ✅ Test with different products
6. ✅ Test error scenarios
7. ✅ Test loading states
8. ✅ Test with real user flow
