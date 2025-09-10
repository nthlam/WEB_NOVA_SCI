// scripts/generate_uwb_locations_zone_1100_1300.js
const axios = require('axios');

// Configuration
const API_BASE = 'http://localhost:5001';
const LOGIN_ENDPOINT = '/api/auth/login';
const UWB_LOCATION_ENDPOINT = '/api/motion/uwb-location';

// Generate data configuration
const TOTAL_LOCATIONS = 800;

// Map boundaries (existing map size)
const MAP_CONFIG = {
  maxX: 3320,
  maxY: 6900,
  minX: 0,
  minY: 0
};

// Target zone bounds
const TARGET_ZONE = {
  minX: 1100,
  maxX: 1300,
  minY: 3700,
  maxY: 4200,
  name: "Zone 1100-1300 x 3700-4200"
};

// Calculate zone properties
const ZONE_WIDTH = TARGET_ZONE.maxX - TARGET_ZONE.minX; // 200
const ZONE_HEIGHT = TARGET_ZONE.maxY - TARGET_ZONE.minY; // 500
const ZONE_CENTER = {
  x: (TARGET_ZONE.minX + TARGET_ZONE.maxX) / 2, // 1200
  y: (TARGET_ZONE.minY + TARGET_ZONE.maxY) / 2  // 3950
};

// Reuse session IDs from previous generations (mix from all previous)
const EXISTING_SESSION_IDS = [
  // From rectangle generation
  'UWB_RECT_001', 'UWB_RECT_002', 'UWB_RECT_003', 'UWB_RECT_004', 'UWB_RECT_005',
  'UWB_RECT_006', 'UWB_RECT_007', 'UWB_RECT_008', 'UWB_RECT_009', 'UWB_RECT_010',
  'UWB_RECT_011', 'UWB_RECT_012', 'UWB_RECT_013', 'UWB_RECT_014', 'UWB_RECT_015',
  
  // From zone 600-900 generation
  'UWB_ZONE_001', 'UWB_ZONE_002', 'UWB_ZONE_003', 'UWB_ZONE_004', 'UWB_ZONE_005',
  'UWB_ZONE_006', 'UWB_ZONE_007', 'UWB_ZONE_008', 'UWB_ZONE_009', 'UWB_ZONE_010',
  'UWB_ZONE_011', 'UWB_ZONE_012',
  
  // From mid-zone generation
  'UWB_MID_001', 'UWB_MID_002', 'UWB_MID_003', 'UWB_MID_004', 'UWB_MID_005',
  'UWB_MID_006', 'UWB_MID_007', 'UWB_MID_008', 'UWB_MID_009', 'UWB_MID_010',
  'UWB_MID_011', 'UWB_MID_012', 'UWB_MID_013', 'UWB_MID_014', 'UWB_MID_015',
  'UWB_MID_016', 'UWB_MID_017', 'UWB_MID_018'
];

// Reuse cart IDs from previous generations (mix from all previous)
const EXISTING_CART_IDS = [
  // From rectangle generation
  'CART_RECT_01', 'CART_RECT_02', 'CART_RECT_03', 'CART_RECT_04', 
  'CART_RECT_05', 'CART_RECT_06', 'CART_RECT_07', 'CART_RECT_08',
  
  // From zone 600-900 generation
  'CART_ZONE_01', 'CART_ZONE_02', 'CART_ZONE_03', 'CART_ZONE_04', 
  'CART_ZONE_05', 'CART_ZONE_06',
  
  // From mid-zone generation
  'CART_MID_01', 'CART_MID_02', 'CART_MID_03', 'CART_MID_04',
  'CART_MID_05', 'CART_MID_06', 'CART_MID_07', 'CART_MID_08'
];

