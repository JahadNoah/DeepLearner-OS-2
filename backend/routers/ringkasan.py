"""
Ringkasan Router — POST /api/summarize
Takes a transcript ID, summarizes it, saves result to Firestore.
Supports optional SSE progress via job_id field.
"""
import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from firebase_config import get_firestore
from services.summarizer import summarize_text
from routers.progress import emit, emit_done, emit_error
from datetime import datetime

router = APIRouter()


class SummarizeRequest(BaseModel):
    IDtranskripsi: str
    noMatrik: str
    max_length: int = 300
    min_length: int = 80
    job_id: Optional[str] = None


@router.post("/summarize")
async def summarize(req: SummarizeRequest):
    """
    Takes a transcript ID, retrieves the transcript text from Firestore,
    runs the summarizer, and saves the result.
    """
    db = get_firestore()

    # Get transcript
    transcript_doc = db.collection("transkripsi").document(req.IDtranskripsi).get()
    if not transcript_doc.exists:
        raise HTTPException(status_code=404, detail="Transkripsi tidak dijumpai")

    transcript_data = transcript_doc.to_dict()
    transcript_text = transcript_data.get("teksPenuh", "")

    if not transcript_text:
        raise HTTPException(status_code=400, detail="Teks transkripsi kosong")

    if len(transcript_text) > 50_000:
        raise HTTPException(status_code=400, detail="TRANSCRIPT_TOO_LONG")

    async def _emit(event: str, data: dict):
        if req.job_id:
            await emit(req.job_id, event, data)

    try:
        await _emit("progress", {"step": "summarising", "label": "AI sedang meringkaskan..."})

        summary = await asyncio.to_thread(
            summarize_text,
            transcript_text,
            req.max_length,
            req.min_length,
        )

        await _emit("progress", {"step": "saving", "label": "Menyimpan ringkasan..."})

        # Save to Firestore
        doc_ref = db.collection("ringkasan").document()
        doc_data = {
            "idRingkasan": doc_ref.id,
            "IDtranskripsi": req.IDtranskripsi,
            "noMatrik": req.noMatrik,
            "teksRingkasan": summary,
            "tarikhCipta": datetime.utcnow()
        }
        doc_ref.set(doc_data)

        if req.job_id:
            await emit_done(req.job_id)

        return {
            "idRingkasan": doc_ref.id,
            "teksRingkasan": summary,
            "IDtranskripsi": req.IDtranskripsi
        }

    except Exception as e:
        if req.job_id:
            await emit_error(req.job_id, str(e))
        msg = str(e).lower()
        if any(k in msg for k in ("connection", "timeout", "unavailable", "refused")):
            raise HTTPException(status_code=503, detail="AI_SERVICE_UNAVAILABLE")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ringkasan/{idRingkasan}")
async def get_ringkasan(idRingkasan: str):
    """Retrieve a saved summary by its Firestore document ID."""
    db = get_firestore()
    doc = db.collection("ringkasan").document(idRingkasan).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Ringkasan tidak dijumpai")
    return doc.to_dict()
