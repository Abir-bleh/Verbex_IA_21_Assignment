"""Routes for agent-service"""
from fastapi import APIRouter, Depends, HTTPException, Header, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
from app.database import get_db
from app.models import AgentCreate, AgentUpdate, AgentResponse, APIKeyResponse, FreeModel
from app.service import (
    create_agent, get_agent, get_user_agents, update_agent, delete_agent,
    create_or_update_api_key, get_user_api_key, get_agent_analytics, get_user_api_key_by_hash
)
from app.config import settings, FREE_MODELS
from app.utils import verify_api_key as verify_key_hash, get_key_preview

router = APIRouter()

async def get_current_user(authorization: str = Header(None), db: AsyncSession = Depends(get_db)):
    """Dependency to get current user from JWT token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"error": "Unauthorized"})
    
    token = authorization.split(" ")[1]
    
    try:
        from app.main import http_client
        if not http_client:
            raise HTTPException(status_code=401, detail={"error": "Service temporarily unavailable"})
        
        response = await http_client.get(
            f"{settings.auth_service_url}/auth/verify",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10.0
        )
        if response.status_code == 200:
            data = response.json()
            # Handle both "data" and direct response formats
            user_data = data.get("data") or data
            # Normalize user_id field for consistency
            if "userId" in user_data and "user_id" not in user_data:
                user_data["user_id"] = user_data["userId"]
            return user_data
        else:
            print(f"Auth verify failed: {response.status_code} - {response.text}")
            raise HTTPException(status_code=401, detail={"error": "Invalid token"})
    except httpx.RequestError as e:
        print(f"Auth service request error: {str(e)}")
        raise HTTPException(status_code=401, detail={"error": "Auth service error"})
    except Exception as e:
        print(f"Token verification error: {str(e)}")
        raise HTTPException(status_code=401, detail={"error": "Unauthorized"})

@router.post("/agents")
async def create_new_agent(
    request: AgentCreate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new agent"""
    try:
        print(f"Creating agent for user: {user}")
        agent = await create_agent(
            db,
            user.get("userId") or user.get("user_id"),
            request.name,
            request.system_prompt,
            float(request.temperature) if request.temperature else 0.7,
            request.model or "stepfun-ai/step-3.5-flash:free",
            request.webhook_url
        )
        
        return JSONResponse(
            status_code=201,
            content={
                "data": {
                    "id": str(agent.id),
                    "user_id": str(agent.user_id),
                    "name": agent.name,
                    "system_prompt": agent.system_prompt,
                    "temperature": float(agent.temperature),
                    "model": agent.model,
                    "webhook_url": agent.webhook_url,
                    "created_at": agent.created_at.isoformat() if agent.created_at else None
                }
            }
        )
    except Exception as e:
        print(f"Error creating agent: {str(e)}")
        raise HTTPException(status_code=500, detail={"error": str(e)})

