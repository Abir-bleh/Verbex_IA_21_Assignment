"""Configuration for chat-service"""
from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    database_url: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost/verbex_db")
    auth_service_url: str = os.getenv("AUTH_SERVICE_URL", "http://localhost:8081")
    agent_service_url: str = os.getenv("AGENT_SERVICE_URL", "http://localhost:8082")
    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "")
    jwt_secret: str = os.getenv("JWT_SECRET", "your-super-secret-random-string-here")
    algorithm: str = "HS256"
    
    class Config:
        env_file = ".env"

settings = Settings()
