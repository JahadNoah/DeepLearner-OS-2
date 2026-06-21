"""
Groq Service — DeepLearner v2
Thin, reusable wrapper around the Groq Cloud Chat Completions API.

Groq is the PRIMARY LLM for DeepLearner's text tasks (summarization, quiz
generation, transcript cleaning). It is OpenAI-compatible and very fast.

Key rotation:
  Configure one or more API keys. If the primary key hits a rate-limit or
  quota error, the next key is tried automatically for that same request.

Config via .env:
  GROQ_API_KEY=gsk_...                       (required — get one at console.groq.com/keys)
  GROQ_API_KEY_2=gsk_...                     (optional fallback, used when the primary is exhausted)
  GROQ_MODEL=qwen/qwen3-32b                  (default if unset)

Vision/image tasks intentionally stay on Gemini (see multimodal_quiz_generator.py).
"""
import os

from dotenv import load_dotenv

load_dotenv()

# Ordered list of API keys: primary first, then any fallbacks.
_GROQ_KEYS = [
    k.strip() for k in (
        os.getenv("GROQ_API_KEY", ""),
        os.getenv("GROQ_API_KEY_2", ""),
    ) if k and k.strip()
]
_GROQ_MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3-32b")

# Cache one client per key (created lazily), keyed by the API key string.
_clients: dict[str, object] = {}


def _get_client(api_key: str):
    """Return a cached Groq client for this key, or None if the SDK is missing."""
    if api_key in _clients:
        return _clients[api_key]
    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        _clients[api_key] = client
        return client
    except ImportError:
        print("[groq_service] 'groq' package not installed. Run: pip install groq")
        return None
    except Exception as e:
        print(f"[groq_service] Failed to init Groq client: {e}")
        return None


def is_available() -> bool:
    """True if at least one Groq API key is configured (cheap, no network call)."""
    return bool(_GROQ_KEYS)


def _is_exhausted_error(e: Exception) -> bool:
    """
    Heuristic: does this error mean the current key is rate-limited or out of
    quota (so we should try the next key) rather than a genuine request error?
    """
    status = getattr(e, "status_code", None)
    if status in (429, 401, 403):
        return True
    msg = str(e).lower()
    return any(s in msg for s in (
        "rate limit", "rate_limit", "quota", "insufficient", "429",
        "too many requests", "exceeded",
    ))


def groq_chat(
    system_prompt: str,
    user_content: str,
    temperature: float = 0.3,
    max_tokens: int = 1200,
) -> str:
    """
    Send a single-turn chat completion to Groq and return the assistant text.

    Tries each configured API key in order. If a key is rate-limited or out of
    quota, the next key is attempted for the same request. Any other error (or
    running out of keys) returns "".

    Args:
        system_prompt: The system role instructions.
        user_content:  The user message content.
        temperature:   Sampling temperature (default 0.3).
        max_tokens:    Max tokens to generate (default 1200).

    Returns:
        The assistant's reply as a stripped string, or "" on any failure.
        Callers should treat "" as "Groq unavailable — fall back to the next strategy".
    """
    if not _GROQ_KEYS:
        return ""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]

    for idx, api_key in enumerate(_GROQ_KEYS):
        client = _get_client(api_key)
        if client is None:
            return ""  # SDK missing — no point trying other keys
        try:
            response = client.chat.completions.create(
                model=_GROQ_MODEL,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return (response.choices[0].message.content or "").strip()
        except Exception as e:
            if _is_exhausted_error(e) and idx < len(_GROQ_KEYS) - 1:
                print(f"[groq_service] Key #{idx + 1} exhausted ({e}) — trying next key.")
                continue
            print(f"[groq_service] Groq chat failed on key #{idx + 1}: {e}")
            return ""

    return ""
