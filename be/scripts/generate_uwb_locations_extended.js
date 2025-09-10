// scripts/generate_uwb_locations_extended.js
const axios = require('axios');

// Configuration
const API_BASE = 'http://localhost:5001';
const LOGIN_ENDPOINT = '/api/auth/login';
const UWB_LOCATION_ENDPOINT = '/api/motion/uwb-location';

// Generate data configuration
const TOTAL_LOCATIONS = 2000;
const SESSION_COUNT = 30; // More sessions for wider distribution
const CART_COUNT = 15; // More carts

// Map boundaries (as specified)
const MAP_CONFIG = {
  maxX: 3320,
  maxY: 6900,
  minX: 0,
  minY: 0
};

// Extended cluster centers with wider radius for broader distribution
const CLUSTER_CENTERS = [
  { centerX: 2550, centerY: 2950, weight: 0.30, radius: 350 }, // Main shopping area - 30%
  { centerX: 2500, centerY: 3984, weight: 0.25, radius: 320 }, // Electronics/tech zone - 25%
  { centerX: 3333, centerY: 1650, weight: 0.20, radius: 280 }, // Fashion district - 20%
  // Additional scattered areas for more realistic distribution
  { centerX: 1200, centerY: 4500, radius: 250, weight: 0.10 }, // Food court area - 10%
  { centerX: 800, centerY: 2200, radius: 200, weight: 0.08 },  // Services area - 8%
  { centerX: 2800, centerY: 5500, radius: 180, weight: 0.07 }  // Exit/entrance - 7%
];

// Wider time distribution for more realistic patterns
const TIME_RANGES = [
  { start: 8, end: 9.5, weight: 0.12 },   // 08:00-09:30 - Early shoppers - 12%
  { start: 9.5, end: 11.5, weight: 0.18 }, // 09:30-11:30 - Morning peak - 18%
  { start: 11.5, end: 13, weight: 0.15 }, // 11:30-13:00 - Pre-lunch - 15%
  { start: 13, end: 15, weight: 0.20 },   // 13:00-15:00 - Lunch peak - 20%
  { start: 15, end: 17, weight: 0.15 },   // 15:00-17:00 - Afternoon - 15%
  { start: 17, end: 19, weight: 0.15 },   // 17:00-19:00 - Evening rush - 15%
  { start: 19, end: 21, weight: 0.05 }    // 19:00-21:00 - Late evening - 5%
];

// Generate session IDs
const generateSessionIds = (count) => {
  const sessions = [];
  for (let i = 1; i <= count; i++) {
    sessions.push(`extended_session_${String(i).padStart(3, '0')}`);
  }
  return sessions;
};

// Generate cart IDs
const generateCartIds = (count) => {
  const carts = [];
  for (let i = 1; i <= count; i++) {
    carts.push(`extended_cart_${String(i).padStart(2, '0')}`);
  }
  return carts;
};

// Generate random timestamp based on time weight distribution
const generateTimestamp = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Choose time range based on weight
  const rand = Math.random();
  let cumulativeWeight = 0;
  let selectedRange = TIME_RANGES[0]; // fallback
  
  for (const timeRange of TIME_RANGES) {
    cumulativeWeight += timeRange.weight;
    if (rand <= cumulativeWeight) {
      selectedRange = timeRange;
      break;
    }
  }
  
  // Generate random time within selected range
  const startMinutes = selectedRange.start * 60;
  const endMinutes = selectedRange.end * 60;
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

