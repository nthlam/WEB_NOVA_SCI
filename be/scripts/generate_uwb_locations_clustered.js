// scripts/generate_uwb_locations_clustered.js
const axios = require('axios');

// Configuration
const API_BASE = 'http://localhost:5001';
const LOGIN_ENDPOINT = '/api/auth/login';
const UWB_LOG_ENDPOINT = '/api/motion/uwb-log';

// Generate data configuration
const TOTAL_LOCATIONS = 500;
const SESSION_COUNT = 12; // Number of different sessions
const CART_COUNT = 6; // Number of different carts

// Map boundaries (existing map size)
const MAP_CONFIG = {
  maxX: 3320,
  maxY: 6900,
  minX: 0,
  minY: 0
};

// Time ranges (in hours, 24-hour format) - Extended hours for better distribution
const TIME_RANGES = [
  { start: 8.5, end: 11.5, weight: 0.25 }, // Morning 08:30 - 11:30
  { start: 13.0, end: 16.0, weight: 0.20 }, // Afternoon 13:00 - 16:00
  { start: 17.0, end: 20.5, weight: 0.35 }, // Evening 17:00 - 20:30
  { start: 11.5, end: 13.0, weight: 0.10 }, // Lunch 11:30 - 13:00
  { start: 20.5, end: 22.0, weight: 0.10 }  // Late evening 20:30 - 22:00
];

// Cluster areas based on your specified coordinates with wider distribution
const CLUSTER_AREAS = [
  { 
    centerX: 2550, 
    centerY: 2950, 
    radius: 450,      // Increased radius for wider distribution
    weight: 0.25,     // 25% of points
    name: "Zone A - Central Hub"
  },
  { 
    centerX: 3333, 
    centerY: 1650, 
    radius: 400,      // Increased radius
    weight: 0.20,     // 20% of points
    name: "Zone B - North Section"
  },
  { 
    centerX: 2600, 
    centerY: 3984, 
    radius: 380,      // Increased radius
    weight: 0.18,     // 18% of points
    name: "Zone C - South Central"
  },
  { 
    centerX: 2500, 
    centerY: 3987, 
    radius: 350,      // Increased radius
    weight: 0.17,     // 17% of points
    name: "Zone D - South West"
  },
  { 
    centerX: 2760, 
    centerY: 3989, 
    radius: 370,      // Increased radius
    weight: 0.15,     // 15% of points
    name: "Zone E - South East"
  },
  // Additional scattered points across the map
  {
    centerX: 1600,
    centerY: 5000,
    radius: 200,
    weight: 0.05,     // 5% scattered points
    name: "Scattered Points"
  }
];

// Generate session IDs for UWB
const generateUWBSessionIds = (count) => {
  const sessions = [];
  for (let i = 1; i <= count; i++) {
    sessions.push(`uwb_cluster_session_${String(i).padStart(3, '0')}`);
  }
  return sessions;
};

// Generate cart IDs for UWB
const generateUWBCartIds = (count) => {
  const carts = [];
  for (let i = 1; i <= count; i++) {
    carts.push(`uwb_cluster_cart_${String(i).padStart(2, '0')}`);
  }
  return carts;
};

