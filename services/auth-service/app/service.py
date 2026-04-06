"""Authentication service logic"""
from datetime import datetime, timedelta
from jose import JWTError, jwt
import bcrypt
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.schema import User
from app.config import settings

JWT_SECRET = settings.jwt_secret
ALGORITHM = settings.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    """Verify plain password against hashed"""
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_token(user_id: str, email: str) -> str:
    """Create JWT token"""
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)

def verify_token(token: str) -> dict:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validate password meets security requirements"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not any(c.isalpha() for c in password):
        return False, "Password must contain letters"
    
    if not any(c.isdigit() for c in password):
        return False, "Password must contain numbers"
    
    if not any(c in "@$!%*?&" for c in password):
        return False, "Password must contain special characters (@$!%*?&)"
    
    return True, "Password is strong"

async def create_user(db: AsyncSession, email: str, password: str) -> User:
    """Create a new user in database"""
    hashed_password = hash_password(password)
    user = User(email=email, password=hashed_password)
    db.add(user)
    await db.flush()  # Assign ID from DB without extra round trip
    await db.commit()
    return user

async def get_user_by_email(db: AsyncSession, email: str) -> User:
    """Get user by email from database"""
    result = await db.execute(select(User).filter(User.email == email))
    return result.scalar_one_or_none()

async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
    """Authenticate user by email and password"""
    user = await get_user_by_email(db, email)
    if not user or not verify_password(password, user.password):
        return None
    return user
