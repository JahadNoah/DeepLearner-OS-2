"""
Whisper Transcription Service — Groq backend.
Uses Groq's Whisper API (LPU-accelerated, ~200x real-time) instead of the
local CPU-bound openai-whisper package.

Supported audio formats: mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg, flac.
File size limit: 25 MB (Groq free tier) / 40 MB (paid).

Config via .env:
  GROQ_API_KEY=...
  WHISPER_MODEL=whisper-large-v3-turbo   (default; alternative: whisper-large-v3)
"""
import os
from dotenv import load_dotenv

load_dotenv()

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "whisper-large-v3-turbo")


def transcribe_audio(audio_path: str, language: str | None = None) -> dict:
    """
    Transcribes an audio file using Groq's Whisper API.

    Args:
        audio_path: Path to the audio file (.wav, .mp3, .m4a, etc.)
        language:   ISO-639-1 code ("ms" for Malay, "en" for English).
                    None lets the model auto-detect.

    Returns:
        {"text": <full transcript>, "language": <ISO code or "unknown">}

    Raises:
        RuntimeError if Groq is unreachable or the API rejects the request.
    """
    from services.groq_client import get_groq_client

    client, _ = get_groq_client()
    if client is None:
        raise RuntimeError(
            "Groq client unavailable — set GROQ_API_KEY in .env and "
            "install the groq package."
        )

    kwargs = {
        "file": (os.path.basename(audio_path), open(audio_path, "rb")),
        "model": WHISPER_MODEL,
        # verbose_json returns the detected language alongside the text
        "response_format": "verbose_json",
    }
    if language:
        kwargs["language"] = language

    try:
        response = client.audio.transcriptions.create(**kwargs)
    finally:
        kwargs["file"][1].close()

    text = getattr(response, "text", "") or ""
    detected = getattr(response, "language", None) or language or "unknown"

    return {
        "text": text.strip(),
        "language": detected,
    }
