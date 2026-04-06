"""Routes for chat-service"""
from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
from app.database import get_db
from app.models import ChatRequest, ChatResponse
from app.service import (
    create_conversation, get_conversation, save_message, get_conversation_messages,
    get_agent_public, verify_token, verify_api_key, get_agent_conversations,
    count_agent_messages, get_agent_last_activity, get_agent_by_id,
    get_all_conversations_with_messages
)
from app.llm import generate_reply
from app.webhooks import schedule_webhook
from app.config import settings

router = APIRouter()

@router.post("/chat")
async def chat(
    request: ChatRequest,
    x_api_key: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """Chat endpoint - accepts either public access or API key auth"""
    user_id = None
    
    # Check if API key is provided
    if x_api_key:
        # Verify API key and get user_id
        user_id = await verify_api_key(x_api_key, db)
        if not user_id:
            raise HTTPException(status_code=401, detail={"error": "Invalid API key"})
        
        # With API key, need to verify agent belongs to user or is public
        agent = await get_agent_by_id(db, request.agentId)
        if not agent:
            raise HTTPException(status_code=404, detail={"error": "Agent not found"})
        
        # API key user must own the agent
        if str(agent.user_id) != str(user_id):
            raise HTTPException(status_code=403, detail={"error": "Access denied"})
        
        agent_data = {
            "system_prompt": agent.system_prompt,
            "model": agent.model,
            "temperature": float(agent.temperature),
            "webhook_url": agent.webhook_url
        }
    else:
        # No API key - must be public agent
        agent_data = await get_agent_public(request.agentId)
        if not agent_data:
            raise HTTPException(status_code=404, detail={"error": "Agent not found"})
    
    # Get or create conversation
    if request.conversationId:
        conversation = await get_conversation(db, request.conversationId)
        if not conversation:
            raise HTTPException(status_code=404, detail={"error": "Conversation not found"})
    else:
        conversation = await create_conversation(db, request.agentId)
        # Fire webhook for new conversation (in background)
        if agent_data.get("webhook_url"):
            schedule_webhook(agent_data["webhook_url"], request.agentId, str(conversation.id))
    
    # Save user message
    await save_message(db, str(conversation.id), "user", request.message)
    
    # Get conversation history (last 10 messages)
    messages = await get_conversation_messages(db, str(conversation.id), limit=10)
    
    # Build messages array for LLM
    llm_messages = [
        {"role": "system", "content": agent_data.get("system_prompt", "You are a helpful assistant.")}
    ]
    
    for msg in messages:
        llm_messages.append({
            "role": msg.role,
            "content": msg.content
        })
    
    # Add the new user message
    llm_messages.append({
        "role": "user",
        "content": request.message
    })
    
    # Generate AI response
    ai_reply = await generate_reply(
        llm_messages,
        agent_data.get("model", "stepfun-ai/step-3.5-flash:free"),
        float(agent_data.get("temperature", 0.7))
    )
    
    # Save AI response
    await save_message(db, str(conversation.id), "assistant", ai_reply)
    
    return JSONResponse(
        status_code=200,
        content={
            "data": {
                "reply": ai_reply,
                "conversationId": str(conversation.id)
            }
        }
    )

@router.get("/conversations/{agent_id}")
async def get_conversations(
    agent_id: str,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """Get all conversations for an agent (requires auth)"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"error": "Unauthorized"})
    
    token = authorization.split(" ")[1]
    user = verify_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail={"error": "Unauthorized"})
    
    # Verify agent exists and ownership by querying database directly (no cross-service call)
    agent = await get_agent_by_id(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail={"error": "Agent not found"})
    
    # Verify user owns this agent (JWT stores user_id in "sub" field)
    user_id = user.get("sub")
    if str(agent.user_id) != str(user_id):
        raise HTTPException(status_code=403, detail={"error": "Access denied"})
    
    # Fetch all conversations with messages in a single query (no N+1)
    response_data = await get_all_conversations_with_messages(db, agent_id)
    
    return JSONResponse(
        status_code=200,
        content={"data": response_data}
    )

@router.get("/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """Get all messages in a conversation (requires auth)"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"error": "Unauthorized"})
    
    token = authorization.split(" ")[1]
    user = verify_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail={"error": "Unauthorized"})
    
    conversation = await get_conversation(db, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail={"error": "Conversation not found"})
    
    # Verify agent exists and fetch ownership info from database
    agent = await get_agent_by_id(db, str(conversation.agent_id))
    if not agent:
        raise HTTPException(status_code=403, detail={"error": "Access denied"})
    
    # Verify user owns this agent (JWT stores user_id in "sub" field)
    user_id = user.get("sub")
    if str(agent.user_id) != str(user_id):
        raise HTTPException(status_code=403, detail={"error": "Access denied"})
    
    messages = await get_conversation_messages(db, conversation_id, limit=100)
    
    response_data = [
        {
            "role": msg.role,
            "content": msg.content,
            "createdAt": msg.created_at.isoformat() if msg.created_at else None
        }
        for msg in messages
    ]
    
    return JSONResponse(
        status_code=200,
        content={"data": response_data}
    )

@router.get("/analytics/{agent_id}")
async def get_analytics(agent_id: str, db: AsyncSession = Depends(get_db)):
    """Get analytics for an agent (called by agent-service)"""
    try:
        conversations = await get_agent_conversations(db, agent_id)
        message_count = await count_agent_messages(db, agent_id)
        last_activity = await get_agent_last_activity(db, agent_id)
        
        print(f"Analytics for agent {agent_id}: convs={len(conversations)}, msgs={message_count}, last={last_activity}")
        
        return JSONResponse(
            status_code=200,
            content={
                "data": {
                    "totalConversations": len(conversations),
                    "totalMessages": message_count,
                    "lastActivity": last_activity
                }
            }
        )
    except Exception as e:
        print(f"Error in analytics endpoint for {agent_id}: {str(e)}")
        raise