// Định nghĩa các vùng phân bố không đều trong zone nhỏ hẹp
const DISTRIBUTION_ZONES = [
  // Phần trên (khu vực có traffic cao)
  { 
    minX: TARGET_ZONE.minX, 
    maxX: TARGET_ZONE.maxX, 
    minY: TARGET_ZONE.minY + ZONE_HEIGHT * 0.7, 
    maxY: TARGET_ZONE.maxY, 
    weight: 0.35, 
    name: "Top Corridor (High Traffic)" 
  },
  // Phần giữa trên
  { 
    minX: TARGET_ZONE.minX, 
    maxX: TARGET_ZONE.maxX, 
    minY: TARGET_ZONE.minY + ZONE_HEIGHT * 0.4, 
    maxY: TARGET_ZONE.minY + ZONE_HEIGHT * 0.7, 
    weight: 0.30, 
    name: "Upper Middle Section" 
  },
  // Phần giữa dưới
  { 
    minX: TARGET_ZONE.minX, 
    maxX: TARGET_ZONE.maxX, 
    minY: TARGET_ZONE.minY + ZONE_HEIGHT * 0.2, 
    maxY: TARGET_ZONE.minY + ZONE_HEIGHT * 0.4, 
    weight: 0.20, 
    name: "Lower Middle Section" 
  },
  // Phần dưới (khu vực traffic thấp)
  { 
    minX: TARGET_ZONE.minX, 
    maxX: TARGET_ZONE.maxX, 
    minY: TARGET_ZONE.minY, 
    maxY: TARGET_ZONE.minY + ZONE_HEIGHT * 0.2, 
    weight: 0.15, 
    name: "Bottom Section (Low Traffic)" 
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
    { start: 0.0, end: 0.25, weight: 0.14 }, // 8:00-9:00 (14%)
    { start: 0.25, end: 0.5, weight: 0.36 }, // 9:00-10:00 (36%)
    { start: 0.5, end: 0.75, weight: 0.36 }, // 10:00-11:00 (36%)
    { start: 0.75, end: 1.0, weight: 0.14 }  // 11:00-12:00 (14%)
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
      
      // Add clustering effect based on zone type (higher clustering for narrow corridor)
      let clusterStrength = 0.30;
      if (zone.name.includes("High Traffic")) {
        clusterStrength = 0.50; // Strong clustering for high traffic
      } else if (zone.name.includes("Low Traffic")) {
        clusterStrength = 0.20; // Weaker clustering for low traffic
      }
      
      const centerX = (zone.minX + zone.maxX) / 2;
      const centerY = (zone.minY + zone.maxY) / 2;
      
      x = x + (centerX - x) * clusterStrength;
      y = y + (centerY - y) * clusterStrength;
      
      // Add some random noise for natural distribution (smaller noise for narrow corridor)
      const noiseX = (Math.random() - 0.5) * 30; // ±15 units (smaller for narrow zone)
      const noiseY = (Math.random() - 0.5) * 40; // ±20 units
      x += noiseX;
      y += noiseY;
      
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
    // Random distance between 0.3m to 35m (in centimeters)
    const distance = 30 + Math.random() * 3470;
    distances.push(Math.round(distance));
  }
  
  return distances;
};

