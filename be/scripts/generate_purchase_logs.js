// scripts/generate_purchase_logs.js
const axios = require('axios');

// Configuration
const API_BASE = 'http://localhost:5001';
const LOGIN_ENDPOINT = '/api/auth/login';

// We'll need to check backend to see if there's a direct purchase log endpoint
// For now, let's simulate by creating some sample data via orders

// Generate data configuration
const TOTAL_PURCHASES = 50;
const USERS = [
  'customer1@example.com',
  'customer2@example.com', 
  'customer3@example.com',
  'customer4@example.com',
  'customer5@example.com',
  'shopper@test.com',
  'buyer@demo.com',
  'user@sample.com'
];

// Payment statuses with weights
const PAYMENT_STATUSES = [
  { status: 'PAID', weight: 0.65 },      // 65% successful
  { status: 'COMPLETED', weight: 0.20 }, // 20% completed
  { status: 'FAILED', weight: 0.10 },    // 10% failed
  { status: 'PENDING', weight: 0.05 }    // 5% pending
];

// Sample products for orders
const SAMPLE_PRODUCTS = [
  { name: 'Laptop', price: 15000000, barcode: 'LP001' },
  { name: 'Phone', price: 8000000, barcode: 'PH001' },
  { name: 'Headphones', price: 2000000, barcode: 'HP001' },
  { name: 'Mouse', price: 500000, barcode: 'MS001' },
  { name: 'Keyboard', price: 1500000, barcode: 'KB001' },
  { name: 'Monitor', price: 5000000, barcode: 'MT001' },
  { name: 'Tablet', price: 6000000, barcode: 'TB001' },
  { name: 'Camera', price: 12000000, barcode: 'CM001' },
  { name: 'Speaker', price: 3000000, barcode: 'SP001' },
  { name: 'Charger', price: 300000, barcode: 'CH001' }
];

// Generate random timestamp for purchases (last 30 days)
const generatePurchaseTimestamp = () => {
  const now = new Date();
  const daysAgo = Math.random() * 30; // 0-30 days ago
  const hoursAgo = Math.random() * 24; // Additional 0-24 hours
  
  const timestamp = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000) - (hoursAgo * 60 * 60 * 1000));
  
  // Convert to UTC (Vietnam time is UTC+7, so subtract 7 hours)
  const utcTime = new Date(timestamp.getTime() - (7 * 60 * 60 * 1000));
  
  return utcTime.toISOString();
};

// Generate payment status based on weight
const generatePaymentStatus = () => {
  const rand = Math.random();
  let cumulativeWeight = 0;
  
  for (const payment of PAYMENT_STATUSES) {
    cumulativeWeight += payment.weight;
    if (rand <= cumulativeWeight) {
      return payment.status;
    }
  }
  
  return 'PAID'; // fallback
};

// Generate random order items
const generateOrderItems = () => {
  const itemCount = 1 + Math.floor(Math.random() * 4); // 1-4 items per order
  const items = [];
  
  for (let i = 0; i < itemCount; i++) {
    const product = SAMPLE_PRODUCTS[Math.floor(Math.random() * SAMPLE_PRODUCTS.length)];
    const quantity = 1 + Math.floor(Math.random() * 3); // 1-3 quantity
    
    items.push({
      id: Math.floor(Math.random() * 1000) + 1,
      name: product.name,
      subtitle: `High quality ${product.name.toLowerCase()}`,
      price: product.price,
      currency: 'VND',
      unit: 'each',
      quantity: quantity,
      barcode: product.barcode
    });
  }
  
  return items;
};

// Calculate totals for order
const calculateOrderTotals = (items) => {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping_cost = subtotal > 10000000 ? 0 : 200000; // Free shipping for orders > 10M VND
  const total_cost = subtotal + shipping_cost;
  
  return { subtotal, shipping_cost, total_cost };
};

