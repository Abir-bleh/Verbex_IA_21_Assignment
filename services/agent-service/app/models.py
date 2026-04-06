"""Pydantic models for agent-service"""
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal

class AgentCreate(BaseModel):
    name: str
    system_prompt: str
    temperature: Optional[Decimal] = 0.7
    model: Optional[str] = "stepfun-ai/step-3.5-flash:free"
    webhook_url: Optional[str] = None

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: Optional[Decimal] = None
    model: Optional[str] = None
    webhook_url: Optional[str] = None

class AgentResponse(BaseModel):
    id: str
    user_id: str
    name: str
    system_prompt: str
    temperature: Decimal
    model: str
    webhook_url: Optional[str]
    created_at: str

class APIKeyResponse(BaseModel):
    key: Optional[str] = None  # Only on creation
    hasKey: bool
    createdAt: Optional[str] = None

class SuccessResponse(BaseModel):
    data: dict | list

class AnalyticsResponse(BaseModel):
    totalConversations: int
    totalMessages: int
    lastActivity: Optional[str]

class FreeModel(BaseModel):
    label: str
    value: str
