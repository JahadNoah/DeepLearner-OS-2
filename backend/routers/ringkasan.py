"""
Ringkasan Router — POST /api/summarize
Takes a transcript ID, summarizes it, saves result to Firestore.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from firebase_config import get_firestore
from services.summarizer import summarize_text
from datetime import datetime

router = APIRouter()


class SummarizeRequest(BaseModel):
    IDtranskripsi: str
    noMatrik: str
    max_length: int = 300
    min_length: int = 80


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

    try:
        summary = summarize_text(
            transcript_text,
            max_length=req.max_length,
            min_length=req.min_length
        )

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

        return {
            "idRingkasan": doc_ref.id,
            "teksRingkasan": summary,
            "IDtranskripsi": req.IDtranskripsi
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ringkasan/{idRingkasan}")
async def get_ringkasan(idRingkasan: str):
    """Retrieve a saved summary by its Firestore document ID."""
    db = get_firestore()
    doc = db.collection("ringkasan").document(idRingkasan).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Ringkasan tidak dijumpai")
    return doc.to_dict()
