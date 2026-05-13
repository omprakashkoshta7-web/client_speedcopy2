// Node.js API Test Script
// Run with: node test-api.js

const https = require('https');

function testAPI(url, name) {
  return new Promise((resolve) => {
    console.log(`\n📦 Testing: ${name}`);
    console.log(`🔗 URL: ${url}\n`);
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`✅ Status: ${res.statusCode}`);
          console.log(`📊 Response:`, JSON.stringify(json, null, 2));
          
          // Extract store count
          const storeCount = json?.data?.stores?.length || 
                           json?.stores?.length || 
                           json?.data?.length || 
                           0;
          console.log(`📍 Stores found: ${storeCount}`);
          
          if (storeCount > 0) {
            const firstStore = json?.data?.stores?.[0] || 
                             json?.stores?.[0] || 
                             json?.data?.[0];
            if (firstStore) {
              console.log(`\n🏪 First Store Sample:`);
              console.log(`   Name: ${firstStore.name || 'N/A'}`);
              console.log(`   Address: ${firstStore.address || 'N/A'}`);
              console.log(`   City: ${firstStore.city || 'N/A'}`);
              console.log(`   Active: ${firstStore.is_active || firstStore.isActive || 'N/A'}`);
              console.log(`   Approval: ${firstStore.approval_status || firstStore.approvalStatus || 'N/A'}`);
            }
          }
          
          resolve(json);
        } catch (err) {
          console.error(`❌ JSON Parse Error:`, err.message);
          console.log(`Raw response:`, data.substring(0, 500));
          resolve(null);
        }
      });
    }).on('error', (err) => {
      console.error(`❌ Request Error:`, err.message);
      resolve(null);
    });
  });
}

async function runTests() {
  console.log('🧪 Starting API Tests...');
  console.log('=' .repeat(60));
  
  // Test 1: Vendor API - No params
  await testAPI(
    'https://vendor-202671058278.asia-south1.run.app/api/vendor/stores/nearby?limit=50',
    'Vendor API (No location)'
  );
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: Vendor API - With Delhi location
  await testAPI(
    'https://vendor-202671058278.asia-south1.run.app/api/vendor/stores/nearby?lat=28.6139&lng=77.2090&radius=50&limit=50',
    'Vendor API (Delhi location)'
  );
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 3: Vendor API - With pincode
  await testAPI(
    'https://vendor-202671058278.asia-south1.run.app/api/vendor/stores/nearby?pincode=110001&radius=50&limit=50',
    'Vendor API (Pincode 110001)'
  );
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 4: Printing Pickup Locations API
  await testAPI(
    'https://gateway-202671058278.asia-south1.run.app/api/products/printing/pickup-locations?limit=50',
    'Printing Pickup Locations API'
  );
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed!');
  console.log('\n💡 Next Steps:');
  console.log('1. Check the store counts above');
  console.log('2. If stores found = 0, check backend database');
  console.log('3. If stores found > 0, check frontend console logs');
  console.log('4. See STORE_DEBUG_GUIDE.md for detailed debugging');
}

runTests();
