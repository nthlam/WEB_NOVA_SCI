# backend/database.py
from pymongo import MongoClient, ASCENDING, collection
from .config import settings
import random
import os
import json
import logging
# --- Database Connection ---
# This setup creates a single client that can be shared across the application.
# PyMongo's client is thread-safe and includes connection pooling.

client = MongoClient(settings.MONGO_URI)
db = client["shopping_cart_db"]

# --- Collection Getters (for Dependency Injection) ---
def get_products_collection() -> collection.Collection:
    return db["products"]

def get_users_collection() -> collection.Collection:
    return db["users"]

def get_orders_collection() -> collection.Collection:
    return db["order_history"]

def get_map_collection() -> collection.Collection:
    return db["map"]

def get_carts_collection()-> collection.Collection:
    return db['carts']

def get_cart_logs_collection() -> collection.Collection:
    return db["cart_logs"]

def get_purchase_logs_collection() -> collection.Collection:
    return db["purchase_logs"]

def get_motion_logs_collection() -> collection.Collection:
    return db["motion_logs"]

def get_motion_events_collection() -> collection.Collection:
    return db["motion_events"]

def get_uwb_locations_collection() -> collection.Collection:
    return db["uwb_locations"]

def get_sessions_collection() -> collection.Collection:
    return db["sessions"]

# --- Database Helpers ---
def ensure_indexes():
    """Creates unique indexes for collections if they don't exist."""
    get_products_collection().create_index([("id", ASCENDING)], unique=True)
    get_users_collection().create_index([("email", ASCENDING)], unique=True)
    get_sessions_collection().create_index([("session_id", ASCENDING)], unique=True)
    get_sessions_collection().create_index([("user_identity", ASCENDING)])
    get_sessions_collection().create_index([("created_at", ASCENDING)], expireAfterSeconds=86400*7)  # Sessions expire after 7 days
    
    # UWB location indexes for efficient querying
    get_uwb_locations_collection().create_index([("timestamp", ASCENDING)])
    get_uwb_locations_collection().create_index([("cart_id", ASCENDING)])
    get_uwb_locations_collection().create_index([("session_id", ASCENDING)])
    
    print("Database indexes ensured.")

PRODUCT_NAMES = [
    "Apple", "Banana", "Orange", "Milk", "Bread", "Eggs", "Cheese", "Chicken", "Rice", "Pasta",
    "Tomato", "Potato", "Onion", "Carrot", "Cucumber", "Lettuce", "Yogurt", "Butter", "Juice", "Coffee"
]
SUBTITLES = ["Fresh", "Organic", "Imported", "Local", "Premium", "Budget"]
UNITS = ["each", "kg", "pack", "bottle", "box"]
random.seed(42)

def random_location():
    return {"x": 5200, "y": 2400}
import string
def random_barcode(length=13):
    """Generate a random numeric barcode string (EAN-13 style)."""
    return ''.join(random.choices(string.digits, k=length))

def generate_products(n=20):
    products = []
    # Add original demo products (conform to ProductBase)
    demo_products = []
    products.extend(demo_products)
    # Add random mock products
    for i in range(n):
        name = PRODUCT_NAMES[i % len(PRODUCT_NAMES)] + f" {i+1}"
        product = {
            "id": i+100,
            "name": name,
            "subtitle": random.choice(SUBTITLES),
            "price": round(random.uniform(1, 100), 2),
            "currency": "VND",
            "quantity": random.randint(1, 50),
            "unit": random.choice(UNITS),
            "product_img_url": "https://via.placeholder.com/80/cccccc/000000?Text=Product",
            "location": [random_location() for _ in range(random.randint(1, 3))],
            "barcode": None
        }
        products.append(product)
    return products

