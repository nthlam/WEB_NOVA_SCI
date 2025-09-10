// scripts/generate_motion_logs.js
const axios = require('axios');

// Configuration
const API_BASE = 'http://localhost:5001';
const LOGIN_ENDPOINT = '/api/auth/login';
const MOTION_LOG_ENDPOINT = '/api/motion/log';

// Generate data configuration
const TOTAL_LOGS = 1000;
const REMOVE_RATIO = 0.1; // 10% remove, 90% add
const WEIGHTS = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 750, 1000, 1250, 1500]; // grams
const SESSION_COUNT = 20; // Number of different sessions
const CART_COUNT = 5; // Number of different carts

// Time ranges (in hours, 24-hour format)
const MORNING_START = 9.5; // 09:30
const MORNING_END = 11; // 11:00
const EVENING_START = 16.5; // 16:30
const EVENING_END = 19.5; // 19:30

// Generate session IDs
const generateSessionIds = (count) => {
  const sessions = [];
  for (let i = 1; i <= count; i++) {
    sessions.push(`session_${String(i).padStart(3, '0')}`);
  }
  return sessions;
};

// Generate cart IDs
const generateCartIds = (count) => {
  const carts = [];
  for (let i = 1; i <= count; i++) {
    carts.push(`cart_${String(i).padStart(2, '0')}`);
  }
  return carts;
};

// Generate random timestamp within allowed time ranges for today
const generateTimestamp = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today
  
  // Choose random time slot (morning or evening)
  const isMorning = Math.random() < 0.6; // 60% morning, 40% evening
  
  let startHour, endHour;
  if (isMorning) {
    startHour = MORNING_START;
    endHour = MORNING_END;
  } else {
    startHour = EVENING_START;
    endHour = EVENING_END;
  }
  
  // Generate random time within the chosen slot
  const randomHour = startHour + Math.random() * (endHour - startHour);
  const hours = Math.floor(randomHour);
  const minutes = Math.floor((randomHour - hours) * 60);
  const seconds = Math.floor(Math.random() * 60);
  const milliseconds = Math.floor(Math.random() * 1000);
  
  const timestamp = new Date(today);
  timestamp.setHours(hours, minutes, seconds, milliseconds);
  
  return timestamp.toISOString();
};

// Generate random weight
const generateWeight = () => {
  return WEIGHTS[Math.floor(Math.random() * WEIGHTS.length)];
};

// Generate motion log entry
const generateMotionLog = (sessionIds, cartIds) => {
  const isRemove = Math.random() < REMOVE_RATIO;
  const weight = generateWeight();
  
  return {
    state: isRemove ? 2 : 1, // 1 = add, 2 = remove
    weight: isRemove ? 0 : weight, // Remove operations have 0 weight
    last_stable_weight: isRemove ? weight : 0, // Remove operations show what was removed
    timestamp: generateTimestamp(),
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
    console.error('❌ Failed to post log:', error.response?.data || error.message);
    throw error;
  }
};

// Main function
const generateMotionLogs = async () => {
  try {
    console.log('🚀 Starting motion log generation...');
    console.log(`📊 Target: ${TOTAL_LOGS} logs (${Math.round(TOTAL_LOGS * (1 - REMOVE_RATIO))} adds, ${Math.round(TOTAL_LOGS * REMOVE_RATIO)} removes)`);
    
    // Login
    const token = await login();
    
    // Generate IDs
    const sessionIds = generateSessionIds(SESSION_COUNT);
    const cartIds = generateCartIds(CART_COUNT);
    
    console.log(`📝 Sessions: ${sessionIds.join(', ')}`);
    console.log(`🛒 Carts: ${cartIds.join(', ')}`);
    console.log('');
    
    // Generate and post logs
    let successCount = 0;
    let errorCount = 0;
    let addCount = 0;
    let removeCount = 0;
    
    for (let i = 0; i < TOTAL_LOGS; i++) {
      try {
        const logData = generateMotionLog(sessionIds, cartIds);
        
        if (logData.state === 1) addCount++;
        else removeCount++;
        
        await postMotionLog(token, logData);
        successCount++;
        
        // Progress indicator
        if ((i + 1) % 50 === 0) {
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
    console.log('✅ Motion log generation completed!');
    console.log(`📊 Results:`);
    console.log(`   • Total logs: ${TOTAL_LOGS}`);
    console.log(`   • Successful: ${successCount}`);
    console.log(`   • Errors: ${errorCount}`);
    console.log(`   • Add operations: ${addCount}`);
    console.log(`   • Remove operations: ${removeCount}`);
    console.log(`   • Remove ratio: ${(removeCount / (addCount + removeCount) * 100).toFixed(1)}%`);
    
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
