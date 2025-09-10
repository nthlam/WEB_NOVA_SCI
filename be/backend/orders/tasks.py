# backend/orders/tasks.py
from celery import shared_task
from pymongo import MongoClient
import redis
from datetime import datetime

from .. import config
from ..models import OrderHistoryItem, OrderStatus, PurchaseLogEntry

# --- Helper function to get a database client within the worker ---
def get_db_client():
    return MongoClient(config.MONGO_URI)

@shared_task(bind=True)
def process_order(self, order_id: str):
    """
    Processes a paid order by decrementing stock quantities in the database.
    This task is designed to be transactional and safe for concurrency.
    """
    print(f"\n--- [CELERY WORKER] PROCESSING INVENTORY FOR ORDER {order_id} ---")
    
    client = get_db_client()
    db = client["shopping_cart_db"]
    products_collection = db["products"]
    order_history_collection = db["order_history"]
    purchase_logs_collection = db["purchase_logs"]
    
    order_data = order_history_collection.find_one({"order_id": order_id})
    if not order_data or order_data.get("status") != OrderStatus.PAID:
        print(f"--- [CELERY WORKER] ERROR: Order {order_id} not found or not in 'paid' state. Aborting. ---")
        return {"status": "failure", "message": "Order not found or not paid."}

    order = OrderHistoryItem.model_validate(order_data)

    updates_to_perform = []
    for item in order.items:
        result = products_collection.update_one(
            {"id": item.id, "quantity": {"$gte": item.quantity}},
            {"$inc": {"quantity": -item.quantity}}
        )
        
        if result.matched_count == 0:
            print(f"--- [CELERY WORKER] FAILED: Insufficient stock for product ID {item.id}. Rolling back and marking order as failed. ---")
            order_history_collection.update_one({"order_id": order_id}, {"$set": {"status": OrderStatus.FAILED}})
            for u_item in updates_to_perform:
                products_collection.update_one(
                    {"id": u_item.id},
                    {"$inc": {"quantity": u_item.quantity}}
                )
            return {"status": "failure", "message": f"Insufficient stock for {item.name}."}
        
        updates_to_perform.append(item)
        print(f"--- [CELERY WORKER] Reserved {item.quantity} of '{item.name}' (ID: {item.id}).")

    # If all items are reserved, mark the order as completed
    order_history_collection.update_one({"order_id": order_id}, {"$set": {"status": OrderStatus.COMPLETED}})

    # Log the completion status update
    try:
        purchase_log_entry = PurchaseLogEntry(
            user_identity=order.user_identity,
            order_id=order_id,
            items=order.items,
            subtotal=order.subtotal,
            shipping_cost=order.shipping_cost,
            total_cost=order.total_cost,
            timestamp=datetime.utcnow(),
            payment_status="COMPLETED",
            session_id=None
        )
        purchase_logs_collection.insert_one(purchase_log_entry.model_dump())
        print(f"--- [CELERY WORKER] Order completion logged for order {order_id} ---")
    except Exception as log_error:
        print(f"Failed to log order completion for {order_id}: {log_error}")

    client.close()
    print(f"--- [CELERY WORKER] INVENTORY FOR ORDER {order_id} PROCESSED SUCCESSFULLY ---\n")
    return {"status": "success", "message": "Inventory updated and order completed."}