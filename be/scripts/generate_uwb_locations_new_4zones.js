// scripts/generate_uwb_locations_new_4zones.js
const axios = require('axios');

// Configuration
const API_BASE = 'http://localhost:5001';
const LOGIN_ENDPOINT = '/api/auth/login';
const UWB_LOCATION_ENDPOINT = '/api/motion/uwb-location';

// Generate data configuration
const TOTAL_LOCATIONS = 1000;
const SESSION_COUNT = 12; // Number of different sessions
const CART_COUNT = 6; // Number of different carts

// Map boundaries (existing map size)
const MAP_CONFIG = {
  maxX: 3320,
  maxY: 6900,
  minX: 0,
  minY: 0
};

// 4 vị trí tập trung mới theo yêu cầu
const ZONES = [
  { centerX: 2401, centerY: 1840, weight: 0.30, radius: 180, name: "Zone 1" }, // 30%
  { centerX: 2401, centerY: 2760, weight: 0.25, radius: 160, name: "Zone 2" }, // 25%
  { centerX: 2200, centerY: 1840, weight: 0.25, radius: 160, name: "Zone 3" }, // 25%
  { centerX: 2200, centerY: 2740, weight: 0.20, radius: 140, name: "Zone 4" }  // 20%
];

// Time range: 8h sáng đến 12h sáng hôm nay (8:00 - 12:00)
const getTimeRange = () => {
  const today = new Date();
  const startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0, 0); // 8:00 AM
  const endTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);   // 12:00 PM
  return { startTime, endTime };
};

// Generate random timestamp between 8h-12h hôm nay, phân bố không đều
const generateTimestamp = () => {
  const { startTime, endTime } = getTimeRange();
  const totalMs = endTime.getTime() - startTime.getTime();
  
  // Tạo phân bố không đều: tập trung nhiều hơn ở 9h-11h
  const timeWeights = [
    { start: 0.0, end: 0.25, weight: 0.15 }, // 8:00-9:00 (15%)
    { start: 0.25, end: 0.5, weight: 0.35 }, // 9:00-10:00 (35%)
    { start: 0.5, end: 0.75, weight: 0.35 }, // 10:00-11:00 (35%)
    { start: 0.75, end: 1.0, weight: 0.15 }  // 11:00-12:00 (15%)
  ];
  
  const random = Math.random();
  let cumulativeWeight = 0;
  
  for (const timeWeight of timeWeights) {
    cumulativeWeight += timeWeight.weight;
    if (random <= cumulativeWeight) {
      const segmentStart = timeWeight.start * totalMs;
      const segmentEnd = timeWeight.end * totalMs;
      const segmentRandom = Math.random();
      const timestamp = new Date(startTime.getTime() + segmentStart + (segmentRandom * (segmentEnd - segmentStart)));
      return timestamp.toISOString();
    }
  }
  
  // Fallback
  const randomMs = Math.random() * totalMs;
  return new Date(startTime.getTime() + randomMs).toISOString();
};

// Generate session IDs
const generateSessionIds = (count) => {
  const sessions = [];
  for (let i = 1; i <= count; i++) {
    sessions.push(`UWB_SESSION_NEW_${String(i).padStart(3, '0')}`);
  }
  return sessions;
};

// Generate cart IDs
const generateCartIds = (count) => {
  const carts = [];
  for (let i = 1; i <= count; i++) {
    carts.push(`CART_NEW_${String(i).padStart(2, '0')}`);
  }
  return carts;
};

// Generate coordinates around specified zones with uneven distribution
const generateCoordinates = () => {
  const random = Math.random();
  let cumulativeWeight = 0;
  
  for (let i = 0; i < ZONES.length; i++) {
    cumulativeWeight += ZONES[i].weight;
    if (random <= cumulativeWeight) {
      const zone = ZONES[i];
      
      // Generate point within radius using normal distribution
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * zone.radius;
      
      // Add some variation to make it more realistic
      const jitter = (Math.random() - 0.5) * 100; // ±50 pixels
      
      let x = zone.centerX + Math.cos(angle) * distance + jitter;
      let y = zone.centerY + Math.sin(angle) * distance + jitter;
      
      // Ensure coordinates are within map bounds
      x = Math.max(MAP_CONFIG.minX, Math.min(MAP_CONFIG.maxX, x));
      y = Math.max(MAP_CONFIG.minY, Math.min(MAP_CONFIG.maxY, y));
      
      return {
        x: Math.round(x),
        y: Math.round(y),
        zone: i + 1,
        zoneName: zone.name
      };
    }
  }
  
  // Fallback to first zone
  const zone = ZONES[0];
  return {
    x: zone.centerX,
    y: zone.centerY,
    zone: 1,
    zoneName: zone.name
  };
};

