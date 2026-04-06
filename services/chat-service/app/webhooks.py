"""Webhook fire-and-forget functionality"""
import httpx
import asyncio

async def fire_webhook(webhook_url: str, agent_id: str, conversation_id: str):
    """Fire webhook without waiting for response"""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(
                webhook_url,
                json={"agentId": agent_id, "conversationId": conversation_id},
                headers={"Content-Type": "application/json"}
            )
    except Exception:
        pass  # silently ignore errors

def schedule_webhook(webhook_url: str, agent_id: str, conversation_id: str):
    """Schedule webhook to fire in background"""
    asyncio.create_task(fire_webhook(webhook_url, agent_id, conversation_id))
