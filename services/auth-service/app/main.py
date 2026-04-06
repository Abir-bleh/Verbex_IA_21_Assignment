"""Main FastAPI app for auth-service"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router
from app.database import engine, Base
import httpx
from contextlib import asynccontextmanager

# Global HTTP client for reuse across requests
http_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage app lifespan - create and cleanup HTTP client"""
    global http_client
    # Startup: create HTTP client with connection pooling
    http_client = httpx.AsyncClient(
        timeout=10.0,
        limits=httpx.Limits(max_connections=100, max_keepalive_connections=50)
    )
    # Create database tables if they don't exist
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        # Tables may already exist - that's fine
        print(f"Note during table creation: {str(e)}")
    yield
    # Shutdown: close HTTP client
    await http_client.aclose()

app = FastAPI(title="Auth Service", version="1.0.0", lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router)

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok"}
