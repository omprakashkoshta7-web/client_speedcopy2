// Browser Console Test Script
// Copy-paste this in browser console (F12) to test APIs

console.log('🧪 Starting API Tests...\n');

// Test 1: Vendor API
console.log('📦 Test 1: Vendor API (No params)');
fetch('https://vendor-202671058278.asia-south1.run.app/api/vendor/stores/nearby?limit=50')
  .then(r => {
    console.log('Status:', r.status, r.statusText);
    return r.json();
  })
  .then(data => {
    console.log('✅ Vendor API Response:', data);
    console.log('Stores count:', data?.data?.stores?.length || data?.stores?.length || 0);
    if (data?.data?.stores?.[0]) {
      console.log('First store sample:', data.data.stores[0]);
    }
  })
  .catch(err => console.error('❌ Vendor API Error:', err));

// Test 2: Vendor API with location (Delhi coordinates)
setTimeout(() => {
  console.log('\n📦 Test 2: Vendor API (With Delhi location)');
  fetch('https://vendor-202671058278.asia-south1.run.app/api/vendor/stores/nearby?lat=28.6139&lng=77.2090&radius=50&limit=50')
    .then(r => r.json())
    .then(data => {
      console.log('✅ Vendor API Response (Delhi):', data);
      console.log('Stores count:', data?.data?.stores?.length || data?.stores?.length || 0);
    })
    .catch(err => console.error('❌ Vendor API Error:', err));
}, 1000);

// Test 3: Vendor API with pincode
setTimeout(() => {
  console.log('\n📦 Test 3: Vendor API (With pincode 110001)');
  fetch('https://vendor-202671058278.asia-south1.run.app/api/vendor/stores/nearby?pincode=110001&radius=50&limit=50')
    .then(r => r.json())
    .then(data => {
      console.log('✅ Vendor API Response (Pincode):', data);
      console.log('Stores count:', data?.data?.stores?.length || data?.stores?.length || 0);
    })
    .catch(err => console.error('❌ Vendor API Error:', err));
}, 2000);

// Test 4: Printing Pickup Locations API
setTimeout(() => {
  console.log('\n🖨️ Test 4: Printing Pickup Locations API');
  fetch('https://gateway-202671058278.asia-south1.run.app/api/products/printing/pickup-locations?limit=50')
    .then(r => r.json())
    .then(data => {
      console.log('✅ Printing API Response:', data);
      console.log('Stores count:', data?.data?.length || data?.stores?.length || 0);
    })
    .catch(err => console.error('❌ Printing API Error:', err));
}, 3000);

console.log('\n⏳ Running tests... Check results above in 5 seconds\n');