@router.get("/agents")
async def list_agents(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all agents for current user"""
    agents = await get_user_agents(db, user["userId"])
    
    return JSONResponse(
        status_code=200,
        content={
            "data": [
                {
                    "id": str(agent.id),
                    "user_id": str(agent.user_id),
                    "name": agent.name,
                    "system_prompt": agent.system_prompt,
                    "temperature": float(agent.temperature),
                    "model": agent.model,
                    "webhook_url": agent.webhook_url,
                    "created_at": agent.created_at.isoformat() if agent.created_at else None
                }
                for agent in agents
            ]
        }
    )

@router.get("/agents/{agent_id}")
async def get_agent_details(
    agent_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get agent details"""
    try:
        # Convert string to UUID for database lookup
        import uuid
        agent_uuid = uuid.UUID(agent_id)
        agent = await get_agent(db, str(agent_uuid))
    except (ValueError, TypeError):
        # Invalid UUID format
        raise HTTPException(status_code=404, detail={"error": "Agent not found"})
    
    if not agent or str(agent.user_id) != str(user["userId"]):
        raise HTTPException(status_code=404, detail={"error": "Agent not found"})
    
    return JSONResponse(
        status_code=200,
        content={
            "data": {
                "id": str(agent.id),
                "user_id": str(agent.user_id),
                "name": agent.name,
                "system_prompt": agent.system_prompt,
                "temperature": float(agent.temperature),
                "model": agent.model,
                "webhook_url": agent.webhook_url,
                "created_at": agent.created_at.isoformat() if agent.created_at else None
            }
        }
    )

@router.get("/agents/public/{agent_id}")
async def get_agent_public(agent_id: str, db: AsyncSession = Depends(get_db)):
    """Get public agent data (no auth required)"""
    try:
        import uuid
        agent_uuid = uuid.UUID(agent_id)
        agent = await get_agent(db, str(agent_uuid))
    except (ValueError, TypeError):
        raise HTTPException(status_code=404, detail={"error": "Agent not found"})
    
    if not agent:
        raise HTTPException(status_code=404, detail={"error": "Agent not found"})
    
    return JSONResponse(
        status_code=200,
        content={
            "data": {
                "id": str(agent.id),
                "name": agent.name,
                "system_prompt": agent.system_prompt,
                "temperature": float(agent.temperature),
                "model": agent.model,
                "webhook_url": agent.webhook_url
            }
        }
    )

@router.put("/agents/{agent_id}")
async def update_agent_details(
    agent_id: str,
    request: AgentUpdate,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update an agent"""
    try:
        import uuid
        agent_uuid = uuid.UUID(agent_id)
        agent_id = str(agent_uuid)
    except (ValueError, TypeError):
        raise HTTPException(status_code=404, detail={"error": "Agent not found"})
    
    updates = {}
    if request.name is not None:
        updates["name"] = request.name
    if request.system_prompt is not None:
        updates["system_prompt"] = request.system_prompt
    if request.temperature is not None:
        updates["temperature"] = float(request.temperature)
    if request.model is not None:
        updates["model"] = request.model
    if request.webhook_url is not None:
        updates["webhook_url"] = request.webhook_url
    
    agent = await update_agent(db, agent_id, user["userId"], **updates)
    
    if not agent:
        raise HTTPException(status_code=404, detail={"error": "Agent not found"})
    
    return JSONResponse(
        status_code=200,
        content={
            "data": {
                "id": str(agent.id),
                "user_id": str(agent.user_id),
                "name": agent.name,
                "system_prompt": agent.system_prompt,
                "temperature": float(agent.temperature),
                "model": agent.model,
                "webhook_url": agent.webhook_url,
                "created_at": agent.created_at.isoformat() if agent.created_at else None
            }
        }
    )

@router.delete("/agents/{agent_id}")
async def delete_agent_details(
    agent_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an agent"""
    try:
        import uuid
        agent_uuid = uuid.UUID(agent_id)
        success = await delete_agent(db, str(agent_uuid), user["userId"])
    except (ValueError, TypeError):
        success = False
    
    if not success:
        raise HTTPException(status_code=404, detail={"error": "Agent not found"})
    
    return JSONResponse(status_code=204, content={})

@router.get("/agents/{agent_id}/analytics")
async def get_agent_analytics_endpoint(
    agent_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get agent analytics"""
    try:
        import uuid
        agent_uuid = uuid.UUID(agent_id)
        agent = await get_agent(db, str(agent_uuid))
        
        if not agent or str(agent.user_id) != str(user["userId"]):
            # Return empty analytics if agent not found or doesn't belong to user
            return JSONResponse(
                status_code=200,
                content={"data": {
                    "totalConversations": 0,
                    "totalMessages": 0,
                    "lastActivity": None
                }}
            )
        
        analytics = await get_agent_analytics(str(agent.id))
        
        return JSONResponse(
            status_code=200,
            content={"data": {
                "totalConversations": analytics.get("totalConversations", 0),
                "totalMessages": analytics.get("totalMessages", 0),
                "lastActivityAt": analytics.get("lastActivity")  # Map lastActivity to lastActivityAt
            }}
        )
    except Exception as e:
        print(f"Error getting analytics for agent {agent_id}: {e}")
        # Return empty analytics on error
        return JSONResponse(
            status_code=200,
            content={"data": {
                "totalConversations": 0,
                "totalMessages": 0,
                "lastActivity": None
            }}
        )

@router.post("/apikeys")
async def create_api_key(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create or regenerate API key"""
    raw_key = await create_or_update_api_key(db, user["userId"])
    
    return JSONResponse(
        status_code=201,
        content={
            "data": {
                "key": raw_key
            }
        }
    )

@router.get("/apikeys")
async def get_api_key_info(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get API key info (never return the actual key)"""
    api_key = await get_user_api_key(db, user["userId"])
    
    if not api_key:
        return JSONResponse(
            status_code=200,
            content={
                "data": None
            }
        )
    
    return JSONResponse(
        status_code=200,
        content={
            "data": {
                "id": str(api_key.id),
                "keyPreview": get_key_preview(api_key.key_hash),
                "createdAt": api_key.created_at.isoformat() if api_key.created_at else None
            }
        }
    )

@router.get("/models")
async def list_models():
    """List available free models"""
    return JSONResponse(
        status_code=200,
        content={
            "data": FREE_MODELS
        }
    )

@router.get("/apikeys/verify")
async def verify_api_key_endpoint(x_api_key: str = Header(None), db: AsyncSession = Depends(get_db)):
    """Verify an API key and return the user_id"""
    if not x_api_key:
        raise HTTPException(status_code=401, detail={"error": "Invalid API key"})
    
    # Hash the provided key
    from app.utils import hash_api_key
    key_hash = hash_api_key(x_api_key)
    
    # Look up the key in database
    from app.service import get_user_api_key_by_hash
    api_key = await get_user_api_key_by_hash(db, key_hash)
    
    if not api_key:
        raise HTTPException(status_code=401, detail={"error": "Invalid API key"})
    
    return JSONResponse(
        status_code=200,
        content={
            "data": {
                "userId": str(api_key.user_id)
            }
        }
    )
