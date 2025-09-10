// scripts/test_delete_uwb_locations.js
const axios = require('axios');

// Configuration
const API_BASE = 'http://localhost:5001';
const LOGIN_ENDPOINT = '/api/auth/login';
const DELETE_UWB_ENDPOINT = '/api/motion/uwb-locations';

// Login and get token
const login = async () => {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${API_BASE}${LOGIN_ENDPOINT}`, 
      'username=admin@example.com&password=admin123',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const token = response.data.access_token;
    console.log('✅ Login successful');
    return token;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
};

// Test different delete options
const testDeleteUWBLocations = async () => {
  try {
    console.log('🧪 Testing UWB Locations Delete API...');
    console.log('');
    
    // Login
    const token = await login();
    
    // Test 1: Get current count
    console.log('📊 Getting current UWB locations count...');
    try {
      const countResponse = await axios.get(`${API_BASE}/api/motion/uwb-locations?limit=10000`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log(`   Current UWB locations: ${countResponse.data.length}`);
      console.log('');
    } catch (error) {
      console.log('   Could not get current count');
    }
    
    // Test 2: Delete data older than 1 hour (should delete most test data)
    console.log('🗑️  Test 1: Delete UWB locations older than 1 hour...');
    try {
      const response = await axios.delete(`${API_BASE}${DELETE_UWB_ENDPOINT}?older_than_hours=1`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Response:', response.data);
      console.log('');
    } catch (error) {
      console.error('❌ Error:', error.response?.data || error.message);
    }
    
    // Test 3: Delete by session ID (if any remaining)
    console.log('🗑️  Test 2: Delete UWB locations for specific session...');
    try {
      const response = await axios.delete(`${API_BASE}${DELETE_UWB_ENDPOINT}?session_id=UWB_SESSION_001`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Response:', response.data);
      console.log('');
    } catch (error) {
      console.error('❌ Error:', error.response?.data || error.message);
    }
    
    // Test 4: Delete by cart ID
    console.log('🗑️  Test 3: Delete UWB locations for specific cart...');
    try {
      const response = await axios.delete(`${API_BASE}${DELETE_UWB_ENDPOINT}?cart_id=CART_01`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Response:', response.data);
      console.log('');
    } catch (error) {
      console.error('❌ Error:', error.response?.data || error.message);
    }
    
    // Test 5: Get final count
    console.log('📊 Getting final UWB locations count...');
    try {
      const countResponse = await axios.get(`${API_BASE}/api/motion/uwb-locations?limit=10000`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log(`   Remaining UWB locations: ${countResponse.data.length}`);
      console.log('');
    } catch (error) {
      console.log('   Could not get final count');
    }
    
    console.log('🎉 UWB Locations Delete API testing completed!');
    
  } catch (error) {
    console.error('💥 Testing failed:', error.message);
  }
};

// Show usage examples
const showUsageExamples = () => {
  console.log('📖 API Usage Examples:');
  console.log('');
  console.log('1. Delete UWB locations older than 24 hours (default):');
  console.log('   DELETE /api/motion/uwb-locations');
  console.log('');
  console.log('2. Delete UWB locations older than specific hours:');
  console.log('   DELETE /api/motion/uwb-locations?older_than_hours=48');
  console.log('');
  console.log('3. Delete UWB locations for specific session:');
  console.log('   DELETE /api/motion/uwb-locations?session_id=UWB_SESSION_001');
  console.log('');
  console.log('4. Delete UWB locations for specific cart:');
  console.log('   DELETE /api/motion/uwb-locations?cart_id=CART_01');
  console.log('');
  console.log('5. Delete ALL UWB location data (use with caution):');
  console.log('   DELETE /api/motion/uwb-locations?all_data=true');
  console.log('');
  console.log('6. Combine filters (session + older than 12 hours):');
  console.log('   DELETE /api/motion/uwb-locations?session_id=UWB_SESSION_001&older_than_hours=12');
  console.log('');
};

// Run based on command line argument
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  showUsageExamples();
} else if (args.includes('--test')) {
  testDeleteUWBLocations();
} else {
  console.log('🎯 UWB Locations Delete API Tool');
  console.log('');
  console.log('Usage:');
  console.log('  node test_delete_uwb_locations.js --test     # Run tests');
  console.log('  node test_delete_uwb_locations.js --help     # Show usage examples');
  console.log('');
  showUsageExamples();
}

module.exports = { testDeleteUWBLocations };
