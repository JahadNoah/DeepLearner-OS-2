"""
Groq Client — DeepLearner v2
Thin wrapper around the Groq Python SDK with a singleton client and a
synchronous chat helper. Used by summarizer, quiz_generator,
multimodal_quiz_generator (text-only), and transcript_cleaner.

Config via .env:
  GROQ_API_KEY=...                            (required)
  GROQ_MODEL=llama-3.3-70b-versatile          (text reasoning, default)
"""
import os
import threading
from typing import Optional, Tuple
from dotenv import load_dotenv

load_dotenv()

_GROQ_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

_client = None
_client_lock = threading.Lock()


def get_groq_client() -> Tuple[Optional[object], Optional[str]]:
    """Returns (client, model) or (None, None) if Groq is unavailable."""
    global _client
    if _client is not None:
        return _client, GROQ_MODEL

    if not _GROQ_KEY:
        return None, None

    with _client_lock:
        if _client is not None:
            return _client, GROQ_MODEL
        try:
            from groq import Groq
            _client = Groq(api_key=_GROQ_KEY)
        except ImportError:
            print("[groq] 'groq' package not installed. Run: pip install groq")
            return None, None
        except Exception as e:
            print(f"[groq] Failed to initialize client: {type(e).__name__}: {e}")
            return None, None

    return _client, GROQ_MODEL


def chat(
    system_prompt: str,
    user_prompt: str,
    *,
    temperature: float = 0.3,
    max_tokens: int = 2048,
) -> str:
    """
    Synchronous chat completion. Returns the assistant text content,
    or '' on any failure (so callers can fall back gracefully).
    """
    client, model = get_groq_client()
    if not client:
        return ""

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature=temperature,
            max_completion_tokens=max_tokens,
        )
        content = response.choices[0].message.content
        return content.strip() if content else ""
    except Exception as e:
        print(f"[groq] chat failed: {type(e).__name__}: {e}")
        return ""
