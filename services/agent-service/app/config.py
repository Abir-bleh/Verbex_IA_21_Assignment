"""Configuration for agent-service"""
from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    database_url: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost/verbex_db")
    auth_service_url: str = os.getenv("AUTH_SERVICE_URL", "http://localhost:8081")
    chat_service_url: str = os.getenv("CHAT_SERVICE_URL", "http://localhost:8083")
    
    class Config:
        env_file = ".env"

settings = Settings()

FREE_MODELS = [
    {"label": "Claude 3 Haiku (Fast & Free)", "value": "anthropic/claude-3-haiku"},
    {"label": "Mistral 7B Instruct", "value": "mistralai/mistral-7b-instruct"},
    {"label": "LLaMA 2 7B Chat", "value": "meta-llama/llama-2-7b-chat"},
    {"label": "Neural Chat 7B", "value": "intel/neural-chat-7b"},
    {"label": "Nous Hermes 2 Mistral 7B", "value": "nousresearch/nous-hermes-2-mistral-7b-instruct"},
    {"label": "Toppy M 7B", "value": "undi95/toppy-m-7b"},
]