// Generate UWB location entry
const generateUWBLocation = () => {
  const coords = generateCoordinates();
  
  return {
    x: coords.x,
    y: coords.y,
    timestamp: generateTimestamp(),
    session_id: EXISTING_SESSION_IDS[Math.floor(Math.random() * EXISTING_SESSION_IDS.length)],
    cart_id: EXISTING_CART_IDS[Math.floor(Math.random() * EXISTING_CART_IDS.length)],
    raw_distances: generateRawDistances(),
    filtered: Math.random() > 0.10, // 90% filtered (excellent quality), 10% unfiltered
    tracking_mode: Math.random() > 0.17, // 83% in tracking mode, 17% not
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
const generateCorridorUWBLocations = async () => {
  try {
    const { startTime, endTime } = getTimeRange();
    console.log('🎯 Starting Corridor UWB location generation...');
    console.log(`📊 Target: ${TOTAL_LOCATIONS} location points`);
    console.log(`🗺️  Map size: ${MAP_CONFIG.maxX} x ${MAP_CONFIG.maxY}`);
    console.log(`📍 Target zone: ${TARGET_ZONE.name}`);
    console.log(`📐 Zone bounds: (${TARGET_ZONE.minX},${TARGET_ZONE.minY}) to (${TARGET_ZONE.maxX},${TARGET_ZONE.maxY})`);
    console.log(`📏 Zone size: ${ZONE_WIDTH} x ${ZONE_HEIGHT} = ${(ZONE_WIDTH * ZONE_HEIGHT).toLocaleString()} square units`);
    console.log(`🎯 Zone center: (${ZONE_CENTER.x}, ${ZONE_CENTER.y})`);
    console.log(`📏 Corridor characteristics: Narrow vertical corridor (${ZONE_WIDTH} units wide)`);
    console.log(`⏰ Time range: ${startTime.toLocaleString('vi-VN')} - ${endTime.toLocaleString('vi-VN')}`);
    console.log('');
    
    console.log('🔄 Reusing existing IDs:');
    console.log(`📝 Sessions: ${EXISTING_SESSION_IDS.length} existing sessions from previous generations`);
    console.log(`   Sample: ${EXISTING_SESSION_IDS.slice(0, 5).join(', ')}...`);
    console.log(`🛒 Carts: ${EXISTING_CART_IDS.length} existing carts from previous generations`);
    console.log(`   Sample: ${EXISTING_CART_IDS.slice(0, 8).join(', ')}`);
    console.log('');
    
    console.log('🎯 Distribution zones (vertical corridor):');
    DISTRIBUTION_ZONES.forEach((zone, idx) => {
      console.log(`   Zone ${idx + 1}: ${zone.name} - ${(zone.weight * 100).toFixed(0)}%`);
      console.log(`      Y-range: ${zone.minY.toFixed(0)} to ${zone.maxY.toFixed(0)} (height: ${(zone.maxY - zone.minY).toFixed(0)})`);
    });
    console.log('');
    
    // Login
    const token = await login();
    
    // Generate and post locations
    let successCount = 0;
    let errorCount = 0;
    let filteredCount = 0;
    let trackingCount = 0;
    const zoneStats = {};
    const sessionUsage = {};
    const cartUsage = {};
    
    // Initialize zone stats
    DISTRIBUTION_ZONES.forEach((zone, i) => {
      zoneStats[i + 1] = { 
        count: 0, 
        name: zone.name,
        expectedPercent: (zone.weight * 100).toFixed(1)
      };
    });
    
    // Initialize session and cart usage tracking
    EXISTING_SESSION_IDS.forEach(id => sessionUsage[id] = 0);
    EXISTING_CART_IDS.forEach(id => cartUsage[id] = 0);
    
    for (let i = 0; i < TOTAL_LOCATIONS; i++) {
      try {
        const locationData = generateUWBLocation();
        
        // Track which zone this point belongs to
        if (locationData._debug_zone && locationData._debug_zone > 0) {
          zoneStats[locationData._debug_zone].count++;
        }
        
        // Track session and cart usage
        sessionUsage[locationData.session_id]++;
        cartUsage[locationData.cart_id]++;
        
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
          await new Promise(resolve => setTimeout(resolve, 25));
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error posting location ${i + 1}:`, error.message);
      }
    }
    
    // Final statistics
    console.log('\n📊 Corridor Generation completed!');
    console.log('═══════════════════════════════════════════');
    console.log(`✅ Successful: ${successCount}/${TOTAL_LOCATIONS}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`🔍 Filtered: ${filteredCount} (${(filteredCount/successCount*100).toFixed(1)}%)`);
    console.log(`📡 Tracking mode: ${trackingCount} (${(trackingCount/successCount*100).toFixed(1)}%)`);
    console.log('');
    
    console.log('🎯 Zone distribution (vertical layers):');
    Object.values(zoneStats).forEach(zone => {
      const actualPercent = (zone.count / successCount * 100).toFixed(1);
      console.log(`   ${zone.name}: ${zone.count} points (${actualPercent}%, expected ${zone.expectedPercent}%)`);
    });
    
    console.log('\n🔄 ID Reuse Summary:');
    console.log(`📝 Session distribution: ${Object.keys(sessionUsage).length} sessions used`);
    const topSessions = Object.entries(sessionUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    topSessions.forEach(([session, count]) => {
      console.log(`   ${session}: ${count} records`);
    });
    
    console.log(`🛒 Cart distribution: ${Object.keys(cartUsage).length} carts used`);
    const topCarts = Object.entries(cartUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    topCarts.forEach(([cart, count]) => {
      console.log(`   ${cart}: ${count} records`);
    });
    
    console.log('\n🎉 Corridor UWB location generation completed successfully!');
    console.log(`📍 Zone covered: X: ${TARGET_ZONE.minX}-${TARGET_ZONE.maxX}, Y: ${TARGET_ZONE.minY}-${TARGET_ZONE.maxY}`);
    console.log(`📏 Corridor dimensions: ${ZONE_WIDTH} x ${ZONE_HEIGHT} = ${(ZONE_WIDTH * ZONE_HEIGHT).toLocaleString()} square units`);
    console.log(`🔢 Generated ${TOTAL_LOCATIONS} records using existing session/cart IDs`);
    console.log(`📊 Grand total UWB locations in database: ~7300 records across multiple zones`);
    
  } catch (error) {
    console.error('💥 Generation failed:', error.message);
  }
};

// Run the script
if (require.main === module) {
  generateCorridorUWBLocations();
}

module.exports = { generateCorridorUWBLocations };