// Generate random timestamp with better time distribution
const generateClusteredTimestamp = () => {
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

// Generate coordinates based on cluster areas with wider distribution
const generateClusteredCoordinates = () => {
  const rand = Math.random();
  let cumulativeWeight = 0;
  
  // Choose cluster based on weight
  for (const cluster of CLUSTER_AREAS) {
    cumulativeWeight += cluster.weight;
    if (rand <= cumulativeWeight) {
      // Generate coordinates within this cluster with wider distribution
      const angle = Math.random() * 2 * Math.PI;
      
      // Use a distribution that favors points further from center for wider spread
      const distanceRand = Math.random();
      const distance = cluster.radius * Math.sqrt(distanceRand); // Square root for more uniform area distribution
      
      let x = cluster.centerX + Math.cos(angle) * distance;
      let y = cluster.centerY + Math.sin(angle) * distance;
      
      // Add some noise for more natural distribution
      x += (Math.random() - 0.5) * 100; // ±50 pixel noise
      y += (Math.random() - 0.5) * 100;
      
      // Ensure coordinates are within map bounds
      x = Math.max(MAP_CONFIG.minX, Math.min(MAP_CONFIG.maxX, x));
      y = Math.max(MAP_CONFIG.minY, Math.min(MAP_CONFIG.maxY, y));
      
      return { 
        x: Math.round(x), 
        y: Math.round(y),
        cluster: cluster.name
      };
    }
  }
  
  // Fallback: random coordinates anywhere on the map (very rare)
  return {
    x: Math.floor(Math.random() * (MAP_CONFIG.maxX - MAP_CONFIG.minX) + MAP_CONFIG.minX),
    y: Math.floor(Math.random() * (MAP_CONFIG.maxY - MAP_CONFIG.minY) + MAP_CONFIG.minY),
    cluster: "Random"
  };
};

// Generate enhanced raw distances (simulated UWB anchor distances)
const generateEnhancedRawDistances = () => {
  // Simulate 4-8 UWB anchors with more realistic distances
  const anchorCount = 4 + Math.floor(Math.random() * 5);
  const distances = [];
  
  for (let i = 0; i < anchorCount; i++) {
    // Random distance between 1m to 60m (in centimeters) with better distribution
    const baseDistance = 100 + Math.random() * 5900;
    // Add some measurement noise (±5cm)
    const noise = (Math.random() - 0.5) * 100;
    const distance = Math.max(50, baseDistance + noise);
    distances.push(Math.round(distance));
  }
  
  return distances;
};

// Generate UWB location entry with enhanced properties
const generateClusteredUWBLocation = (sessionIds, cartIds) => {
  const coords = generateClusteredCoordinates();
  
  return {
    x: coords.x,
    y: coords.y,
    timestamp: generateClusteredTimestamp(),
    session_id: sessionIds[Math.floor(Math.random() * sessionIds.length)],
    cart_id: cartIds[Math.floor(Math.random() * cartIds.length)],
    raw_distances: generateEnhancedRawDistances(),
    filtered: Math.random() > 0.08, // 92% filtered (high quality), 8% unfiltered
    tracking_mode: Math.random() > 0.15, // 85% in tracking mode, 15% not
    // Additional metadata for debugging (not part of the model)
    _debug_cluster: coords.cluster
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
const postClusteredUWBLocation = async (token, locationData) => {
  try {
    // Remove debug info before posting
    const { _debug_cluster, ...cleanData } = locationData;
    
    const response = await axios.post(`${API_BASE}${UWB_LOG_ENDPOINT}`, cleanData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return { ...response.data, _debug_cluster };
  } catch (error) {
    console.error('❌ Failed to post location:', error.response?.data || error.message);
    throw error;
  }
};

// Main function
const generateClusteredUWBLocations = async () => {
  try {
    console.log('📍 Starting clustered UWB location generation...');
    console.log(`📊 Target: ${TOTAL_LOCATIONS} location points`);
    console.log(`🗺️  Map size: ${MAP_CONFIG.maxX} x ${MAP_CONFIG.maxY}`);
    console.log('');
    
    // Display cluster information
    console.log('🎯 Cluster zones:');
    CLUSTER_AREAS.forEach((cluster, idx) => {
      console.log(`   ${idx + 1}. ${cluster.name}: (${cluster.centerX}, ${cluster.centerY}) radius=${cluster.radius}px, weight=${(cluster.weight * 100).toFixed(1)}%`);
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
    
    // Generate and post locations
    let successCount = 0;
    let errorCount = 0;
    let filteredCount = 0;
    let trackingCount = 0;
    const clusterStats = {};
    
    for (let i = 0; i < TOTAL_LOCATIONS; i++) {
      try {
        const locationData = generateClusteredUWBLocation(sessionIds, cartIds);
        
        if (locationData.filtered) filteredCount++;
        if (locationData.tracking_mode) trackingCount++;
        
        // Track cluster statistics
        const cluster = locationData._debug_cluster;
        clusterStats[cluster] = (clusterStats[cluster] || 0) + 1;
        
        await postClusteredUWBLocation(token, locationData);
        successCount++;
        
        // Progress indicator with cluster info
        if ((i + 1) % 50 === 0) {
          console.log(`📈 Progress: ${i + 1}/${TOTAL_LOCATIONS} (${Math.round((i + 1) / TOTAL_LOCATIONS * 100)}%) - Latest: ${cluster}`);
        }
        
        // Small delay to avoid overwhelming the server
        if (i % 15 === 0) {
          await new Promise(resolve => setTimeout(resolve, 40));
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
    console.log(`   • Filtered (good quality): ${filteredCount} (${Math.round(filteredCount/successCount*100)}%)`);
    console.log(`   • In tracking mode: ${trackingCount} (${Math.round(trackingCount/successCount*100)}%)`);
    console.log(`   • Sessions used: ${SESSION_COUNT}`);
    console.log(`   • Carts used: ${CART_COUNT}`);
    console.log('');
    console.log('🎯 Cluster distribution:');
    Object.entries(clusterStats).forEach(([cluster, count]) => {
      console.log(`   • ${cluster}: ${count} points (${Math.round(count/successCount*100)}%)`);
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
