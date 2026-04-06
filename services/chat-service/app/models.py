"""Pydantic models for chat-service"""
from pydantic import BaseModel
from typing import Optional

class ChatRequest(BaseModel):
    agentId: str
    message: str
    conversationId: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str
    conversationId: str

class MessageData(BaseModel):
    role: str
    content: str
    createdAt: str

class ConversationData(BaseModel):
    id: str
    startedAt: str
    messageCount: int
    firstMessage: str

class SuccessResponse(BaseModel):
    data: dict | list
