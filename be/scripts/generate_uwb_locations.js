// scripts/generate_uwb_locations.js
const axios = require('axios');

// Configuration
const API_BASE = 'http://localhost:5001';
const LOGIN_ENDPOINT = '/api/auth/login';
const UWB_LOG_ENDPOINT = '/api/motion/uwb-log';

// Generate data configuration
const TOTAL_LOCATIONS = 2000;
const SESSION_COUNT = 15; // Number of different sessions
const CART_COUNT = 8; // Number of different carts

// Map boundaries (as specified)
const MAP_CONFIG = {
  maxX: 3320,
  maxY: 6900,
  minX: 0,
  minY: 0
};

// Time ranges (in hours, 24-hour format)
const MORNING_START = 9.5; // 09:30
const MORNING_END = 11; // 11:00
const EVENING_START = 16.5; // 16:30
const EVENING_END = 19.5; // 19:30

// Popular areas on the map (where people tend to gather)
const POPULAR_AREAS = [
  { centerX: 500, centerY: 1000, radius: 300, weight: 0.3 }, // Entrance area
  { centerX: 1500, centerY: 2000, radius: 400, weight: 0.2 }, // Food court
  { centerX: 2800, centerY: 3500, radius: 250, weight: 0.15 }, // Electronics section
  { centerX: 800, centerY: 4500, radius: 200, weight: 0.1 }, // Clothing area
  { centerX: 2200, centerY: 5800, radius: 300, weight: 0.15 }, // Checkout area
  { centerX: 1000, centerY: 6000, radius: 150, weight: 0.1 }, // Services area
];

// Generate session IDs for UWB
const generateUWBSessionIds = (count) => {
  const sessions = [];
  for (let i = 1; i <= count; i++) {
    sessions.push(`uwb_session_${String(i).padStart(3, '0')}`);
  }
  return sessions;
};

// Generate cart IDs for UWB
const generateUWBCartIds = (count) => {
  const carts = [];
  for (let i = 1; i <= count; i++) {
    carts.push(`uwb_cart_${String(i).padStart(2, '0')}`);
  }
  return carts;
};

// Generate random timestamp within allowed time ranges
const generateUWBTimestamp = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Choose random time slot (morning or evening)
  const isMorning = Math.random() < 0.65; // 65% morning, 35% evening
  
  let startHour, endHour;
  if (isMorning) {
    startHour = MORNING_START;
    endHour = MORNING_END;
  } else {
    startHour = EVENING_START;
    endHour = EVENING_END;
  }
  
  const randomHour = startHour + Math.random() * (endHour - startHour);
  const hours = Math.floor(randomHour);
  const minutes = Math.floor((randomHour - hours) * 60);
  const seconds = Math.floor(Math.random() * 60);
  const milliseconds = Math.floor(Math.random() * 1000);
  
  const timestamp = new Date(today);
  timestamp.setHours(hours, minutes, seconds, milliseconds);
  
  return timestamp.toISOString();
};

// Generate coordinates based on popular areas
const generateCoordinates = () => {
  const rand = Math.random();
  let cumulativeWeight = 0;
  
  // Choose area based on weight
  for (const area of POPULAR_AREAS) {
    cumulativeWeight += area.weight;
    if (rand <= cumulativeWeight) {
      // Generate coordinates within this area
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * area.radius;
      
      let x = area.centerX + Math.cos(angle) * distance;
      let y = area.centerY + Math.sin(angle) * distance;
      
      // Ensure coordinates are within map bounds
      x = Math.max(MAP_CONFIG.minX, Math.min(MAP_CONFIG.maxX, x));
      y = Math.max(MAP_CONFIG.minY, Math.min(MAP_CONFIG.maxY, y));
      
      return { x: Math.round(x), y: Math.round(y) };
    }
  }
  
  // Fallback: random coordinates anywhere on the map
  return {
    x: Math.floor(Math.random() * (MAP_CONFIG.maxX - MAP_CONFIG.minX) + MAP_CONFIG.minX),
    y: Math.floor(Math.random() * (MAP_CONFIG.maxY - MAP_CONFIG.minY) + MAP_CONFIG.minY)
  };
};