def generate_uwb_location_data(n=50):
    """Generate sample UWB location tracking data for development."""
    from datetime import datetime, timedelta
    import math
    
    locations = []
    base_time = datetime.utcnow() - timedelta(hours=2)  # Start 2 hours ago
    
    # Simulate a cart moving through the store
    start_x, start_y = 1500, 400  # Start near entrance
    current_x, current_y = start_x, start_y
    
    for i in range(n):
        # Simulate realistic movement pattern
        time_offset = timedelta(seconds=i * 10)  # Every 10 seconds
        timestamp = base_time + time_offset
        
        # Add some random movement
        current_x += random.uniform(-50, 50)
        current_y += random.uniform(-30, 30)
        
        # Keep within map bounds
        current_x = max(500, min(6500, current_x))
        current_y = max(200, min(3000, current_y))
        
        # Simulate some stops at product locations
        if i % 15 == 0:  # Every 15th point, "stop" near a product
            current_x += random.uniform(-20, 20)
            current_y += random.uniform(-20, 20)
        
        # Generate mock anchor distances based on position
        distances = []
        for anchor_x, anchor_y in [(1040, 150), (5881, 150), (3811, 1877), (1040, 3025)]:
            distance = int(math.sqrt((current_x - anchor_x)**2 + (current_y - anchor_y)**2))
            distance += random.randint(-10, 10)  # Add noise
            distances.append(max(100, min(8000, distance)))
        
        location = {
            "x": round(current_x, 1),
            "y": round(current_y, 1),
            "timestamp": timestamp,
            "cart_id": "demo_cart_001",
            "session_id": "demo_session_001",
            "raw_distances": distances,
            "filtered": True,
            "tracking_mode": True
        }
        locations.append(location)
    
    return locations

def seed_database_if_empty():
    """Seeds the products and map collections with initial data only if they are completely empty."""
    if getattr(settings, "APP_ENV", "development") != "development":
        print("Skipping database seeding: not in development environment.")
        return
    
    products_collection = get_products_collection()
    map_collection = get_map_collection()
    uwb_locations_collection = get_uwb_locations_collection()
    
    # Always ensure text index exists
    products_collection.create_index([("name", "text")])

    # Check if collections already have data - if so, don't reseed
    if products_collection.count_documents({}) > 0:
        print(f"Products collection already has {products_collection.count_documents({})} documents - skipping seed.")
        return
    
    if map_collection.count_documents({}) > 0:
        print(f"Map collection already has {map_collection.count_documents({})} documents - skipping seed.")
        return

    print("Collections are empty, proceeding with seeding...")

    # Try to load products from JSONL file
    seed_file = os.path.join(os.path.dirname(__file__), "tests", "database_seed.jsonl")
    loaded_products = []
    if os.path.exists(seed_file):
        with open(seed_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        prod = json.loads(line)
                        # Ensure all required fields exist, fill defaults if missing
                        prod.setdefault("currency", "VND")
                        prod.setdefault("barcode", random_barcode())
                        prod.setdefault("unit", "each")
                        prod.setdefault("product_img_url", None)
                        prod.setdefault("location", [random_location() for _ in range(random.randint(1, 3))])
                        loaded_products.append(prod)
                    except Exception as e:
                        print(f"Error loading product from JSONL: {e}")

    if not loaded_products:
        print("No products loaded from JSONL, generating random samples...")
        loaded_products = generate_products(20)
    else:
        print(f"Loaded {len(loaded_products)} products from JSONL.")

    print("Seeding database with products...")
    products_collection.insert_many(loaded_products)
    print("Database seeded.")

    # Seed UWB location data only if empty
    if uwb_locations_collection.count_documents({}) == 0:
        print("Seeding UWB location data...")
        uwb_data = generate_uwb_location_data(100)  # Generate 100 sample points
        uwb_locations_collection.insert_many(uwb_data)
        print(f"Seeded {len(uwb_data)} UWB location records.")

    # Seed default_map.png
    default_map_path = os.path.join(os.path.dirname(__file__), "default_map.png")
    with open(default_map_path, "rb") as f:
        image_bytes = f.read()
    map_doc = {"name": "mall_map", "image": image_bytes, "content_type": "image/png"}
    map_collection.insert_one(map_doc)
    print("Seeded mall map image from default_map.png.")