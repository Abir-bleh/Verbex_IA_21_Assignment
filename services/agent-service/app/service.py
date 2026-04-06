"""Service logic for agent-service"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError
from app.schema import Agent, APIKey
from app.utils import generate_api_key, hash_api_key, verify_api_key
from typing import Optional
import httpx
from app.config import settings

async def create_agent(
    db: AsyncSession, 
    user_id: str, 
    name: str, 
    system_prompt: str,
    temperature: float = 0.7,
    model: str = "stepfun-ai/step-3.5-flash:free",
    webhook_url: Optional[str] = None
) -> Agent:
    """Create a new agent"""
    agent = Agent(
        user_id=user_id,
        name=name,
        system_prompt=system_prompt,
        temperature=temperature,
        model=model,
        webhook_url=webhook_url
    )
    db.add(agent)
    await db.flush()  # Assign ID from DB without extra round trip
    await db.commit()
    return agent

async def get_agent(db: AsyncSession, agent_id: str) -> Agent:
    """Get agent by ID"""
    result = await db.execute(select(Agent).filter(Agent.id == agent_id))
    return result.scalar_one_or_none()

async def get_user_agents(db: AsyncSession, user_id: str) -> list:
    """Get all agents for a user"""
    result = await db.execute(select(Agent).filter(Agent.user_id == user_id))
    return result.scalars().all()

async def update_agent(db: AsyncSession, agent_id: str, user_id: str, **kwargs) -> Agent:
    """Update an agent"""
    agent = await get_agent(db, agent_id)
    if not agent or agent.user_id != user_id:
        return None
    
    for key, value in kwargs.items():
        if value is not None:
            setattr(agent, key, value)
    
    await db.commit()
    return agent

async def delete_agent(db: AsyncSession, agent_id: str, user_id: str) -> bool:
    """Delete an agent"""
    agent = await get_agent(db, agent_id)
    if not agent:
        return False
    
    # Convert both to strings for comparison to handle UUID/string mismatch
    if str(agent.user_id) != str(user_id):
        return False
    
    # Reuse the agent object already fetched above
    await db.delete(agent)
    await db.commit()
    return True

async def create_or_update_api_key(db: AsyncSession, user_id: str) -> str:
    """Create or regenerate API key for user"""
    # Delete existing key if any
    existing = await db.execute(select(APIKey).filter(APIKey.user_id == user_id))
    old_key = existing.scalar_one_or_none()
    if old_key:
        await db.delete(old_key)
    
    # Generate new key
    raw_key = generate_api_key()
    key_hash = hash_api_key(raw_key)
    
    api_key = APIKey(user_id=user_id, key_hash=key_hash)
    db.add(api_key)
    await db.commit()
    
    return raw_key

async def get_user_api_key(db: AsyncSession, user_id: str) -> APIKey:
    """Get API key for user"""
    result = await db.execute(select(APIKey).filter(APIKey.user_id == user_id))
    return result.scalar_one_or_none()

async def get_user_api_key_by_hash(db: AsyncSession, key_hash: str) -> APIKey:
    """Get API key by hash"""
    result = await db.execute(select(APIKey).filter(APIKey.key_hash == key_hash))
    return result.scalar_one_or_none()

async def verify_api_key_for_user(raw_key: str, user_id: str) -> bool:
    """Verify API key is valid for user"""
    # Called by auth-service to validate keys
    # This would require access to database, but for inter-service we'd
    # implement this differently in practice
    pass

async def get_agent_analytics(agent_id: str) -> dict:
    """Get agent analytics by calling chat-service"""
    try:
        from app.main import http_client
        if not http_client:
            print(f"HTTP client not available for analytics {agent_id}")
            return {
                "totalConversations": 0,
                "totalMessages": 0,
                "lastActivity": None
            }
        
        response = await http_client.get(
            f"{settings.chat_service_url}/analytics/{agent_id}",
            timeout=5
        )
        print(f"Analytics response status for {agent_id}: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            result = data.get("data", {})
            print(f"Analytics data for {agent_id}: {result}")
            return result
        else:
            print(f"Analytics endpoint returned {response.status_code} for {agent_id}: {response.text}")
    except Exception as e:
        print(f"Analytics fetch error for {agent_id}: {str(e)}")
        import traceback
        traceback.print_exc()
    
    return {
        "totalConversations": 0,
        "totalMessages": 0,
        "lastActivity": None
    }
