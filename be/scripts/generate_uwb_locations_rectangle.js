// scripts/generate_uwb_locations_rectangle.js
const axios = require('axios');

// Configuration
const API_BASE = 'http://localhost:5001';
const LOGIN_ENDPOINT = '/api/auth/login';
const UWB_LOCATION_ENDPOINT = '/api/motion/uwb-location';

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

// 3 điểm đã cho để tạo hình chữ nhật
const GIVEN_POINTS = [
  { x: 2300, y: 3333, name: "Point A" },
  { x: 2333, y: 2222, name: "Point B" }, 
  { x: 2300, y: 1222, name: "Point C" }
];

// Tính điểm thứ 4 để tạo hình chữ nhật
// Dựa trên 3 điểm, tạo hình chữ nhật với các cạnh song song với trục tọa độ
const calculateRectangleBounds = () => {
  const allX = GIVEN_POINTS.map(p => p.x);
  const allY = GIVEN_POINTS.map(p => p.y);
  
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  
  return {
    minX, maxX, minY, maxY,
    width: maxX - minX,
    height: maxY - minY,
    center: {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2
    }
  };
};

const RECTANGLE = calculateRectangleBounds();

// Định nghĩa các vùng phân bố không đều trong hình chữ nhật
const DISTRIBUTION_ZONES = [
  // Góc trên trái (gần point A)
  { 
    minX: RECTANGLE.minX, 
    maxX: RECTANGLE.center.x, 
    minY: RECTANGLE.center.y, 
    maxY: RECTANGLE.maxY, 
    weight: 0.25, 
    name: "Top-Left (near Point A)" 
  },
  // Góc giữa phải (gần point B)
  { 
    minX: RECTANGLE.center.x, 
    maxX: RECTANGLE.maxX, 
    minY: RECTANGLE.center.y - (RECTANGLE.height * 0.25), 
    maxY: RECTANGLE.center.y + (RECTANGLE.height * 0.25), 
    weight: 0.30, 
    name: "Center-Right (near Point B)" 
  },
  // Góc dưới trái (gần point C)
  { 
    minX: RECTANGLE.minX, 
    maxX: RECTANGLE.center.x, 
    minY: RECTANGLE.minY, 
    maxY: RECTANGLE.center.y, 
    weight: 0.25, 
    name: "Bottom-Left (near Point C)" 
  },
  // Vùng trung tâm
  { 
    minX: RECTANGLE.center.x - (RECTANGLE.width * 0.15), 
    maxX: RECTANGLE.center.x + (RECTANGLE.width * 0.15), 
    minY: RECTANGLE.center.y - (RECTANGLE.height * 0.15), 
    maxY: RECTANGLE.center.y + (RECTANGLE.height * 0.15), 
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
    sessions.push(`UWB_RECT_${String(i).padStart(3, '0')}`);
  }
  return sessions;
};

// Generate cart IDs
const generateCartIds = (count) => {
  const carts = [];
  for (let i = 1; i <= count; i++) {
    carts.push(`CART_RECT_${String(i).padStart(2, '0')}`);
  }
  return carts;
};

// Generate coordinates within rectangle with uneven distribution
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
      const clusterStrength = 0.3;
      const centerX = (zone.minX + zone.maxX) / 2;
      const centerY = (zone.minY + zone.maxY) / 2;
      
      x = x + (centerX - x) * clusterStrength;
      y = y + (centerY - y) * clusterStrength;
      
      // Ensure coordinates are within map bounds and rectangle
      x = Math.max(RECTANGLE.minX, Math.min(RECTANGLE.maxX, x));
      y = Math.max(RECTANGLE.minY, Math.min(RECTANGLE.maxY, y));
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
  
  // Fallback to center of rectangle
  return {
    x: Math.round(RECTANGLE.center.x),
    y: Math.round(RECTANGLE.center.y),
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
    filtered: Math.random() > 0.10, // 90% filtered (excellent quality), 10% unfiltered
    tracking_mode: Math.random() > 0.15, // 85% in tracking mode, 15% not
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
const generateRectangleUWBLocations = async () => {
  try {
    const { startTime, endTime } = getTimeRange();
    console.log('📐 Starting Rectangle UWB location generation...');
    console.log(`📊 Target: ${TOTAL_LOCATIONS} location points`);
    console.log(`🗺️  Map size: ${MAP_CONFIG.maxX} x ${MAP_CONFIG.maxY}`);
    console.log(`⏰ Time range: ${startTime.toLocaleString('vi-VN')} - ${endTime.toLocaleString('vi-VN')}`);
    console.log('');
    
    // Display rectangle information
    console.log('📐 Rectangle bounds:');
    console.log(`   Top-Left: (${RECTANGLE.minX}, ${RECTANGLE.maxY})`);
    console.log(`   Top-Right: (${RECTANGLE.maxX}, ${RECTANGLE.maxY})`);
    console.log(`   Bottom-Left: (${RECTANGLE.minX}, ${RECTANGLE.minY})`);
    console.log(`   Bottom-Right: (${RECTANGLE.maxX}, ${RECTANGLE.minY})`);
    console.log(`   Center: (${Math.round(RECTANGLE.center.x)}, ${Math.round(RECTANGLE.center.y)})`);
    console.log(`   Size: ${RECTANGLE.width} x ${RECTANGLE.height}`);
    console.log('');
    
    console.log('📍 Given points:');
    GIVEN_POINTS.forEach(point => {
      console.log(`   ${point.name}: (${point.x}, ${point.y})`);
    });
    console.log('');
    
    console.log('🎯 Distribution zones:');
    DISTRIBUTION_ZONES.forEach((zone, idx) => {
      console.log(`   Zone ${idx + 1}: ${zone.name} - ${(zone.weight * 100).toFixed(0)}%`);
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
        if (i % 30 === 0) {
          await new Promise(resolve => setTimeout(resolve, 40));
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error posting location ${i + 1}:`, error.message);
      }
    }
    
    // Final statistics
    console.log('\n📊 Rectangle Generation completed!');
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
    
    console.log('\n🎉 Rectangle UWB location generation completed successfully!');
    console.log('📐 Rectangle formed by given points:');
    console.log(`   Area covered: ${RECTANGLE.width} x ${RECTANGLE.height} = ${(RECTANGLE.width * RECTANGLE.height).toLocaleString()} square units`);
    
  } catch (error) {
    console.error('💥 Generation failed:', error.message);
  }
};

// Run the script
if (require.main === module) {
  generateRectangleUWBLocations();
}

module.exports = { generateRectangleUWBLocations };