// Generate raw distances (simulated UWB anchor distances)
const generateRawDistances = () => {
  // Simulate 4-6 UWB anchors with distances
  const anchorCount = 4 + Math.floor(Math.random() * 3);
  const distances = [];
  
  for (let i = 0; i < anchorCount; i++) {
    // Random distance between 0.5m to 50m (in centimeters)
    const distance = 50 + Math.random() * 4950;
    distances.push(Math.round(distance));
  }
  
  return distances;
};

// Generate UWB location entry
const generateUWBLocation = (sessionIds, cartIds) => {
  const coords = generateCoordinates();
  
  return {
    x: coords.x,
    y: coords.y,
    timestamp: generateUWBTimestamp(),
    session_id: sessionIds[Math.floor(Math.random() * sessionIds.length)],
    cart_id: cartIds[Math.floor(Math.random() * cartIds.length)],
    raw_distances: generateRawDistances(),
    filtered: Math.random() > 0.1, // 90% filtered (good quality), 10% unfiltered
    tracking_mode: Math.random() > 0.2 // 80% in tracking mode, 20% not
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

// Post UWB location
const postUWBLocation = async (token, locationData) => {
  try {
    const response = await axios.post(`${API_BASE}${UWB_LOG_ENDPOINT}`, locationData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('❌ Failed to post location:', error.response?.data || error.message);
    throw error;
  }
};

// Main function
const generateUWBLocations = async () => {
  try {
    console.log('📍 Starting UWB location generation...');
    console.log(`📊 Target: ${TOTAL_LOCATIONS} location points`);
    console.log(`🗺️  Map size: ${MAP_CONFIG.maxX} x ${MAP_CONFIG.maxY}`);
    
    // Login
    const token = await login();
    
    // Generate IDs
    const sessionIds = generateUWBSessionIds(SESSION_COUNT);
    const cartIds = generateUWBCartIds(CART_COUNT);
    
    console.log(`📝 Sessions: ${sessionIds.slice(0, 5).join(', ')}... (${SESSION_COUNT} total)`);
    console.log(`🛒 Carts: ${cartIds.join(', ')}`);
    console.log('🎯 Popular areas configured for realistic distribution');
    console.log('');
    
    // Generate and post locations
    let successCount = 0;
    let errorCount = 0;
    let filteredCount = 0;
    let trackingCount = 0;
    
    for (let i = 0; i < TOTAL_LOCATIONS; i++) {
      try {
        const locationData = generateUWBLocation(sessionIds, cartIds);
        
        if (locationData.filtered) filteredCount++;
        if (locationData.tracking_mode) trackingCount++;
        
        await postUWBLocation(token, locationData);
        successCount++;
        
        // Progress indicator
        if ((i + 1) % 100 === 0) {
          console.log(`📈 Progress: ${i + 1}/${TOTAL_LOCATIONS} (${Math.round((i + 1) / TOTAL_LOCATIONS * 100)}%)`);
        }
        
        // Small delay to avoid overwhelming the server
        if (i % 20 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error posting location ${i + 1}:`, error.message);
      }
    }
    
    console.log('');
    console.log('✅ UWB location generation completed!');
    console.log(`📊 Results:`);
    console.log(`   • Total locations: ${TOTAL_LOCATIONS}`);
    console.log(`   • Successful: ${successCount}`);
    console.log(`   • Errors: ${errorCount}`);
    console.log(`   • Filtered (good quality): ${filteredCount}`);
    console.log(`   • In tracking mode: ${trackingCount}`);
    console.log(`   • Sessions used: ${SESSION_COUNT}`);
    console.log(`   • Carts used: ${CART_COUNT}`);
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  generateUWBLocations();
}

module.exports = { generateUWBLocations };
