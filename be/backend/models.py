# models.py
from typing import List, Optional
from enum import Enum
from decimal import Decimal
from pydantic import BaseModel, Field, model_validator, EmailStr
from datetime import datetime
from bson import ObjectId


# --- Session Management Models ---
class SessionInfo(BaseModel):
    """Model for storing session information in MongoDB."""
    session_id: str = Field(..., description="MongoDB ObjectId as string")
    user_identity: str = Field(..., description="User identifier (email or card_id)")
    user_role: str = Field(..., description="User role")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True)
    user_agent: Optional[str] = Field(None, description="Client information")
    ip_address: Optional[str] = Field(None, description="Client IP address")

class SessionCreate(BaseModel):
    """Model for creating a new session."""
    user_identity: str
    user_role: str
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None


class ProductBase(BaseModel):
    name: str
    subtitle: str
    price: float = Field(..., ge=0)
    currency: str = Field(default="VND", description="Currency code, e.g. 'VND'.")
    unit: str = Field(
        default="each",
        description="The unit of measurement (e.g., 'each', 'kg', 'pack').",
    )
    product_img_url: Optional[str] = Field(
        default=None, description="URL for the product's image."
    )
    barcode: Optional[str] = Field(
        default=None, description="Barcode for the product (EAN/UPC/other)."
    )


# Model for creating a new product. 'quantity' is the initial stock.
class ProductCreate(ProductBase):
    quantity: int = Field(
        default=1, ge=0, description="The initial stock quantity of the product."
    )


# Model for what is stored in/retrieved from the DB and used in the cart.
class Product(ProductBase):
    id: int
    quantity: int = Field(
        ..., ge=0, description="The stock quantity of the product, or quantity in cart."
    )


# Model for updating a product. All fields are optional.
class ProductUpdate(BaseModel):
    name: Optional[str] = None
    subtitle: Optional[str] = None
    price: Optional[float] = Field(default=None, ge=0)
    currency: Optional[str] = Field(default=None, description="Currency code, e.g. 'VND'.")
    quantity: Optional[int] = Field(default=None, ge=0)
    unit: Optional[str] = None
    product_img_url: Optional[str] = None
    barcode: Optional[str] = None


# --- User and Auth Models ---


class Role(str, Enum):
    ADMIN = "admin"
    SHOP_CLIENT = "shop_client"
    GUEST = "guest"


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)


class User(BaseModel):
    email: EmailStr
    hashed_password: str
    role: Role = Role.SHOP_CLIENT


class CardLogin(BaseModel):
    card_id: str = Field(..., min_length=4, max_length=16)  # Example length constraints


# --- Order History Models ---


class OrderStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    COMPLETED = "completed"  # After inventory processing


class CheckoutPayload(BaseModel):
    """Data model for the entire checkout payload sent from the client."""

    items: List[Product]
    shipping_cost: float = Field(..., ge=0)
    subtotal: float = Field(..., ge=0)
    total_cost: float = Field(..., ge=0)
    session_id: Optional[str] = Field(None, description="Session identifier for tracking")

    @model_validator(mode="after")
    def validate_and_recalculate_totals(self) -> "CheckoutPayload":
        """
        Validates that the subtotal and total_cost sent by the client are correct.
        This is a security measure to prevent price manipulation from the client-side.
        """
        # Use Decimal for precision with currency to avoid floating point errors
        calculated_subtotal = sum(
            Decimal(str(item.price)) * Decimal(item.quantity) for item in self.items
        )
        calculated_total = calculated_subtotal + Decimal(str(self.shipping_cost))

        # Compare with a small tolerance for floating point inaccuracies
        if not abs(Decimal(str(self.subtotal)) - calculated_subtotal) < Decimal(
            "0.01"
        ):
            raise ValueError(
                f"Subtotal mismatch. Client sent {self.subtotal}, server calculated {calculated_subtotal:.2f}"
            )

        if not abs(Decimal(str(self.total_cost)) - calculated_total) < Decimal(
            "0.01"
        ):
            raise ValueError(
                f"Total cost mismatch. Client sent {self.total_cost}, server calculated {calculated_total:.2f}"
            )

        return self


