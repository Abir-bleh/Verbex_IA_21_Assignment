"""LLM integration with OpenRouter"""
from openai import AsyncOpenAI
from app.config import settings
import logging

logger = logging.getLogger(__name__)

OPENROUTER_API_KEY = settings.openrouter_api_key

client = AsyncOpenAI(
    api_key=OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1",
    default_headers={
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AI Agent Platform",
    }
)

async def generate_reply(messages: list, model: str, temperature: float) -> str:
    """
    Generate AI response from OpenRouter.
    messages = [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}]
    """
    try:
        logger.info(f"Requesting reply from model: {model}")
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
        )
        reply = response.choices[0].message.content.strip() or "No response"
        logger.info(f"Got reply from {model}: {reply[:50]}...")
        return reply
    except Exception as e:
        logger.warning(f"Error with model {model}: {str(e)}. Trying fallback model.")
        try:
            # Fallback to Claude 3 Haiku (fast and reliable)
            logger.info("Attempting fallback model: anthropic/claude-3-haiku")
            response = await client.chat.completions.create(
                model="anthropic/claude-3-haiku",
                messages=messages,
                temperature=temperature,
            )
            reply = response.choices[0].message.content.strip() or "No response"
            logger.info(f"Got reply from fallback model: {reply[:50]}...")
            return reply
        except Exception as e2:
            logger.error(f"Both models failed. Primary error: {str(e)}, Fallback error: {str(e2)}")
            return "I'm temporarily unavailable. Please try again in a moment."
