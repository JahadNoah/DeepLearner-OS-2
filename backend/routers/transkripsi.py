"""
Transkripsi Router — POST /api/transcribe
Accepts an audio file, runs Whisper, saves result to Firestore.
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from firebase_config import get_firestore, get_bucket
from services.whisper_service import transcribe_audio
from services.transcript_cleaner import clean_transcript
import tempfile
import os
import uuid
from datetime import datetime

router = APIRouter()


@router.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    noMatrik: str = Form(...),
    language: str = Form(default=None)  # "ms" | "en" | None for auto-detect
):
    """
    Upload an audio file to transcribe.
    Returns the full transcript text and saves it to Firestore.
    """
    # Save uploaded file to a temp location
    suffix = os.path.splitext(audio.filename)[-1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Run Whisper transcription
        result = transcribe_audio(tmp_path, language=language if language else None)
        transcript_text = clean_transcript(result["text"])  # Ollama cleans noise/fillers
        detected_lang = result["language"]

        # Upload audio to Firebase Storage (optional — continues if Storage not set up)
        audio_url = ""
        try:
            bucket = get_bucket()
            blob_name = f"audio/{noMatrik}/{uuid.uuid4()}{suffix}"
            blob = bucket.blob(blob_name)
            blob.upload_from_filename(tmp_path, content_type=audio.content_type)
            blob.make_public()
            audio_url = blob.public_url
        except Exception:
            pass  # Storage not configured — continue without file URL

        # Save transcript to Firestore
        db = get_firestore()
        doc_ref = db.collection("transkripsi").document()
        doc_data = {
            "IDtranskripsi": doc_ref.id,
            "noMatrik": noMatrik,
            "failAudio": audio_url,
            "teksPenuh": transcript_text,
            "bahasa": detected_lang,
            "tarikhCipta": datetime.utcnow()
        }
        doc_ref.set(doc_data)

        return {
            "IDtranskripsi": doc_ref.id,
            "teksPenuh": transcript_text,
            "bahasa": detected_lang,
            "failAudio": audio_url
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.unlink(tmp_path)