// Generate purchase log entry
const generatePurchaseLog = () => {
  const user_identity = USERS[Math.floor(Math.random() * USERS.length)];
  const order_id = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const items = generateOrderItems();
  const { subtotal, shipping_cost, total_cost } = calculateOrderTotals(items);
  const payment_status = generatePaymentStatus();
  const timestamp = generatePurchaseTimestamp();
  
  return {
    user_identity,
    order_id,
    items,
    subtotal,
    shipping_cost,
    total_cost,
    timestamp,
    payment_status,
    session_id: `purchase_session_${Math.floor(Math.random() * 20) + 1}`
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

// Insert purchase log via API
const insertPurchaseLog = async (token, purchaseData) => {
  try {
    const response = await axios.post(
      `${API_BASE}/api/logs/purchases`,
      purchaseData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to insert purchase log:', error.response?.data || error.message);
    throw error;
  }
};

// Insert multiple purchase logs via bulk API
const insertPurchaseLogsBulk = async (token, purchaseLogs) => {
  try {
    const response = await axios.post(
      `${API_BASE}/api/logs/purchases/bulk`,
      { purchase_logs: purchaseLogs },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to insert purchase logs bulk:', error.response?.data || error.message);
    throw error;
  }
};

// Main function
const generatePurchaseLogs = async () => {
  try {
    console.log('💰 Starting purchase logs generation...');
    console.log(`📊 Target: ${TOTAL_PURCHASES} purchase records`);
    console.log(`👥 Users: ${USERS.length} different customers`);
    console.log(`📦 Products: ${SAMPLE_PRODUCTS.length} product types`);
    
    // Login
    const token = await login();
    
    console.log('💳 Payment status distribution:');
    PAYMENT_STATUSES.forEach(payment => {
      console.log(`   ${payment.status}: ${(payment.weight * 100).toFixed(1)}%`);
    });
    console.log('');
    
    // Generate and process logs
    let successCount = 0;
    let errorCount = 0;
    let totalRevenue = 0;
    const statusCounts = {};
    const batchSize = 10; // Process in batches
    const allPurchaseLogs = [];
    
    // Generate all purchase logs first
    console.log('🎲 Generating purchase data...');
    for (let i = 0; i < TOTAL_PURCHASES; i++) {
      const purchaseData = generatePurchaseLog();
      allPurchaseLogs.push(purchaseData);
      
      // Track statistics
      totalRevenue += purchaseData.total_cost;
      statusCounts[purchaseData.payment_status] = (statusCounts[purchaseData.payment_status] || 0) + 1;
    }
    
    // Insert in batches
    console.log('📤 Inserting purchase logs...');
    for (let i = 0; i < allPurchaseLogs.length; i += batchSize) {
      try {
        const batch = allPurchaseLogs.slice(i, i + batchSize);
        
        await insertPurchaseLogsBulk(token, batch);
        successCount += batch.length;
        
        // Progress indicator
        const processedCount = Math.min(i + batchSize, allPurchaseLogs.length);
        console.log(`📈 Progress: ${processedCount}/${TOTAL_PURCHASES} (${Math.round(processedCount / TOTAL_PURCHASES * 100)}%)`);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        errorCount += batchSize;
        console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      }
    }
    
    console.log('');
    console.log('✅ Purchase logs generation completed!');
    console.log(`📊 Results:`);
    console.log(`   • Total purchases: ${TOTAL_PURCHASES}`);
    console.log(`   • Generated: ${successCount}`);
    console.log(`   • Errors: ${errorCount}`);
    console.log(`   • Total revenue: ${totalRevenue.toLocaleString('vi-VN')} VND`);
    console.log(`   • Average order value: ${Math.round(totalRevenue / successCount).toLocaleString('vi-VN')} VND`);
    console.log('');
    console.log('💳 Payment status breakdown:');
    Object.keys(statusCounts).forEach(status => {
      const count = statusCounts[status];
      const percentage = ((count / successCount) * 100).toFixed(1);
      console.log(`   ${status}: ${count} orders (${percentage}%)`);
    });
    
    console.log('');
    console.log('⚠️  Note: Purchase logs have been inserted into the database.');
    console.log('   You can now view them in the Purchase Reports dashboard.');
    console.log('   API endpoint: GET /api/logs/purchases');
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  generatePurchaseLogs();
}

module.exports = { generatePurchaseLogs };