// Generate coordinates with wider distribution around cluster centers
const generateCoordinates = () => {
  const rand = Math.random();
  let cumulativeWeight = 0;
  
  // Choose cluster based on weight
  for (const cluster of CLUSTER_CENTERS) {
    cumulativeWeight += cluster.weight;
    if (rand <= cumulativeWeight) {
      // Generate coordinates within this cluster with wider spread
      const angle = Math.random() * 2 * Math.PI;
      
      // Use variable distance for more natural distribution
      // 70% within close radius, 30% in wider area
      let distance;
      if (Math.random() < 0.7) {
        distance = Math.random() * cluster.radius * 0.6; // Close to center
      } else {
        distance = cluster.radius * 0.6 + Math.random() * cluster.radius * 0.4; // Wider spread
      }
      
      let x = cluster.centerX + Math.cos(angle) * distance;
      let y = cluster.centerY + Math.sin(angle) * distance;
      
      // Add some random noise for more natural positioning
      x += (Math.random() - 0.5) * 50;
      y += (Math.random() - 0.5) * 50;
      
      // Ensure coordinates are within map bounds
      x = Math.max(MAP_CONFIG.minX, Math.min(MAP_CONFIG.maxX, x));
      y = Math.max(MAP_CONFIG.minY, Math.min(MAP_CONFIG.maxY, y));
      
      return { 
        x: Math.round(x), 
        y: Math.round(y),
        cluster: cluster
      };
    }
  }
  
  // Fallback: use first cluster
  const cluster = CLUSTER_CENTERS[0];
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * cluster.radius;
  
  let x = cluster.centerX + Math.cos(angle) * distance;
  let y = cluster.centerY + Math.sin(angle) * distance;
  
  x = Math.max(MAP_CONFIG.minX, Math.min(MAP_CONFIG.maxX, x));
  y = Math.max(MAP_CONFIG.minY, Math.min(MAP_CONFIG.maxY, y));
  
  return { 
    x: Math.round(x), 
    y: Math.round(y),
    cluster: cluster
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
    timestamp: generateTimestamp(),
    session_id: sessionIds[Math.floor(Math.random() * sessionIds.length)],
    cart_id: cartIds[Math.floor(Math.random() * cartIds.length)],
    raw_distances: generateRawDistances(),
    filtered: Math.random() > 0.08, // 92% filtered (very good quality), 8% unfiltered
    tracking_mode: Math.random() > 0.12 // 88% in tracking mode, 12% not
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
    const response = await axios.post(`${API_BASE}${UWB_LOCATION_ENDPOINT}`, locationData, {
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
const generateExtendedUWBLocations = async () => {
  try {
    console.log('🎯 Starting extended UWB location generation...');
    console.log(`📊 Target: ${TOTAL_LOCATIONS} location points`);
    console.log(`🗺️  Map size: ${MAP_CONFIG.maxX} x ${MAP_CONFIG.maxY}`);
    console.log('📍 Extended cluster centers:');
    CLUSTER_CENTERS.forEach((cluster, i) => {
      console.log(`   ${i + 1}. (${cluster.centerX}, ${cluster.centerY}) - ${(cluster.weight * 100).toFixed(1)}% - radius: ${cluster.radius}px`);
    });
    
    // Login
    const token = await login();
    
    // Generate IDs
    const sessionIds = generateSessionIds(SESSION_COUNT);
    const cartIds = generateCartIds(CART_COUNT);
    
    console.log(`📝 Sessions: ${sessionIds.slice(0, 5).join(', ')}... (${SESSION_COUNT} total)`);
    console.log(`🛒 Carts: ${cartIds.slice(0, 8).join(', ')}... (${CART_COUNT} total)`);
    console.log('⏰ Extended time distribution (7 periods) for wider coverage');
    console.log('🎪 Wider radius distribution with natural noise patterns');
    console.log('');
    
    // Generate and post locations
    let successCount = 0;
    let errorCount = 0;
    let filteredCount = 0;
    let trackingCount = 0;
    const clusterStats = {};
    
    // Initialize cluster stats
    CLUSTER_CENTERS.forEach((cluster, i) => {
      clusterStats[i] = { count: 0, center: `(${cluster.centerX}, ${cluster.centerY})` };
    });
    
    for (let i = 0; i < TOTAL_LOCATIONS; i++) {
      try {
        const locationData = generateUWBLocation(sessionIds, cartIds);
        
        // Track which cluster this point belongs to
        const coords = { x: locationData.x, y: locationData.y };
        let closestCluster = 0;
        let minDistance = Number.MAX_VALUE;
        
        CLUSTER_CENTERS.forEach((cluster, idx) => {
          const distance = Math.sqrt(
            Math.pow(coords.x - cluster.centerX, 2) + 
            Math.pow(coords.y - cluster.centerY, 2)
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestCluster = idx;
          }
        });
        
        clusterStats[closestCluster].count++;
        
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
          await new Promise(resolve => setTimeout(resolve, 40));
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error posting location ${i + 1}:`, error.message);
      }
    }
    
    console.log('');
    console.log('✅ Extended UWB location generation completed!');
    console.log(`📊 Results:`);
    console.log(`   • Total locations: ${TOTAL_LOCATIONS}`);
    console.log(`   • Successful: ${successCount}`);
    console.log(`   • Errors: ${errorCount}`);
    console.log(`   • Filtered (good quality): ${filteredCount}`);
    console.log(`   • In tracking mode: ${trackingCount}`);
    console.log(`   • Sessions used: ${SESSION_COUNT}`);
    console.log(`   • Carts used: ${CART_COUNT}`);
    console.log('');
    console.log('📍 Extended cluster distribution:');
    Object.keys(clusterStats).forEach(clusterIdx => {
      const stats = clusterStats[clusterIdx];
      const percentage = ((stats.count / successCount) * 100).toFixed(1);
      console.log(`   Cluster ${parseInt(clusterIdx) + 1} ${stats.center}: ${stats.count} points (${percentage}%)`);
    });
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  generateExtendedUWBLocations();
}

module.exports = { generateExtendedUWBLocations };
