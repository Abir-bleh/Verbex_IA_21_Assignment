"""Utility functions for agent-service"""
import hashlib
import uuid

def generate_api_key() -> str:
    """Generate a raw API key (shown once to user)"""
    return str(uuid.uuid4())

def hash_api_key(key: str) -> str:
    """Hash API key with SHA-256 for storage"""
    return hashlib.sha256(key.encode()).hexdigest()

def get_key_preview(key: str) -> str:
    """Get preview of API key (first 8 chars + ... + last 4 chars)"""
    if len(key) < 12:
        return key
    return f"{key[:8]}...{key[-4:]}"

def verify_api_key(raw_key: str, stored_hash: str) -> bool:
    """Verify raw key against stored hash"""
    return hashlib.sha256(raw_key.encode()).hexdigest() == stored_hash
