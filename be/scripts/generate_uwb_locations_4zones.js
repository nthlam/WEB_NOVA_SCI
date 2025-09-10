// scripts/generate_uwb_locations_4zones.js
const axios = require('axios');

// Configuration
const API_BASE = 'http://localhost:5001';
const LOGIN_ENDPOINT = '/api/auth/login';
const UWB_LOG_ENDPOINT = '/api/motion/uwb-log';

// Generate data configuration
const TOTAL_LOCATIONS = 1000;
const SESSION_COUNT = 15; // Number of different sessions
const CART_COUNT = 8; // Number of different carts

// Map boundaries (existing map size)
const MAP_CONFIG = {
  maxX: 3320,
  maxY: 6900,
  minX: 0,
  minY: 0
};

// Time ranges (in hours, 24-hour format) - Extended hours for better distribution
const TIME_RANGES = [
  { start: 8.5, end: 11.5, weight: 0.30 }, // Morning 08:30 - 11:30
  { start: 13.0, end: 16.5, weight: 0.25 }, // Afternoon 13:00 - 16:30
  { start: 17.0, end: 20.5, weight: 0.35 }, // Evening 17:00 - 20:30
  { start: 11.5, end: 13.0, weight: 0.10 }  // Lunch 11:30 - 13:00
];

// 4 Zone areas based on your specified coordinates with uneven distribution
const ZONE_AREAS = [
  { 
    centerX: 2600, 
    centerY: 3984, 
    radius: 420,      // Largest radius for main zone
    weight: 0.35,     // 35% of points - Main hub
    name: "Zone A - Main Hub (2600,3984)"
  },
  { 
    centerX: 2500, 
    centerY: 3987, 
    radius: 380,      // Medium radius
    weight: 0.28,     // 28% of points - Secondary hub
    name: "Zone B - Secondary Hub (2500,3987)"
  },
  { 
    centerX: 2400, 
    centerY: 3900, 
    radius: 350,      // Medium radius
    weight: 0.22,     // 22% of points - Tertiary zone
    name: "Zone C - Activity Zone (2400,3900)"
  },
  { 
    centerX: 652, 
    centerY: 2455, 
    radius: 300,      // Smaller radius for distant zone
    weight: 0.15,     // 15% of points - Remote zone
    name: "Zone D - Remote Area (652,2455)"
  }
];

// Generate session IDs for UWB
const generateUWBSessionIds = (count) => {
  const sessions = [];
  for (let i = 1; i <= count; i++) {
    sessions.push(`uwb_4zone_session_${String(i).padStart(3, '0')}`);
  }
  return sessions;
};

// Generate cart IDs for UWB
const generateUWBCartIds = (count) => {
  const carts = [];
  for (let i = 1; i <= count; i++) {
    carts.push(`uwb_4zone_cart_${String(i).padStart(2, '0')}`);
  }
  return carts;
};

// Generate random timestamp with time distribution across zones
const generate4ZoneTimestamp = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Choose time range based on weight
  const rand = Math.random();
  let cumulativeWeight = 0;
  let selectedRange = TIME_RANGES[0];
  
  for (const range of TIME_RANGES) {
    cumulativeWeight += range.weight;
    if (rand <= cumulativeWeight) {
      selectedRange = range;
      break;
    }
  }
  
  const randomHour = selectedRange.start + Math.random() * (selectedRange.end - selectedRange.start);
  const hours = Math.floor(randomHour);
  const minutes = Math.floor((randomHour - hours) * 60);
  const seconds = Math.floor(Math.random() * 60);
  const milliseconds = Math.floor(Math.random() * 1000);
  
  const timestamp = new Date(today);
  timestamp.setHours(hours, minutes, seconds, milliseconds);
  
  return timestamp.toISOString();
};

// Generate coordinates based on 4 zones with uneven distribution
const generate4ZoneCoordinates = () => {
  const rand = Math.random();
  let cumulativeWeight = 0;
  
  // Choose zone based on weight (uneven distribution)
  for (const zone of ZONE_AREAS) {
    cumulativeWeight += zone.weight;
    if (rand <= cumulativeWeight) {
      // Generate coordinates within this zone with realistic distribution
      const angle = Math.random() * 2 * Math.PI;
      
      // Use different distribution patterns for different zones
      let distance;
      if (zone.weight > 0.3) {
        // Main hub - more concentrated in center
        distance = zone.radius * Math.pow(Math.random(), 1.5);
      } else if (zone.weight > 0.2) {
        // Secondary zones - moderate spread
        distance = zone.radius * Math.sqrt(Math.random());
      } else {
        // Remote zone - more uniform distribution
        distance = zone.radius * Math.random();
      }
      
      let x = zone.centerX + Math.cos(angle) * distance;
      let y = zone.centerY + Math.sin(angle) * distance;
      
      // Add some natural variation
      x += (Math.random() - 0.5) * 80; // ±40 pixel variation
      y += (Math.random() - 0.5) * 80;
      
      // Ensure coordinates are within map bounds
      x = Math.max(MAP_CONFIG.minX, Math.min(MAP_CONFIG.maxX, x));
      y = Math.max(MAP_CONFIG.minY, Math.min(MAP_CONFIG.maxY, y));
      
      return { 
        x: Math.round(x), 
        y: Math.round(y),
        zone: zone.name
      };
    }
  }
  
  // Fallback: random coordinates (very rare)
  return {
    x: Math.floor(Math.random() * (MAP_CONFIG.maxX - MAP_CONFIG.minX) + MAP_CONFIG.minX),
    y: Math.floor(Math.random() * (MAP_CONFIG.maxY - MAP_CONFIG.minY) + MAP_CONFIG.minY),
    zone: "Random Fallback"
  };
};

