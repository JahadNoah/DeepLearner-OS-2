"""
Transkripsi Router — POST /api/transcribe
Accepts an audio file, runs Whisper, saves result to Firestore.
Supports optional SSE progress via job_id form field.
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from firebase_config import get_firestore, get_bucket
from services.whisper_service import transcribe_audio
from services.transcript_cleaner import clean_transcript
from routers.progress import emit, emit_done, emit_error
import tempfile
import os
import uuid
from datetime import datetime

router = APIRouter()


@router.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    noMatrik: str = Form(...),
    language: str = Form(default=None),  # "ms" | "en" | None for auto-detect
    job_id: str = Form(default=None),    # optional SSE job ID
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

    async def _emit(event: str, data: dict):
        if job_id:
            await emit(job_id, event, data)

    try:
        await _emit("progress", {"step": "transcribing", "label": "Mentranskrip audio..."})

        # Run Whisper transcription
        result = transcribe_audio(tmp_path, language=language if language else None)

        await _emit("progress", {"step": "cleaning", "label": "Membersihkan teks..."})
        transcript_text = clean_transcript(result["text"])
        detected_lang = result["language"]

        await _emit("progress", {"step": "saving", "label": "Menyimpan transkripsi..."})

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

        if job_id:
            await emit_done(job_id)

        return {
            "IDtranskripsi": doc_ref.id,
            "teksPenuh": transcript_text,
            "bahasa": detected_lang,
            "failAudio": audio_url
        }

    except Exception as e:
        if job_id:
            await emit_error(job_id, str(e))
        msg = str(e).lower()
        if any(k in msg for k in ("duration", "too long", "exceeds", "terlalu panjang")):
            raise HTTPException(status_code=422, detail="AUDIO_TOO_LONG")
        if any(k in msg for k in ("format", "codec", "invalid", "unsupported", "decode")):
            raise HTTPException(status_code=415, detail="AUDIO_FORMAT_INVALID")
        if any(k in msg for k in ("connection", "timeout", "unavailable", "refused")):
            raise HTTPException(status_code=503, detail="AI_SERVICE_UNAVAILABLE")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.unlink(tmp_path)
