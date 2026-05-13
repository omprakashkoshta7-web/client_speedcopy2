// ============================================================================
// VENDOR STORES DEBUG SCRIPT
// ============================================================================
// Copy-paste this entire script in browser console (F12) to debug why stores
// are not showing up on the pickup location page
// ============================================================================

console.clear();
console.log('🔍 VENDOR STORES DEBUG SCRIPT');
console.log('=' .repeat(80));
console.log('\n');

// Test Configuration
const VENDOR_API = 'https://vendor-202671058278.asia-south1.run.app/api/vendor/stores/nearby';
const GATEWAY_API = 'https://gateway-202671058278.asia-south1.run.app/api/products/printing/pickup-locations';

// Test Cases
const testCases = [
  {
    name: 'Test 1: Vendor API - No params (All stores)',
    url: `${VENDOR_API}?limit=50`,
    api: 'vendor'
  },
  {
    name: 'Test 2: Vendor API - Delhi location',
    url: `${VENDOR_API}?lat=28.6139&lng=77.2090&radius=50&limit=50`,
    api: 'vendor'
  },
  {
    name: 'Test 3: Vendor API - Pincode 110001',
    url: `${VENDOR_API}?pincode=110001&radius=50&limit=50`,
    api: 'vendor'
  },
  {
    name: 'Test 4: Printing Pickup API - No params',
    url: `${GATEWAY_API}?limit=50`,
    api: 'printing'
  },
  {
    name: 'Test 5: Printing Pickup API - Delhi location',
    url: `${GATEWAY_API}?lat=28.6139&lng=77.2090&radius=50&limit=50`,
    api: 'printing'
  }
];

// Helper function to extract stores from response
function extractStores(response, apiType) {
  console.log(`\n📦 Extracting stores from ${apiType} API response...`);
  console.log('Response structure:', {
    type: typeof response,
    keys: response ? Object.keys(response) : null,
    isArray: Array.isArray(response)
  });

  let stores = [];
  
  // Try all possible paths
  const paths = [
    { path: 'res.data.stores', value: response?.data?.stores },
    { path: 'res.data.data.stores', value: response?.data?.data?.stores },
    { path: 'res.stores', value: response?.stores },
    { path: 'res.data', value: response?.data },
    { path: 'res', value: response }
  ];

  for (const { path, value } of paths) {
    if (value && Array.isArray(value)) {
      stores = value;
      console.log(`✅ Found stores at: ${path} (${stores.length} stores)`);
      break;
    }
  }

  if (stores.length === 0) {
    console.error('❌ No stores found in any path!');
    console.log('Full response:', JSON.stringify(response, null, 2));
  }

  return stores;
}

// Helper function to analyze store structure
function analyzeStore(store, index) {
  console.log(`\n📍 Store ${index + 1}:`, {
    id: store._id || store.id,
    name: store.name,
    address: store.address,
    city: store.city,
    state: store.state,
    pincode: store.pincode,
    is_active: store.is_active,
    isActive: store.isActive,
    approval_status: store.approval_status,
    approvalStatus: store.approvalStatus,
    distance_km: store.distance_km,
    distance: store.distance,
    location: store.location,
    working_hours: store.working_hours,
    workingHours: store.workingHours,
    phone: store.phone,
    email: store.email
  });

  // Check for issues
  const issues = [];
  
  if (!store._id && !store.id) {
    issues.push('⚠️ Missing ID');
  }
  
  if (!store.name) {
    issues.push('⚠️ Missing name');
  }
  
  if (!store.address && !store.city) {
    issues.push('⚠️ Missing address');
  }
  
  if (store.is_active === false || store.isActive === false) {
    issues.push('⚠️ Store is INACTIVE');
  }
  
  if (store.approval_status === 'pending' || store.approvalStatus === 'pending') {
    issues.push('⚠️ Store is PENDING APPROVAL');
  }
  
  if (issues.length > 0) {
    console.log('Issues found:', issues);
  } else {
    console.log('✅ Store looks good!');
  }
  
  return issues;
}