// Generate raw distances (simulated UWB anchor distances)
const generateRawDistances = () => {
  const anchorCount = 4 + Math.floor(Math.random() * 4); // 4-7 anchors
  const distances = [];
  
  for (let i = 0; i < anchorCount; i++) {
    // Random distance between 0.5m to 40m (in centimeters)
    const distance = 50 + Math.random() * 3950;
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
    timestamp: generateTimestamp(),
    session_id: sessionIds[Math.floor(Math.random() * sessionIds.length)],
    cart_id: cartIds[Math.floor(Math.random() * cartIds.length)],
    raw_distances: generateRawDistances(),
    filtered: Math.random() > 0.12, // 88% filtered (very good quality), 12% unfiltered
    tracking_mode: Math.random() > 0.18, // 82% in tracking mode, 18% not
    // Additional metadata for debugging (not part of the model)
    _debug_zone: coords.zone,
    _debug_zone_name: coords.zoneName
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
    // Remove debug info before posting
    const { _debug_zone, _debug_zone_name, ...cleanData } = locationData;
    
    const response = await axios.post(`${API_BASE}${UWB_LOCATION_ENDPOINT}`, cleanData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return { ...response.data, _debug_zone, _debug_zone_name };
  } catch (error) {
    console.error('❌ Failed to post location:', error.response?.data || error.message);
    throw error;
  }
};

// Main function
const generateNew4ZonesUWBLocations = async () => {
  try {
    const { startTime, endTime } = getTimeRange();
    console.log('📍 Starting NEW 4-Zones UWB location generation...');
    console.log(`📊 Target: ${TOTAL_LOCATIONS} location points`);
    console.log(`🗺️  Map size: ${MAP_CONFIG.maxX} x ${MAP_CONFIG.maxY}`);
    console.log(`⏰ Time range: ${startTime.toLocaleString('vi-VN')} - ${endTime.toLocaleString('vi-VN')}`);
    console.log('');
    
    // Display zone information
    console.log('🎯 NEW Target zones:');
    ZONES.forEach((zone, idx) => {
      console.log(`   ${zone.name}: (${zone.centerX}, ${zone.centerY}) - ${(zone.weight * 100).toFixed(0)}% - radius: ${zone.radius}px`);
    });
    console.log('');
    
    // Login
    const token = await login();
    
    // Generate IDs
    const sessionIds = generateSessionIds(SESSION_COUNT);
    const cartIds = generateCartIds(CART_COUNT);
    
    console.log(`📝 Sessions: ${sessionIds.slice(0, 3).join(', ')}... (${SESSION_COUNT} total)`);
    console.log(`🛒 Carts: ${cartIds.join(', ')}`);
    console.log('');
    
    // Generate and post locations
    let successCount = 0;
    let errorCount = 0;
    let filteredCount = 0;
    let trackingCount = 0;
    const zoneStats = {};
    
    // Initialize zone stats
    ZONES.forEach((zone, i) => {
      zoneStats[i + 1] = { 
        count: 0, 
        name: zone.name,
        center: `(${zone.centerX}, ${zone.centerY})`,
        expectedPercent: (zone.weight * 100).toFixed(1)
      };
    });
    
    for (let i = 0; i < TOTAL_LOCATIONS; i++) {
      try {
        const locationData = generateUWBLocation(sessionIds, cartIds);
        
        // Track which zone this point belongs to
        if (locationData._debug_zone) {
          zoneStats[locationData._debug_zone].count++;
        }
        
        if (locationData.filtered) filteredCount++;
        if (locationData.tracking_mode) trackingCount++;
        
        await postUWBLocation(token, locationData);
        successCount++;
        
        // Progress indicator
        if ((i + 1) % 100 === 0) {
          console.log(`📈 Progress: ${i + 1}/${TOTAL_LOCATIONS} (${Math.round((i + 1) / TOTAL_LOCATIONS * 100)}%)`);
        }
        
        // Small delay to avoid overwhelming the server
        if (i % 25 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error posting location ${i + 1}:`, error.message);
      }
    }
    
    // Final statistics
    console.log('\n📊 NEW Generation completed!');
    console.log('════════════════════════════════════════');
    console.log(`✅ Successful: ${successCount}/${TOTAL_LOCATIONS}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`🔍 Filtered: ${filteredCount} (${(filteredCount/successCount*100).toFixed(1)}%)`);
    console.log(`📡 Tracking mode: ${trackingCount} (${(trackingCount/successCount*100).toFixed(1)}%)`);
    console.log('');
    
    console.log('🎯 NEW Zone distribution:');
    Object.values(zoneStats).forEach(zone => {
      const actualPercent = (zone.count / successCount * 100).toFixed(1);
      console.log(`   ${zone.name}: ${zone.count} points (${actualPercent}%, expected ${zone.expectedPercent}%) at ${zone.center}`);
    });
    
    console.log('\n🎉 NEW 4-zones UWB location generation completed successfully!');
    console.log('📍 Coordinates used:');
    console.log('   Zone 1: (2401, 1840)');
    console.log('   Zone 2: (2401, 2760)'); 
    console.log('   Zone 3: (2200, 1840)');
    console.log('   Zone 4: (2200, 2740)');
    
  } catch (error) {
    console.error('💥 Generation failed:', error.message);
  }
};

// Run the script
if (require.main === module) {
  generateNew4ZonesUWBLocations();
}

module.exports = { generateNew4ZonesUWBLocations };
