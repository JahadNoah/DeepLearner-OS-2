"""
Flashcard Router
  POST /api/generate-flashcards — generate SM-2 flashcards from a saved summary
"""
import asyncio
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from firebase_config import get_firestore
from services.flashcard_generator import generate_flashcards

router = APIRouter()


# ─── Schema ─────────────────────────────────────────────────────────────────
class FlashcardRequest(BaseModel):
    idRingkasan: str
    noMatrik: str
    num_cards: int = 10


# ─── Endpoint: generate flashcards from a saved summary ─────────────────────
@router.post("/generate-flashcards")
async def create_flashcards(req: FlashcardRequest):
    """
    Reads a saved ringkasan from Firestore, generates study flashcards, and
    saves them to the 'kadImbas' collection with initial SM-2 state
    (due immediately). SM-2 rescheduling happens client-side on review.
    """
    db = get_firestore()

    summary_doc = db.collection("ringkasan").document(req.idRingkasan).get()
    if not summary_doc.exists:
        raise HTTPException(status_code=404, detail="Ringkasan tidak dijumpai")

    summary_text = summary_doc.to_dict().get("teksRingkasan", "")
    if not summary_text:
        raise HTTPException(status_code=400, detail="Teks ringkasan kosong")

    try:
        cards = await asyncio.to_thread(generate_flashcards, summary_text, req.num_cards)
        if not cards:
            raise HTTPException(status_code=422, detail="Tidak cukup kandungan untuk menjana kad imbas")

        now = datetime.utcnow()
        batch = db.batch()
        saved_cards = []
        for c in cards:
            doc_ref = db.collection("kadImbas").document()
            doc_data = {
                "idKad": doc_ref.id,
                "idRingkasan": req.idRingkasan,
                "noMatrik": req.noMatrik,
                "soalan": c["soalan"],
                "jawapan": c["jawapan"],
                # SM-2 state — due immediately (nextReview = now)
                "easeFactor": 2.5,
                "interval": 0,
                "repetitions": 0,
                "nextReview": now,
                "tarikhCipta": now,
            }
            batch.set(doc_ref, doc_data)
            saved_cards.append(doc_data)
        batch.commit()

        return {"idRingkasan": req.idRingkasan, "kadImbas": saved_cards}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
