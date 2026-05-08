"""
Whisper + Malaya Transcription Service
Supports Bahasa Melayu (BM) and English audio files.
"""
import os
from dotenv import load_dotenv

load_dotenv()

_model = None

def get_whisper_model():
    global _model
    if _model is None:
        import whisper
        model_size = os.getenv("WHISPER_MODEL", "base")
        print(f"Loading Whisper model: {model_size}...")
        _model = whisper.load_model(model_size)
        print("Whisper model loaded ✓")
    return _model


def transcribe_audio(audio_path: str, language: str = None) -> dict:
    """
    Transcribes an audio file using OpenAI Whisper.
    
    Args:
        audio_path: Path to the audio file (.wav, .mp3, .m4a, etc.)
        language: ISO language code — "ms" for Malay, "en" for English, None for auto-detect
    
    Returns:
        dict with 'text' (full transcript) and 'language' (detected language)
    """
    model = get_whisper_model()

    # Whisper uses "ms" for Malay — let it auto-detect if not specified
    transcribe_options = {}
    if language:
        transcribe_options["language"] = language

    result = model.transcribe(audio_path, **transcribe_options)

    return {
        "text": result["text"].strip(),
        "language": result.get("language", "unknown"),
    }
