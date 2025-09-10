# cart/routes.py

from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
from ..models import Product, CartOpRequest, CartOpResponse, CartLogEntry
from ..auth import get_current_user, TokenData
from ..database import get_carts_collection, get_products_collection, get_cart_logs_collection

router = APIRouter(
    prefix="/api/cart",
    tags=["Cart"]
)


@router.get("/op", response_model=List[Product])
async def get_cart(
    user: TokenData = Depends(get_current_user)
):
    """
    Get current cart contents for the authenticated user.
    Returns a list of products with quantities.
    """
    try:
        # Get MongoDB collections
        carts_collection = get_carts_collection()
        
        # Get current cart
        user_cart = await carts_collection.find_one({"user_identity": user.identity})
        if not user_cart:
            return []
        
        # Convert cart items to Product format
        cart_products = []
        for item in user_cart.get("items", []):
            product = Product(
                id=item.get("id", 0),  # May need to be handled differently
                name=item.get("name", ""),
                subtitle=item.get("subtitle", ""),
                price=item.get("price", 0),
                currency=item.get("currency", "VND"),
                quantity=item.get("quantity", 0),
                unit=item.get("unit", "each"),
                product_img_url=item.get("product_img_url"),
                barcode=item.get("barcode", "")
            )
            cart_products.append(product)
        
        return cart_products
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cart: {str(e)}")


@router.post("/op", response_model=CartOpResponse)
async def cart_operation(
    request: CartOpRequest,
    user: TokenData = Depends(get_current_user)
):
    """
    Execute cart operation (add/remove items) with transactional safety.
    
    This endpoint handles cart modifications with:
    - Product existence validation
    - Stock availability checks
    - Atomic cart operations
    """
    try:
        # Get MongoDB collections
        products_collection = get_products_collection()
        carts_collection = get_carts_collection()
        cart_logs_collection = get_cart_logs_collection()
        
        # 1. Validate product exists
        product = await products_collection.find_one({"barcode": request.barcode})
        if not product:
            return CartOpResponse(
                success=False,
                message=f"Unknown barcode: {request.barcode}",
                cart_total_items=0
            )
        
        # 2. Get current cart
        user_cart = await carts_collection.find_one({"user_identity": user.identity})
        if not user_cart:
            user_cart = {"user_identity": user.identity, "items": []}
        
        # Find item in cart
        cart_item = None
        for item in user_cart.get("items", []):
            if item.get("barcode") == request.barcode:
                cart_item = item
                break
        
        # 3. Validate operation based on action
        if request.action == "add":
            # Check stock availability
            if product.get("quantity", 0) < request.quantity:
                return CartOpResponse(
                    success=False,
                    message=f"Insufficient stock. Available: {product.get('quantity', 0)}, Requested: {request.quantity}",
                    cart_total_items=sum(item.get("quantity", 0) for item in user_cart.get("items", []))
                )
        elif request.action == "remove":
            # Check if enough items in cart
            current_cart_quantity = cart_item.get("quantity", 0) if cart_item else 0
            if current_cart_quantity < request.quantity:
                return CartOpResponse(
                    success=False,
                    message=f"Not enough items in cart. Available: {current_cart_quantity}, Requested: {request.quantity}",
                    cart_total_items=sum(item.get("quantity", 0) for item in user_cart.get("items", []))
                )
        
        # 4. Execute operation atomically
        if request.action == "add":
            if cart_item:
                # Update existing item
                await carts_collection.update_one(
                    {"user_identity": user.identity, "items.barcode": request.barcode},
                    {"$inc": {"items.$.quantity": request.quantity}}
                )
            else:
                # Add new item
                new_item = {
                    "barcode": request.barcode,
                    "name": product.get("name"),
                    "price": product.get("price"),
                    "quantity": request.quantity
                }
                await carts_collection.update_one(
                    {"user_identity": user.identity},
                    {"$push": {"items": new_item}},
                    upsert=True
                )
        elif request.action == "remove":
            if cart_item.get("quantity", 0) == request.quantity:
                # Remove item completely
                await carts_collection.update_one(
                    {"user_identity": user.identity},
                    {"$pull": {"items": {"barcode": request.barcode}}}
                )
            else:
                # Decrease quantity
                await carts_collection.update_one(
                    {"user_identity": user.identity, "items.barcode": request.barcode},
                    {"$inc": {"items.$.quantity": -request.quantity}}
                )
        
        # 5. Get updated cart for response
        updated_cart = await carts_collection.find_one({"user_identity": user.identity})
        total_items = sum(item.get("quantity", 0) for item in updated_cart.get("items", []))
        
        # 6. Log the cart operation
        try:
            cart_log_entry = CartLogEntry(
                user_identity=user.identity,
                action=request.action,
                product_barcode=request.barcode,
                product_name=product.get("name", ""),
                product_price=product.get("price", 0),
                quantity=request.quantity,
                timestamp=datetime.utcnow(),
                session_id=user.session_id or request.session_id
            )
            await cart_logs_collection.insert_one(cart_log_entry.model_dump())
        except Exception as log_error:
            # Log the error but don't fail the cart operation
            print(f"Failed to log cart operation: {log_error}")
        
        return CartOpResponse(
            success=True,
            message=f"Cart updated: {request.action} {request.quantity}x {product.get('name')}",
            cart_total_items=total_items,
            session_id=user.session_id
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cart operation failed: {str(e)}")