// Run tests sequentially
async function runTests() {
  const results = [];
  
  for (let i = 0; i < testCases.length; i++) {
    const test = testCases[i];
    console.log('\n' + '='.repeat(80));
    console.log(`\n${test.name}`);
    console.log(`URL: ${test.url}\n`);
    
    try {
      const response = await fetch(test.url);
      const status = response.status;
      const statusText = response.statusText;
      
      console.log(`Status: ${status} ${statusText}`);
      
      if (!response.ok) {
        console.error(`❌ HTTP Error: ${status} ${statusText}`);
        results.push({ test: test.name, success: false, error: `HTTP ${status}` });
        continue;
      }
      
      const data = await response.json();
      console.log('Response received:', {
        success: data.success,
        hasData: !!data.data,
        dataType: typeof data.data,
        isArray: Array.isArray(data.data)
      });
      
      // Extract stores
      const stores = extractStores(data, test.api);
      
      if (stores.length === 0) {
        console.error('❌ No stores found!');
        results.push({ test: test.name, success: false, error: 'No stores found' });
        continue;
      }
      
      console.log(`\n✅ Found ${stores.length} stores`);
      
      // Analyze first 3 stores
      const allIssues = [];
      const storesToAnalyze = Math.min(3, stores.length);
      
      for (let j = 0; j < storesToAnalyze; j++) {
        const issues = analyzeStore(stores[j], j);
        if (issues.length > 0) {
          allIssues.push(...issues);
        }
      }
      
      // Summary
      const activeStores = stores.filter(s => s.is_active !== false && s.isActive !== false);
      const pendingStores = stores.filter(s => s.approval_status === 'pending' || s.approvalStatus === 'pending');
      const inactiveStores = stores.filter(s => s.is_active === false || s.isActive === false);
      
      console.log('\n📊 Summary:');
      console.log(`Total stores: ${stores.length}`);
      console.log(`Active stores: ${activeStores.length}`);
      console.log(`Pending approval: ${pendingStores.length}`);
      console.log(`Inactive stores: ${inactiveStores.length}`);
      
      if (allIssues.length > 0) {
        console.log('\n⚠️ Issues found:', [...new Set(allIssues)]);
      }
      
      results.push({
        test: test.name,
        success: true,
        totalStores: stores.length,
        activeStores: activeStores.length,
        pendingStores: pendingStores.length,
        inactiveStores: inactiveStores.length,
        issues: [...new Set(allIssues)]
      });
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      results.push({ test: test.name, success: false, error: error.message });
    }
    
    // Wait 500ms between tests
    if (i < testCases.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Final Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n🎯 FINAL SUMMARY\n');
  console.log('='.repeat(80));
  
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.test}`);
    if (result.success) {
      console.log(`   ✅ Success`);
      console.log(`   Total: ${result.totalStores}, Active: ${result.activeStores}, Pending: ${result.pendingStores}, Inactive: ${result.inactiveStores}`);
      if (result.issues && result.issues.length > 0) {
        console.log(`   Issues: ${result.issues.join(', ')}`);
      }
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
  });
  
  // Recommendations
  console.log('\n' + '='.repeat(80));
  console.log('\n💡 RECOMMENDATIONS\n');
  console.log('='.repeat(80));
  
  const vendorResults = results.filter(r => r.test.includes('Vendor'));
  const printingResults = results.filter(r => r.test.includes('Printing'));
  
  const vendorSuccess = vendorResults.some(r => r.success && r.activeStores > 0);
  const printingSuccess = printingResults.some(r => r.success && r.activeStores > 0);
  
  if (!vendorSuccess && !printingSuccess) {
    console.log('❌ CRITICAL: No stores found in either API!');
    console.log('\nPossible causes:');
    console.log('1. No stores registered in the database');
    console.log('2. All stores are marked as inactive');
    console.log('3. All stores are pending approval');
    console.log('4. Backend API is not returning data correctly');
    console.log('\nAction required:');
    console.log('- Check vendor dashboard to ensure stores are registered');
    console.log('- Check admin panel to approve pending stores');
    console.log('- Check backend logs for errors');
  } else if (vendorSuccess && !printingSuccess) {
    console.log('✅ Vendor API is working');
    console.log('❌ Printing Pickup API has issues');
    console.log('\nAction: Check gateway service configuration');
  } else if (!vendorSuccess && printingSuccess) {
    console.log('❌ Vendor API has issues');
    console.log('✅ Printing Pickup API is working');
    console.log('\nAction: Check vendor service configuration');
  } else {
    console.log('✅ Both APIs are working!');
    
    const totalActive = results.reduce((sum, r) => sum + (r.activeStores || 0), 0);
    const totalPending = results.reduce((sum, r) => sum + (r.pendingStores || 0), 0);
    const totalInactive = results.reduce((sum, r) => sum + (r.inactiveStores || 0), 0);
    
    if (totalActive === 0 && totalPending > 0) {
      console.log('\n⚠️ All stores are pending approval!');
      console.log('Action: Admin needs to approve stores from admin panel');
    } else if (totalActive === 0 && totalInactive > 0) {
      console.log('\n⚠️ All stores are inactive!');
      console.log('Action: Activate stores from vendor dashboard or admin panel');
    } else if (totalActive > 0) {
      console.log(`\n✅ Found ${totalActive} active stores that should be visible!`);
      console.log('\nIf stores are still not showing on the page:');
      console.log('1. Check browser console for frontend errors');
      console.log('2. Check if the mapping function is working correctly');
      console.log('3. Check if the filter logic is excluding stores');
      console.log('4. Hard refresh the page (Ctrl+Shift+R)');
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Debug script completed!\n');
}

// Run the tests
runTests().catch(err => {
  console.error('❌ Fatal error:', err);
});