// Generate enhanced raw distances (simulated UWB anchor distances)
const generateEnhanced4ZoneRawDistances = () => {
  // Simulate 4-6 UWB anchors with zone-specific characteristics
  const anchorCount = 4 + Math.floor(Math.random() * 3);
  const distances = [];
  
  for (let i = 0; i < anchorCount; i++) {
    // Random distance between 1m to 55m (in centimeters) with realistic variation
    const baseDistance = 100 + Math.random() * 5400;
    // Add measurement noise (±3cm)
    const noise = (Math.random() - 0.5) * 60;
    const distance = Math.max(80, baseDistance + noise);
    distances.push(Math.round(distance));
  }
  
  return distances;
};

// Generate UWB location entry for 4-zone system
const generate4ZoneUWBLocation = (sessionIds, cartIds) => {
  const coords = generate4ZoneCoordinates();
  
  return {
    x: coords.x,
    y: coords.y,
    timestamp: generate4ZoneTimestamp(),
    session_id: sessionIds[Math.floor(Math.random() * sessionIds.length)],
    cart_id: cartIds[Math.floor(Math.random() * cartIds.length)],
    raw_distances: generateEnhanced4ZoneRawDistances(),
    filtered: Math.random() > 0.09, // 91% filtered (high quality), 9% unfiltered
    tracking_mode: Math.random() > 0.18, // 82% in tracking mode, 18% not
    // Additional metadata for debugging (not part of the model)
    _debug_zone: coords.zone
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
const post4ZoneUWBLocation = async (token, locationData) => {
  try {
    // Remove debug info before posting
    const { _debug_zone, ...cleanData } = locationData;
    
    const response = await axios.post(`${API_BASE}${UWB_LOG_ENDPOINT}`, cleanData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return { ...response.data, _debug_zone };
  } catch (error) {
    console.error('❌ Failed to post location:', error.response?.data || error.message);
    throw error;
  }
};

// Main function
const generate4ZoneUWBLocations = async () => {
  try {
    console.log('📍 Starting 4-Zone UWB location generation...');
    console.log(`📊 Target: ${TOTAL_LOCATIONS} location points`);
    console.log(`🗺️  Map size: ${MAP_CONFIG.maxX} x ${MAP_CONFIG.maxY}`);
    console.log('');
    
    // Display zone information
    console.log('🎯 4-Zone distribution:');
    ZONE_AREAS.forEach((zone, idx) => {
      const expectedPoints = Math.round(TOTAL_LOCATIONS * zone.weight);
      console.log(`   ${idx + 1}. ${zone.name}`);
      console.log(`      Center: (${zone.centerX}, ${zone.centerY}), Radius: ${zone.radius}px`);
      console.log(`      Weight: ${(zone.weight * 100).toFixed(1)}% (~${expectedPoints} points)`);
    });
    console.log('');
    
    // Login
    const token = await login();
    
    // Generate IDs
    const sessionIds = generateUWBSessionIds(SESSION_COUNT);
    const cartIds = generateUWBCartIds(CART_COUNT);
    
    console.log(`📝 Sessions: ${sessionIds.slice(0, 3).join(', ')}... (${SESSION_COUNT} total)`);
    console.log(`🛒 Carts: ${cartIds.join(', ')}`);
    console.log('');
    console.log('⏱️  Time distribution: Morning 30%, Afternoon 25%, Evening 35%, Lunch 10%');
    console.log('');
    
    // Generate and post locations
    let successCount = 0;
    let errorCount = 0;
    let filteredCount = 0;
    let trackingCount = 0;
    const zoneStats = {};
    
    for (let i = 0; i < TOTAL_LOCATIONS; i++) {
      try {
        const locationData = generate4ZoneUWBLocation(sessionIds, cartIds);
        
        if (locationData.filtered) filteredCount++;
        if (locationData.tracking_mode) trackingCount++;
        
        // Track zone statistics
        const zone = locationData._debug_zone;
        zoneStats[zone] = (zoneStats[zone] || 0) + 1;
        
        await post4ZoneUWBLocation(token, locationData);
        successCount++;
        
        // Progress indicator with zone info
        if ((i + 1) % 100 === 0) {
          console.log(`📈 Progress: ${i + 1}/${TOTAL_LOCATIONS} (${Math.round((i + 1) / TOTAL_LOCATIONS * 100)}%) - Latest: ${zone.split(' - ')[0]}`);
        }
        
        // Small delay to avoid overwhelming the server
        if (i % 20 === 0) {
          await new Promise(resolve => setTimeout(resolve, 30));
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error posting location ${i + 1}:`, error.message);
      }
    }
    
    console.log('');
    console.log('✅ 4-Zone UWB location generation completed!');
    console.log(`📊 Final Results:`);
    console.log(`   • Total locations: ${TOTAL_LOCATIONS}`);
    console.log(`   • Successful: ${successCount}`);
    console.log(`   • Errors: ${errorCount}`);
    console.log(`   • Filtered (good quality): ${filteredCount} (${Math.round(filteredCount/successCount*100)}%)`);
    console.log(`   • In tracking mode: ${trackingCount} (${Math.round(trackingCount/successCount*100)}%)`);
    console.log(`   • Sessions used: ${SESSION_COUNT}`);
    console.log(`   • Carts used: ${CART_COUNT}`);
    console.log('');
    console.log('🎯 Zone distribution achieved:');
    Object.entries(zoneStats).forEach(([zone, count]) => {
      const percentage = Math.round(count/successCount*100);
      console.log(`   • ${zone}: ${count} points (${percentage}%)`);
    });
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  generate4ZoneUWBLocations();
}

module.exports = { generate4ZoneUWBLocations };
