"""Service logic for chat-service"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from app.schema import Conversation, Message, Agent, APIKey
from app.config import settings
import httpx
from typing import Optional, List
import uuid as uuid_lib
import hashlib
from jose import JWTError, jwt

async def convert_to_uuid(agent_id: str):
    """Convert string to UUID"""
    try:
        if isinstance(agent_id, str):
            return uuid_lib.UUID(agent_id)
        else:
            return agent_id
    except (ValueError, TypeError):
        return agent_id

async def get_agent_by_id(db: AsyncSession, agent_id: str) -> Agent:
    """Get agent directly from database (no cross-service call)"""
    agent_uuid = await convert_to_uuid(agent_id)
    result = await db.execute(select(Agent).filter(Agent.id == agent_uuid))
    return result.scalar_one_or_none()

def hash_api_key(key: str) -> str:
    """Hash API key using SHA-256"""
    return hashlib.sha256(key.encode()).hexdigest()

async def get_agent_public(agent_id: str) -> dict:
    """Call agent-service to get public agent data using shared HTTP client"""
    try:
        from app.main import http_client
        if not http_client:
            return None
        
        response = await http_client.get(
            f"{settings.agent_service_url}/agents/public/{agent_id}",
            timeout=5
        )
        if response.status_code == 200:
            return response.json()["data"]
    except Exception:
        pass
    
    return None

async def create_conversation(db: AsyncSession, agent_id: str) -> Conversation:
    """Create a new conversation"""
    agent_uuid = await convert_to_uuid(agent_id)
    conversation = Conversation(agent_id=agent_uuid)
    db.add(conversation)
    await db.flush()  # Assign ID from DB without extra round trip
    await db.commit()
    return conversation

async def get_conversation(db: AsyncSession, conversation_id: str) -> Conversation:
    """Get conversation by ID"""
    result = await db.execute(select(Conversation).filter(Conversation.id == conversation_id))
    return result.scalar_one_or_none()

async def save_message(
    db: AsyncSession,
    conversation_id: str,
    role: str,
    content: str
) -> Message:
    """Save message to database"""
    message = Message(conversation_id=conversation_id, role=role, content=content)
    db.add(message)
    await db.flush()  # Assign ID without extra DB roundtrip
    await db.commit()  # Persist changes
    return message

async def get_conversation_messages(db: AsyncSession, conversation_id: str, limit: int = 10) -> list:
    """Get last N messages from a conversation"""
    result = await db.execute(
        select(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
        .limit(limit)
    )
    return result.scalars().all()

def verify_token(token: str) -> Optional[dict]:
    """Verify JWT locally without calling auth-service"""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.algorithm]
        )
        return payload
    except JWTError:
        return None

async def verify_api_key(key: str, db: AsyncSession = None) -> Optional[str]:
    """Verify API key and get user_id - queries database directly"""
    if not db:
        # Fallback to cross-service call if no db connection provided
        try:
            from app.main import http_client
            if not http_client:
                return None
            
            response = await http_client.get(
                f"{settings.agent_service_url}/apikeys/verify",
                headers={"x-api-key": key}
            )
            if response.status_code == 200:
                return response.json()["data"].get("userId")
        except Exception:
            pass
        return None
    
    # Hash the provided key
    key_hash = hash_api_key(key)
    
    # Query database for matching key
    result = await db.execute(
        select(APIKey).filter(APIKey.key_hash == key_hash)
    )
    api_key_record = result.scalar_one_or_none()
    
    if api_key_record:
        return str(api_key_record.user_id)
    
    return None

async def get_agent_conversations(db: AsyncSession, agent_id: str) -> list:
    """Get all conversations for an agent"""
    agent_uuid = await convert_to_uuid(agent_id)
    result = await db.execute(
        select(Conversation)
        .filter(Conversation.agent_id == agent_uuid)
        .order_by(Conversation.started_at.desc())
    )
    return result.scalars().all()

async def get_all_conversations_with_messages(db: AsyncSession, agent_id: str) -> List[dict]:
    """Get all conversations with their messages in a single query (no N+1)"""
    agent_uuid = await convert_to_uuid(agent_id)
    
    # Fetch conversations with eager-loaded messages
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .filter(Conversation.agent_id == agent_uuid)
        .order_by(Conversation.started_at.desc())
    )
    conversations = result.scalars().all()
    
    # Format response data
    response_data = []
    for conv in conversations:
        first_message = ""
        message_count = len(conv.messages) if conv.messages else 0
        
        if conv.messages:
            # Get first user message
            for msg in conv.messages:
                if msg.role == "user":
                    first_message = msg.content[:100]  # First 100 chars
                    break
        
        response_data.append({
            "id": str(conv.id),
            "startedAt": conv.started_at.isoformat() if conv.started_at else None,
            "messageCount": message_count,
            "firstMessage": first_message
        })
    
    return response_data

async def count_agent_messages(db: AsyncSession, agent_id: str) -> int:
    """Count total messages for an agent"""
    agent_uuid = await convert_to_uuid(agent_id)
    result = await db.execute(
        select(func.count(Message.id))
        .join(Conversation, Conversation.id == Message.conversation_id)
        .filter(Conversation.agent_id == agent_uuid)
    )
    return result.scalar() or 0

async def get_agent_last_activity(db: AsyncSession, agent_id: str) -> Optional[str]:
    """Get last activity timestamp for an agent"""
    agent_uuid = await convert_to_uuid(agent_id)
    result = await db.execute(
        select(Message.created_at)
        .join(Conversation, Conversation.id == Message.conversation_id)
        .filter(Conversation.agent_id == agent_uuid)
        .order_by(Message.created_at.desc())
        .limit(1)
    )
    activity = result.scalar()
    return activity.isoformat() if activity else None
