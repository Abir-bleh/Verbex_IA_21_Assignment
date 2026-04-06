"""Configuration for auth-service"""
from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    database_url: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost/verbex_db")
    jwt_secret: str = os.getenv("JWT_SECRET", "your-super-secret-random-string-here")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours
    agent_service_url: str = os.getenv("AGENT_SERVICE_URL", "http://localhost:8082")
    
    class Config:
        env_file = ".env"

settings = Settings()