class OrderHistoryItem(CheckoutPayload):
    """Represents a single completed order in the user's history."""

    order_id: str
    user_identity: str
    created_at: datetime
    status: OrderStatus = OrderStatus.PENDING


class OrderStatusResponse(BaseModel):
    """Response model for checking an order's status."""

    order_id: str
    status: OrderStatus


class VietQRTransactionState(str, Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"


class VietQRWebhookPayload(BaseModel):
    paymentRequestId: str
    state: VietQRTransactionState
    amount: int
    description: str
    referenceId: str  # This will be our order_id
    merchantId: str
    extraData: str
    signature: str


# --- VietQR API Models ---
class VietQRGenerateRequest(BaseModel):
    accountNo: str
    accountName: str
    acqId: int
    amount: int
    addInfo: str
    template: str = "compact2"

class VietQRGenerateResponseData(BaseModel):
    qrCode: str
    qrDataURL: str

class VietQRGenerateResponse(BaseModel):
    code: str
    desc: str
    data: Optional[VietQRGenerateResponseData] = None


# --- Cart Operation Models ---
class CartOpRequest(BaseModel):
    """Request model for cart operations (add/remove items)."""
    barcode: str = Field(..., description="Barcode of the product to add/remove")
    action: str = Field(..., description="Operation to perform: 'add' or 'remove'")
    quantity: int = Field(..., ge=1, description="Quantity to add or remove")
    session_id: Optional[str] = None

class CartOpResponse(BaseModel):
    """Response model for cart operations."""
    success: bool = Field(..., description="Whether the operation was successful")
    message: str = Field(..., description="Status message for the operation")
    cart_total_items: int = Field(..., ge=0, description="Total items in cart after operation")
    session_id: Optional[str] = None

# --- Logging Models ---
class CartLogEntry(BaseModel):
    """Model for logging cart operations."""
    user_identity: str
    action: str  # "add" or "remove"
    product_barcode: str
    product_name: str
    product_price: float
    quantity: int
    timestamp: datetime
    session_id: Optional[str] = None


class PurchaseLogEntry(BaseModel):
    """Model for logging completed purchases."""
    user_identity: str
    order_id: str
    items: List[Product]
    subtotal: float
    shipping_cost: float
    total_cost: float
    timestamp: datetime
    payment_status: str
    session_id: Optional[str] = None


# --- Motion Sensor Models ---
class MotionState(str, Enum):
    IDLE = "idle"        # state: 0
    ADDING = "adding"    # state: 1
    REMOVING = "removing" # state: 2


class MotionLogEntry(BaseModel):
    """Model for logging motion sensor data from smart cart."""
    state: int = Field(..., ge=0, le=2, description="Motion state: 0=idle, 1=adding, 2=removing")
    weight: float = Field(..., description="Current weight reading in grams")
    last_stable_weight: Optional[float] = Field(None, description="Previous stable weight in grams")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    session_id: Optional[str] = Field(None, description="Cart session identifier")
    cart_id: Optional[str] = Field(None, description="Physical cart identifier")


class MotionEventLogEntry(BaseModel):
    """Model for logging processed motion events (add/remove operations)."""
    event_type: str = Field(..., description="Event type: 'add' or 'remove'")
    weight_before: float = Field(..., description="Weight before the operation in grams")
    weight_after: float = Field(..., description="Weight after the operation in grams")
    weight_difference: float = Field(..., description="Weight change in grams")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    session_id: Optional[str] = Field(None, description="Cart session identifier")
    cart_id: Optional[str] = Field(None, description="Physical cart identifier")
    processed_by: Optional[str] = Field(None, description="System/user that processed this event")


class UWBLocationLogEntry(BaseModel):
    """Model for logging UWB location tracking data from smart cart."""
    x: float = Field(..., description="X coordinate position")
    y: float = Field(..., description="Y coordinate position")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    session_id: Optional[str] = Field(None, description="Cart session identifier")
    cart_id: Optional[str] = Field(None, description="Physical cart identifier")
    raw_distances: Optional[List[int]] = Field(None, description="Raw distance measurements to anchors")
    filtered: bool = Field(default=True, description="Whether position was filtered/smoothed")
    tracking_mode: bool = Field(default=True, description="Whether tracking mode was active")
