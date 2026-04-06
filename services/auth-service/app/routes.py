"""Routes for auth-service"""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
import httpx
from app.database import get_db
from app.models import SignupRequest, LoginRequest, TokenResponse, UserResponse, SuccessResponse, ErrorResponse
from app.service import (
    create_user, authenticate_user, create_token, verify_token, get_user_by_email, validate_password_strength
)
from app.config import settings

router = APIRouter()

@router.post("/auth/signup")
async def signup(request: SignupRequest, db: AsyncSession = Depends(get_db)):
    """Sign up a new user"""
    try:
        # Validate password strength
        is_valid, message = validate_password_strength(request.password)
        if not is_valid:
            raise HTTPException(status_code=400, detail={"error": message})
        
        user = await create_user(db, request.email, request.password)
        token = create_token(str(user.id), user.email)
        return {"data": {"token": token}}
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail={"error": "Email already exists"})
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail={"error": str(e)})

@router.post("/auth/login")
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login a user"""
    user = await authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(status_code=401, detail={"error": "Invalid credentials"})
    
    token = create_token(str(user.id), user.email)
    return {"data": {"token": token}}

@router.get("/auth/verify")
async def verify(authorization: str = Header(None), db: AsyncSession = Depends(get_db)):
    """Verify JWT token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"error": "Invalid token"})
    
    token = authorization.split(" ")[1]
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail={"error": "Invalid token"})
    
    user = await get_user_by_email(db, payload.get("email"))
    if not user:
        raise HTTPException(status_code=401, detail={"error": "Invalid token"})
    
    return {"data": {"userId": str(user.id), "email": user.email}}

@router.get("/auth/verify-apikey")
async def verify_apikey(x_api_key: str = Header(None)):
    """Verify API key - delegates to agent-service"""
    if not x_api_key:
        raise HTTPException(status_code=401, detail={"error": "Invalid API key"})
    
    # Call agent-service to verify the API key
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.agent_service_url}/apikeys/verify",
                headers={"x-api-key": x_api_key}
            )
            if response.status_code == 200:
                return response.json()
            raise HTTPException(status_code=401, detail={"error": "Invalid API key"})
    except Exception as e:
        raise HTTPException(status_code=401, detail={"error": "Invalid API key"})
