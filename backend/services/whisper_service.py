"""
Transcription Service — Bahasa Melayu (BM) + English.

PRIMARY path: Groq's hosted Whisper API (whisper-large-v3-turbo). No local
torch / openai-whisper model is downloaded or loaded — fast and lightweight.

FALLBACK path: local openai-whisper. Only used if Groq is unavailable AND
USE_LOCAL_WHISPER=true, or as a last resort when no Groq key is configured.
The local path imports torch/whisper lazily, so torch is never touched unless
this fallback actually runs.
"""
import os
from dotenv import load_dotenv

from services.groq_service import groq_transcribe, is_available as groq_available

load_dotenv()

_model = None


def transcribe_audio(audio_path: str, language: str = None) -> dict:
    """
    Transcribe an audio file. Uses Groq hosted Whisper by default.

    Args:
        audio_path: Path to the audio file (.wav, .mp3, .m4a, .aiff, etc.)
        language: ISO-639-1 code — "ms" for Malay, "en" for English, None for auto-detect

    Returns:
        dict with 'text' (full transcript) and 'language' (detected language)
    """
    force_local = os.getenv("USE_LOCAL_WHISPER", "false").lower() == "true"

    # Local Whisper (torch) is opt-in only. It is NOT used as an automatic
    # fallback because a Groq error is usually a real, reportable problem
    # (bad audio format, file too large, network) that should surface to the
    # user — silently loading torch would hang on low-memory machines and
    # hide the actual cause.
    if force_local or not groq_available():
        return _transcribe_local(audio_path, language=language)

    return groq_transcribe(audio_path, language=language)


def _get_whisper_model():
    """Lazily load the local Whisper model (imports torch only when called)."""
    global _model
    if _model is None:
        import whisper  # heavy: pulls in torch — kept lazy on purpose
        # A Groq model id like "whisper-large-v3-turbo" is NOT a valid local
        # model name, so fall back to a sensible local default.
        model_size = os.getenv("LOCAL_WHISPER_MODEL", "base")
        print(f"Loading local Whisper model: {model_size}...")
        _model = whisper.load_model(model_size)
        print("Local Whisper model loaded ✓")
    return _model


def _transcribe_local(audio_path: str, language: str = None) -> dict:
    """Local openai-whisper transcription (fallback). Requires torch."""
    model = _get_whisper_model()

    transcribe_options = {}
    if language:
        transcribe_options["language"] = language

    result = model.transcribe(audio_path, **transcribe_options)

    return {
        "text": result["text"].strip(),
        "language": result.get("language", "unknown"),
    }
