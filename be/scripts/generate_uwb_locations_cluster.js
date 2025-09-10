// scripts/generate_uwb_locations_cluster.js
const axios = require('axios');

// Configuration
const API_BASE = 'http://localhost:5001';
const LOGIN_ENDPOINT = '/api/auth/login';
const UWB_LOCATION_ENDPOINT = '/api/motion/uwb-location';

// Generate data configuration
const TOTAL_LOCATIONS = 1000;
const SESSION_COUNT = 20; // Number of different sessions
const CART_COUNT = 10; // Number of different carts

// Map boundaries (as specified)
const MAP_CONFIG = {
  maxX: 3320,
  maxY: 6900,
  minX: 0,
  minY: 0
};

// 4 cluster centers as requested
const CLUSTER_CENTERS = [
  { centerX: 2300, centerY: 3333, weight: 0.35, radius: 200 }, // Main area - 35%
  { centerX: 2333, centerY: 2222, weight: 0.25, radius: 180 }, // Secondary area - 25%
  { centerX: 2300, centerY: 1222, weight: 0.25, radius: 180 }, // Third area - 25%
  { centerX: 652, centerY: 2455, weight: 0.15, radius: 150 }   // Corner area - 15%
];

// Time ranges (Vietnam time - will convert to UTC)
const TIME_RANGES = [
  { start: 8, end: 10, weight: 0.2 },   // 08:00-10:00 - Morning rush - 20%
  { start: 10, end: 12, weight: 0.15 }, // 10:00-12:00 - Mid morning - 15%
  { start: 12, end: 14, weight: 0.25 }, // 12:00-14:00 - Lunch peak - 25%
  { start: 14, end: 17, weight: 0.15 }, // 14:00-17:00 - Afternoon - 15%
  { start: 17, end: 20, weight: 0.2 },  // 17:00-20:00 - Evening rush - 20%
  { start: 20, end: 22, weight: 0.05 }  // 20:00-22:00 - Late evening - 5%
];

// Generate session IDs
const generateSessionIds = (count) => {
  const sessions = [];
  for (let i = 1; i <= count; i++) {
    sessions.push(`cluster_session_${String(i).padStart(3, '0')}`);
  }
  return sessions;
};

// Generate cart IDs
const generateCartIds = (count) => {
  const carts = [];
  for (let i = 1; i <= count; i++) {
    carts.push(`cluster_cart_${String(i).padStart(2, '0')}`);
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

// Generate coordinates based on cluster centers
const generateCoordinates = () => {
  const rand = Math.random();
  let cumulativeWeight = 0;
  
  // Choose cluster based on weight
  for (const cluster of CLUSTER_CENTERS) {
    cumulativeWeight += cluster.weight;
    if (rand <= cumulativeWeight) {
      // Generate coordinates within this cluster
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * cluster.radius;
      
      let x = cluster.centerX + Math.cos(angle) * distance;
      let y = cluster.centerY + Math.sin(angle) * distance;
      
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
    filtered: Math.random() > 0.1, // 90% filtered (good quality), 10% unfiltered
    tracking_mode: Math.random() > 0.15 // 85% in tracking mode, 15% not
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
const generateClusteredUWBLocations = async () => {
  try {
    console.log('🎯 Starting clustered UWB location generation...');
    console.log(`📊 Target: ${TOTAL_LOCATIONS} location points`);
    console.log(`🗺️  Map size: ${MAP_CONFIG.maxX} x ${MAP_CONFIG.maxY}`);
    console.log('📍 Cluster centers:');
    CLUSTER_CENTERS.forEach((cluster, i) => {
      console.log(`   ${i + 1}. (${cluster.centerX}, ${cluster.centerY}) - ${(cluster.weight * 100).toFixed(1)}% - radius: ${cluster.radius}px`);
    });
    
    // Login
    const token = await login();
    
    // Generate IDs
    const sessionIds = generateSessionIds(SESSION_COUNT);
    const cartIds = generateCartIds(CART_COUNT);
    
    console.log(`📝 Sessions: ${sessionIds.slice(0, 5).join(', ')}... (${SESSION_COUNT} total)`);
    console.log(`🛒 Carts: ${cartIds.join(', ')}`);
    console.log('⏰ Time distribution across 6 periods for realistic patterns');
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
        if (i % 20 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error posting location ${i + 1}:`, error.message);
      }
    }
    
    console.log('');
    console.log('✅ Clustered UWB location generation completed!');
    console.log(`📊 Results:`);
    console.log(`   • Total locations: ${TOTAL_LOCATIONS}`);
    console.log(`   • Successful: ${successCount}`);
    console.log(`   • Errors: ${errorCount}`);
    console.log(`   • Filtered (good quality): ${filteredCount}`);
    console.log(`   • In tracking mode: ${trackingCount}`);
    console.log(`   • Sessions used: ${SESSION_COUNT}`);
    console.log(`   • Carts used: ${CART_COUNT}`);
    console.log('');
    console.log('📍 Cluster distribution:');
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
  generateClusteredUWBLocations();
}

module.exports = { generateClusteredUWBLocations };
