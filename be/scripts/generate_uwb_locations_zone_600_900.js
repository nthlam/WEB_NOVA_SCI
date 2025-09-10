// scripts/generate_uwb_locations_zone_600_900.js
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

// Target zone bounds
const TARGET_ZONE = {
  minX: 600,
  maxX: 900,
  minY: 1380,
  maxY: 1840,
  name: "Zone 600-900 x 1380-1840"
};

// Calculate zone properties
const ZONE_WIDTH = TARGET_ZONE.maxX - TARGET_ZONE.minX; // 300
const ZONE_HEIGHT = TARGET_ZONE.maxY - TARGET_ZONE.minY; // 460
const ZONE_CENTER = {
  x: (TARGET_ZONE.minX + TARGET_ZONE.maxX) / 2, // 750
  y: (TARGET_ZONE.minY + TARGET_ZONE.maxY) / 2  // 1610
};

// Định nghĩa các vùng phân bố không đều trong zone
const DISTRIBUTION_ZONES = [
  // Góc trên trái
  { 
    minX: TARGET_ZONE.minX, 
    maxX: TARGET_ZONE.minX + ZONE_WIDTH * 0.4, 
    minY: TARGET_ZONE.minY + ZONE_HEIGHT * 0.6, 
    maxY: TARGET_ZONE.maxY, 
    weight: 0.20, 
    name: "Top-Left Corner" 
  },
  // Góc trên phải
  { 
    minX: TARGET_ZONE.minX + ZONE_WIDTH * 0.6, 
    maxX: TARGET_ZONE.maxX, 
    minY: TARGET_ZONE.minY + ZONE_HEIGHT * 0.6, 
    maxY: TARGET_ZONE.maxY, 
    weight: 0.25, 
    name: "Top-Right Corner" 
  },
  // Góc dưới trái
  { 
    minX: TARGET_ZONE.minX, 
    maxX: TARGET_ZONE.minX + ZONE_WIDTH * 0.4, 
    minY: TARGET_ZONE.minY, 
    maxY: TARGET_ZONE.minY + ZONE_HEIGHT * 0.4, 
    weight: 0.15, 
    name: "Bottom-Left Corner" 
  },
  // Góc dưới phải
  { 
    minX: TARGET_ZONE.minX + ZONE_WIDTH * 0.6, 
    maxX: TARGET_ZONE.maxX, 
    minY: TARGET_ZONE.minY, 
    maxY: TARGET_ZONE.minY + ZONE_HEIGHT * 0.4, 
    weight: 0.20, 
    name: "Bottom-Right Corner" 
  },
  // Vùng trung tâm
  { 
    minX: TARGET_ZONE.minX + ZONE_WIDTH * 0.25, 
    maxX: TARGET_ZONE.maxX - ZONE_WIDTH * 0.25, 
    minY: TARGET_ZONE.minY + ZONE_HEIGHT * 0.25, 
    maxY: TARGET_ZONE.maxY - ZONE_HEIGHT * 0.25, 
    weight: 0.20, 
    name: "Center Area" 
  }
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
    sessions.push(`UWB_ZONE_${String(i).padStart(3, '0')}`);
  }
  return sessions;
};

// Generate cart IDs
const generateCartIds = (count) => {
  const carts = [];
  for (let i = 1; i <= count; i++) {
    carts.push(`CART_ZONE_${String(i).padStart(2, '0')}`);
  }
  return carts;
};

