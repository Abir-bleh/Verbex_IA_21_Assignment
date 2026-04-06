"""Database setup for chat-service"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.pool import QueuePool
from sqlalchemy.orm import sessionmaker, declarative_base
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost/verbex_db")

# Connection pool configuration for better performance
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    poolclass=QueuePool,
    pool_size=15,  # Chat service handles more connections
    max_overflow=30,  # Higher overflow for concurrent requests
    pool_recycle=3600,  # Recycle connections after 1 hour (PostgreSQL default)
    pool_pre_ping=True,  # Test connection before using (prevents stale connections)
    connect_args={
        "timeout": 10,
        "command_timeout": 30,
        "server_settings": {"application_name": "chat_service"}
    }
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    future=True
)

Base = declarative_base()

async def get_db():
    """Dependency for getting database session"""
    async with AsyncSessionLocal() as session:
        yield session
