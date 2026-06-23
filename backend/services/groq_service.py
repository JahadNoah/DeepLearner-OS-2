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
import re
import time

from dotenv import load_dotenv

load_dotenv()

# Transient-overload retry policy (per key): how many attempts and the base
# backoff in seconds (exponential: base, base*2, ...).
_MAX_ATTEMPTS = 3
_BACKOFF_BASE = 1.0

# Qwen3-32B is a reasoning model: it wraps its chain-of-thought in
# <think>...</think> before the actual answer. That reasoning must never reach
# the user (it would leak into transcripts, summaries, and quizzes). Strip it
# centrally here so every groq_chat consumer is protected.
_THINK_BLOCK_RE = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)


def _strip_reasoning(text: str) -> str:
    """Remove Qwen <think>...</think> reasoning, including truncated traces."""
    if not text:
        return text
    text = _THINK_BLOCK_RE.sub("", text)
    # Handle a response truncated mid-trace (max_tokens hit) or a stray tag:
    # keep only what follows a dangling </think>, and drop a dangling <think>.
    if "</think>" in text:
        text = text.rsplit("</think>", 1)[-1]
    if "<think>" in text:
        text = text.split("<think>", 1)[0]
    return text.strip()

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


def _is_overloaded_error(e: Exception) -> bool:
    """
    Heuristic: is this a transient server-side overload (the model is "over
    capacity", or a 5xx)? Groq's own message says to retry with backoff, so we
    retry the same key a few times before giving up / rotating. Without this,
    a brief capacity blip silently drops summaries/quizzes to the weaker
    extractive/NLP fallbacks.
    """
    status = getattr(e, "status_code", None)
    if status in (500, 502, 503, 529):
        return True
    msg = str(e).lower()
    return any(s in msg for s in (
        "over capacity", "overloaded", "internal_server_error",
        "503", "502", "529", "service unavailable", "try again",
    ))


def groq_transcribe(
    audio_path: str,
    language: str = None,
    model: str = None,
) -> dict:
    """
    Transcribe an audio file via Groq's hosted Whisper API (OpenAI-compatible).

    This is the PRIMARY transcription path for DeepLearner — no local torch /
    openai-whisper model is needed. The model id comes from WHISPER_MODEL in
    .env (e.g. "whisper-large-v3-turbo").

    Tries each configured API key in order, rotating to the next key on a
    rate-limit / quota error (same policy as groq_chat).

    Args:
        audio_path: Path to the audio file (.wav, .mp3, .m4a, .aiff, ...).
        language:   ISO-639-1 code ("ms", "en") or None to auto-detect.
        model:      Override the Groq Whisper model id (defaults to WHISPER_MODEL).

    Returns:
        dict with 'text' (full transcript) and 'language' (detected/used code).

    Raises:
        RuntimeError if no key is configured or the SDK is missing, or the
        underlying Groq error if every key fails. Callers map this to an HTTP error.
    """
    if not _GROQ_KEYS:
        raise RuntimeError("No Groq API key configured for transcription")

    model = model or os.getenv("WHISPER_MODEL", "whisper-large-v3-turbo")

    with open(audio_path, "rb") as f:
        audio_bytes = f.read()
    filename = os.path.basename(audio_path)

    last_err: Exception = None
    for idx, api_key in enumerate(_GROQ_KEYS):
        client = _get_client(api_key)
        if client is None:
            raise RuntimeError("'groq' package not installed — run: pip install groq")

        for attempt in range(_MAX_ATTEMPTS):
            try:
                kwargs = dict(
                    file=(filename, audio_bytes),
                    model=model,
                    response_format="verbose_json",  # includes detected language
                )
                if language:
                    kwargs["language"] = language
                resp = client.audio.transcriptions.create(**kwargs)
                text = (getattr(resp, "text", "") or "").strip()
                detected = getattr(resp, "language", None) or language or "unknown"
                return {"text": text, "language": detected}
            except Exception as e:
                last_err = e
                if _is_overloaded_error(e) and attempt < _MAX_ATTEMPTS - 1:
                    wait = _BACKOFF_BASE * (2 ** attempt)
                    print(f"[groq_service] Transcribe key #{idx + 1} overloaded ({e}) — retry {attempt + 1}/{_MAX_ATTEMPTS - 1} in {wait:.0f}s.")
                    time.sleep(wait)
                    continue
                if (_is_exhausted_error(e) or _is_overloaded_error(e)) and idx < len(_GROQ_KEYS) - 1:
                    print(f"[groq_service] Transcribe key #{idx + 1} unavailable ({e}) — trying next key.")
                    break  # move to next key
                print(f"[groq_service] Groq transcription failed on key #{idx + 1}: {e}")
                raise
    raise last_err or RuntimeError("Groq transcription failed")


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

        for attempt in range(_MAX_ATTEMPTS):
            try:
                response = client.chat.completions.create(
                    model=_GROQ_MODEL,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                return _strip_reasoning(response.choices[0].message.content or "")
            except Exception as e:
                # Transient overload ("over capacity" / 5xx): back off and retry
                # the SAME key — this is what Groq's error message asks for.
                if _is_overloaded_error(e) and attempt < _MAX_ATTEMPTS - 1:
                    wait = _BACKOFF_BASE * (2 ** attempt)
                    print(f"[groq_service] Key #{idx + 1} overloaded ({e}) — retry {attempt + 1}/{_MAX_ATTEMPTS - 1} in {wait:.0f}s.")
                    time.sleep(wait)
                    continue
                # Out of retries, or a different error. Rotate to the next key
                # if this looks like exhaustion or persistent overload.
                if (_is_exhausted_error(e) or _is_overloaded_error(e)) and idx < len(_GROQ_KEYS) - 1:
                    print(f"[groq_service] Key #{idx + 1} unavailable ({e}) — trying next key.")
                    break  # move to next key
                print(f"[groq_service] Groq chat failed on key #{idx + 1}: {e}")
                return ""

    return ""
