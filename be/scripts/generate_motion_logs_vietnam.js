// scripts/generate_motion_logs_vietnam.js
const axios = require('axios');

// Configuration
const API_BASE = 'http://localhost:5001';
const LOGIN_ENDPOINT = '/api/auth/login';
const MOTION_LOG_ENDPOINT = '/api/motion/log';

// Generate data configuration
const TOTAL_LOGS = 200;
const ADD_RATIO = 0.909; // 90.9% add operations (≈ 182 logs)
const REMOVE_RATIO = 0.091; // 9.1% remove operations (≈ 18 logs, ratio ≈ 1/10)

const SESSION_COUNT = 25; // Number of different sessions
const CART_COUNT = 12; // Number of different carts

// Time constraints (Vietnam time - UTC+7)
const START_HOUR = 8; // 08:00
const END_HOUR = 22; // 22:30 (22.5)
const END_MINUTE = 30;

// Weight ranges for realistic data
const WEIGHT_RANGES = {
  add: { min: 50, max: 2500 }, // 50g to 2.5kg for adding items
  remove: { min: 50, max: 2500 } // Same range for removing items
};

// Generate session IDs
const generateSessionIds = (count) => {
  const sessions = [];
  for (let i = 1; i <= count; i++) {
    sessions.push(`vn_session_${String(i).padStart(3, '0')}`);
  }
  return sessions;
};

// Generate cart IDs
const generateCartIds = (count) => {
  const carts = [];
  for (let i = 1; i <= count; i++) {
    carts.push(`vn_cart_${String(i).padStart(2, '0')}`);
  }
  return carts;
};

// Generate random timestamp within Vietnam business hours
const generateVietnameseTimestamp = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Generate random hour between 08:00 and 22:30 (Vietnam time)
  const startMinutes = START_HOUR * 60; // 08:00 = 480 minutes
  const endMinutes = END_HOUR * 60 + END_MINUTE; // 22:30 = 1350 minutes
  
  const randomMinutes = startMinutes + Math.random() * (endMinutes - startMinutes);
  const hours = Math.floor(randomMinutes / 60);
  const minutes = Math.floor(randomMinutes % 60);
  const seconds = Math.floor(Math.random() * 60);
  const milliseconds = Math.floor(Math.random() * 1000);
  
  // Create timestamp in Vietnam time
  const vietnamTime = new Date(today);
  vietnamTime.setHours(hours, minutes, seconds, milliseconds);
  
  // Convert to UTC (subtract 7 hours for server storage)
  const utcTime = new Date(vietnamTime.getTime() - (7 * 60 * 60 * 1000));
  
  return utcTime.toISOString();
};

// Generate random weight
const generateWeight = (state) => {
  const range = WEIGHT_RANGES[state === 1 ? 'add' : 'remove'];
  return Math.floor(Math.random() * (range.max - range.min) + range.min);
};

// Generate last stable weight (previous cart weight)
const generateLastStableWeight = () => {
  // Random previous weight between 0 and 5kg
  return Math.floor(Math.random() * 5000);
};

// Generate motion log entry
const generateMotionLog = (sessionIds, cartIds) => {
  // Determine state based on ratio
  const rand = Math.random();
  const state = rand < ADD_RATIO ? 1 : 2; // 1 = add, 2 = remove
  
  const weight = generateWeight(state);
  const lastStableWeight = generateLastStableWeight();
  
  return {
    state: state,
    weight: weight,
    last_stable_weight: lastStableWeight,
    timestamp: generateVietnameseTimestamp(),
    session_id: sessionIds[Math.floor(Math.random() * sessionIds.length)],
    cart_id: cartIds[Math.floor(Math.random() * cartIds.length)]
  };
};

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

// Post motion log
const postMotionLog = async (token, logData) => {
  try {
    const response = await axios.post(`${API_BASE}${MOTION_LOG_ENDPOINT}`, logData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Failed to post motion log:', error.response?.data || error.message);
    throw error;
  }
};

// Main function
const generateMotionLogs = async () => {
  try {
    console.log('🚀 Starting Vietnam motion log generation...');
    console.log(`📊 Target: ${TOTAL_LOGS} motion logs`);
    console.log(`⚖️  Add ratio: ${(ADD_RATIO * 100).toFixed(1)}% (≈${Math.round(TOTAL_LOGS * ADD_RATIO)} logs)`);
    console.log(`🗑️  Remove ratio: ${(REMOVE_RATIO * 100).toFixed(1)}% (≈${Math.round(TOTAL_LOGS * REMOVE_RATIO)} logs)`);
    console.log(`🕐 Time range: ${START_HOUR}:00 - ${END_HOUR}:${END_MINUTE.toString().padStart(2, '0')} (Vietnam time)`);
    
    // Login
    const token = await login();
    
    // Generate IDs
    const sessionIds = generateSessionIds(SESSION_COUNT);
    const cartIds = generateCartIds(CART_COUNT);
    
    console.log(`📝 Sessions: ${sessionIds.slice(0, 5).join(', ')}... (${SESSION_COUNT} total)`);
    console.log(`🛒 Carts: ${cartIds.join(', ')}`);
    console.log('');
    
    // Generate and post logs
    let successCount = 0;
    let errorCount = 0;
    let addCount = 0;
    let removeCount = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < TOTAL_LOGS; i++) {
      try {
        const logData = generateMotionLog(sessionIds, cartIds);
        
        if (logData.state === 1) {
          addCount++;
        } else {
          removeCount++;
        }
        totalWeight += logData.weight;
        
        await postMotionLog(token, logData);
        successCount++;
        
        // Progress indicator
        if ((i + 1) % 25 === 0) {
          console.log(`📈 Progress: ${i + 1}/${TOTAL_LOGS} (${Math.round((i + 1) / TOTAL_LOGS * 100)}%)`);
        }
        
        // Small delay to avoid overwhelming the server
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error posting log ${i + 1}:`, error.message);
      }
    }
    
    console.log('');
    console.log('✅ Vietnam motion log generation completed!');
    console.log(`📊 Results:`);
    console.log(`   • Total logs: ${TOTAL_LOGS}`);
    console.log(`   • Successful: ${successCount}`);
    console.log(`   • Errors: ${errorCount}`);
    console.log(`   • Add operations: ${addCount} (${(addCount / successCount * 100).toFixed(1)}%)`);
    console.log(`   • Remove operations: ${removeCount} (${(removeCount / successCount * 100).toFixed(1)}%)`);
    console.log(`   • Remove/Add ratio: 1:${(addCount / removeCount).toFixed(1)}`);
    console.log(`   • Average weight: ${Math.round(totalWeight / successCount)}g`);
    console.log(`   • Sessions used: ${SESSION_COUNT}`);
    console.log(`   • Carts used: ${CART_COUNT}`);
    console.log(`   • Time coverage: ${START_HOUR}:00 - ${END_HOUR}:${END_MINUTE.toString().padStart(2, '0')} VN time`);
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  generateMotionLogs();
}

module.exports = { generateMotionLogs };
