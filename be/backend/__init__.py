# backend/__init__.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
from celery import Celery
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from redis import asyncio as aioredis
from contextlib import asynccontextmanager

from .config import settings
from .database import ensure_indexes, seed_database_if_empty

# --- Lifespan Manager ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles startup and shutdown events.
    - Initializes Redis cache on startup.
    - Seeds the database on startup.
    - Closes Redis connection on shutdown.
    """
    # Startup
    redis = aioredis.from_url(settings.REDIS_URI, encoding="utf8", decode_responses=False)
    FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")
    print("FastAPI-Cache initialized.")
    ensure_indexes()
    seed_database_if_empty()  # Now safe - only seeds if collections are empty
    yield
    # Shutdown
    await redis.close()
    print("Redis connection closed.")

# --- App Initialization ---
app = FastAPI(title="Shopping Cart API", lifespan=lifespan)

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"],  # React development servers
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# --- Security ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Celery ---
celery_app = Celery(
    "tasks",
    broker=settings.REDIS_URI,
    backend=settings.REDIS_URI
)
celery_app.conf.update(task_track_started=True)

# --- API Routers ---
from .products.routes import router as products_router
from .users.routes import router as users_router
from .orders.routes import router as orders_router
from .cart.routes import router as cart_router
from .me.routes import router as me_router
from .map.routes import router as map_router
from .logs.routes import router as logs_router
from .motion.routes import router as motion_router
from .sessions.routes import router as sessions_router

app.include_router(products_router)
app.include_router(users_router)
app.include_router(orders_router)
app.include_router(cart_router)
app.include_router(me_router)
app.include_router(map_router)
app.include_router(logs_router)
app.include_router(motion_router)
app.include_router(sessions_router)