// Generate coordinates within target zone with uneven distribution
const generateCoordinates = () => {
  const random = Math.random();
  let cumulativeWeight = 0;
  
  for (let i = 0; i < DISTRIBUTION_ZONES.length; i++) {
    cumulativeWeight += DISTRIBUTION_ZONES[i].weight;
    if (random <= cumulativeWeight) {
      const zone = DISTRIBUTION_ZONES[i];
      
      // Generate random point within zone bounds
      let x = zone.minX + Math.random() * (zone.maxX - zone.minX);
      let y = zone.minY + Math.random() * (zone.maxY - zone.minY);
      
      // Add some clustering effect
      const clusterStrength = 0.4;
      const centerX = (zone.minX + zone.maxX) / 2;
      const centerY = (zone.minY + zone.maxY) / 2;
      
      x = x + (centerX - x) * clusterStrength;
      y = y + (centerY - y) * clusterStrength;
      
      // Ensure coordinates are within target zone bounds
      x = Math.max(TARGET_ZONE.minX, Math.min(TARGET_ZONE.maxX, x));
      y = Math.max(TARGET_ZONE.minY, Math.min(TARGET_ZONE.maxY, y));
      
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
  
  // Fallback to center of target zone
  return {
    x: Math.round(ZONE_CENTER.x),
    y: Math.round(ZONE_CENTER.y),
    zone: 0,
    zoneName: "Center Fallback"
  };
};

// Generate raw distances (simulated UWB anchor distances)
const generateRawDistances = () => {
  const anchorCount = 4 + Math.floor(Math.random() * 3); // 4-6 anchors
  const distances = [];
  
  for (let i = 0; i < anchorCount; i++) {
    // Random distance between 0.5m to 35m (in centimeters)
    const distance = 50 + Math.random() * 3450;
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
    filtered: Math.random() > 0.12, // 88% filtered (good quality), 12% unfiltered
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
const generateZoneUWBLocations = async () => {
  try {
    const { startTime, endTime } = getTimeRange();
    console.log('🎯 Starting Zone UWB location generation...');
    console.log(`📊 Target: ${TOTAL_LOCATIONS} location points`);
    console.log(`🗺️  Map size: ${MAP_CONFIG.maxX} x ${MAP_CONFIG.maxY}`);
    console.log(`📍 Target zone: ${TARGET_ZONE.name}`);
    console.log(`📐 Zone bounds: (${TARGET_ZONE.minX},${TARGET_ZONE.minY}) to (${TARGET_ZONE.maxX},${TARGET_ZONE.maxY})`);
    console.log(`📏 Zone size: ${ZONE_WIDTH} x ${ZONE_HEIGHT} = ${(ZONE_WIDTH * ZONE_HEIGHT).toLocaleString()} square units`);
    console.log(`🎯 Zone center: (${ZONE_CENTER.x}, ${ZONE_CENTER.y})`);
    console.log(`⏰ Time range: ${startTime.toLocaleString('vi-VN')} - ${endTime.toLocaleString('vi-VN')}`);
    console.log('');
    
    console.log('🎯 Distribution zones:');
    DISTRIBUTION_ZONES.forEach((zone, idx) => {
      console.log(`   Zone ${idx + 1}: ${zone.name} - ${(zone.weight * 100).toFixed(0)}%`);
      console.log(`      Bounds: (${zone.minX.toFixed(0)},${zone.minY.toFixed(0)}) to (${zone.maxX.toFixed(0)},${zone.maxY.toFixed(0)})`);
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
    DISTRIBUTION_ZONES.forEach((zone, i) => {
      zoneStats[i + 1] = { 
        count: 0, 
        name: zone.name,
        expectedPercent: (zone.weight * 100).toFixed(1)
      };
    });
    
    for (let i = 0; i < TOTAL_LOCATIONS; i++) {
      try {
        const locationData = generateUWBLocation(sessionIds, cartIds);
        
        // Track which zone this point belongs to
        if (locationData._debug_zone && locationData._debug_zone > 0) {
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
          await new Promise(resolve => setTimeout(resolve, 30));
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error posting location ${i + 1}:`, error.message);
      }
    }
    
    // Final statistics
    console.log('\n📊 Zone Generation completed!');
    console.log('═══════════════════════════════════════════');
    console.log(`✅ Successful: ${successCount}/${TOTAL_LOCATIONS}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`🔍 Filtered: ${filteredCount} (${(filteredCount/successCount*100).toFixed(1)}%)`);
    console.log(`📡 Tracking mode: ${trackingCount} (${(trackingCount/successCount*100).toFixed(1)}%)`);
    console.log('');
    
    console.log('🎯 Zone distribution:');
    Object.values(zoneStats).forEach(zone => {
      const actualPercent = (zone.count / successCount * 100).toFixed(1);
      console.log(`   ${zone.name}: ${zone.count} points (${actualPercent}%, expected ${zone.expectedPercent}%)`);
    });
    
    console.log('\n🎉 Zone UWB location generation completed successfully!');
    console.log(`📍 Zone covered: X: ${TARGET_ZONE.minX}-${TARGET_ZONE.maxX}, Y: ${TARGET_ZONE.minY}-${TARGET_ZONE.maxY}`);
    console.log(`📏 Total area: ${ZONE_WIDTH} x ${ZONE_HEIGHT} = ${(ZONE_WIDTH * ZONE_HEIGHT).toLocaleString()} square units`);
    
  } catch (error) {
    console.error('💥 Generation failed:', error.message);
  }
};

// Run the script
if (require.main === module) {
  generateZoneUWBLocations();
}

module.exports = { generateZoneUWBLocations };
