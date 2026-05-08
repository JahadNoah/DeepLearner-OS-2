"""
Ollama Auto-Switch Client — DeepLearner v2
Automatically detects whether to use the remote tunnel or local Ollama.

Probes the tunnel first (likely more powerful GPU server), falls back to
localhost. Caches the working endpoint for 60s to avoid repeated probing.

Config via .env:
  OLLAMA_TUNNEL=https://ollama.warisanqna.uk   (remote server)
  OLLAMA_LOCAL=http://localhost:11434            (local fallback)
  OLLAMA_MODEL=qwen2.5:7b
"""
import os
import time
import threading
from dotenv import load_dotenv

load_dotenv()

_TUNNEL_HOST = os.getenv("OLLAMA_TUNNEL", os.getenv("OLLAMA_HOST", "https://ollama.warisanqna.uk"))
_LOCAL_HOST = os.getenv("OLLAMA_LOCAL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:8b")

# Cache: (host_url, timestamp)
_cache_lock = threading.Lock()
_cached_host: str | None = None
_cached_at: float = 0.0
_CACHE_TTL = 60.0  # seconds


def _probe(host: str, timeout: float = 3.0) -> bool:
    """Check if an Ollama server is reachable."""
    try:
        import httpx
        r = httpx.get(f"{host.rstrip('/')}/api/tags", timeout=timeout,
                      headers={"ngrok-skip-browser-warning": "true"})
        return r.status_code == 200
    except Exception:
        return False


def probe_model(host: str, model: str, timeout: float = 10.0) -> bool:
    """Check that the specific model is listed in /api/tags on the given host."""
    try:
        import httpx
        r = httpx.get(f"{host.rstrip('/')}/api/tags", timeout=timeout,
                      headers={"ngrok-skip-browser-warning": "true"})
        if r.status_code != 200:
            return False
        tags = r.json().get("models", [])
        model_base = model.split(":")[0].lower()
        return any(m.get("name", "").lower().startswith(model_base) for m in tags)
    except Exception:
        return False


def _resolve_host() -> str | None:
    """Probe local only — tunnel is disabled."""
    if _probe(_LOCAL_HOST):
        return _LOCAL_HOST
    return None


def get_ollama_host() -> str | None:
    """
    Returns the URL of a reachable Ollama server, or None if both are down.
    Result is cached for 60s.
    """
    global _cached_host, _cached_at

    with _cache_lock:
        if _cached_host and (time.time() - _cached_at) < _CACHE_TTL:
            return _cached_host

    host = _resolve_host()

    with _cache_lock:
        _cached_host = host
        _cached_at = time.time()

    if host:
        label = "tunnel" if host == _TUNNEL_HOST else "local"
        print(f"[ollama] Using {label}: {host}")
    else:
        print("[ollama] Both tunnel and local are unreachable")

    return host


def get_ollama_client():
    """
    Returns (client, model) tuple or (None, None) if Ollama is unreachable.
    """
    host = get_ollama_host()
    if not host:
        return None, None

    import ollama as _ollama
    client = _ollama.Client(
        host=host,
        headers={"ngrok-skip-browser-warning": "true"},
    )
    return client, OLLAMA_MODEL


def invalidate_cache():
    """Force re-probe on next call (e.g. after a connection error)."""
    global _cached_host, _cached_at
    with _cache_lock:
        _cached_host = None
        _cached_at = 0.0
