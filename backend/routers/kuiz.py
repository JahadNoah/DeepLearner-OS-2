"""
Kuiz Router
  POST /api/generate-quiz            — text-only (from a saved summary)
  POST /api/generate-quiz-multimodal — text / image / text+image upload
"""
import asyncio
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from typing import Optional
from pydantic import BaseModel
from firebase_config import get_firestore
from services.quiz_generator import generate_quiz, enrich_and_save
from services.multimodal_quiz_generator import generate_multimodal_quiz
from datetime import datetime

router = APIRouter()


# ─── Schema ─────────────────────────────────────────────────────────────────
class QuizRequest(BaseModel):
    idRingkasan: str
    noMatrik: str
    num_questions: int = 5


# ─── Endpoint 1: Text-only quiz (from a saved summary) ──────────────────────
@router.post("/generate-quiz")
async def create_quiz(req: QuizRequest, background_tasks: BackgroundTasks):
    """
    Reads a saved ringkasan from Firestore, generates MCQ questions,
    and saves them back to the 'kuiz' collection.
    """
    db = get_firestore()

    summary_doc = db.collection("ringkasan").document(req.idRingkasan).get()
    if not summary_doc.exists:
        raise HTTPException(status_code=404, detail="Ringkasan tidak dijumpai")

    summary_text = summary_doc.to_dict().get("teksRingkasan", "")
    if not summary_text:
        raise HTTPException(status_code=400, detail="Teks ringkasan kosong")

    try:
        questions = await asyncio.to_thread(generate_quiz, summary_text, req.num_questions)
        if not questions:
            raise HTTPException(status_code=422, detail="Tidak cukup kandungan untuk menjana kuiz")

        batch = db.batch()
        saved_questions = []
        needs_enrichment = any(
            not q.get("penjelasan", "").strip() or
            "Jawapan betul ialah" in q.get("penjelasan", "") or
            "The correct answer is" in q.get("penjelasan", "")
            for q in questions
        )
        for q in questions:
            doc_ref = db.collection("kuiz").document()
            doc_data = {
                "idKuiz": doc_ref.id,
                "idRingkasan": req.idRingkasan,
                "noMatrik": req.noMatrik,
                "soalan": q["soalan"],
                "pilihanJawapan": q["pilihanJawapan"],
                "jawapanBetul": q["jawapanBetul"],
                "penjelasan": q.get("penjelasan", ""),
                "status": "enriching" if needs_enrichment else "ready",
                "tarikhCipta": datetime.utcnow(),
            }
            batch.set(doc_ref, doc_data)
            saved_questions.append(doc_data)
        batch.commit()

        if needs_enrichment:
            background_tasks.add_task(enrich_and_save, saved_questions, summary_text)

        return {"idRingkasan": req.idRingkasan, "soalanKuiz": saved_questions}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Endpoint: Quiz enrichment status ───────────────────────────────────────
@router.get("/quiz-status/{idRingkasan}")
async def quiz_status(idRingkasan: str):
    """Returns whether all quiz explanations for a summary are ready."""
    db = get_firestore()
    docs = db.collection("kuiz").where("idRingkasan", "==", idRingkasan).stream()
    items = [d.to_dict() for d in docs]
    if not items:
        return {"status": "not_found", "count": 0}
    # Treat missing "status" field (legacy docs) as "ready"
    all_ready = all(q.get("status", "ready") == "ready" for q in items)
    return {"status": "ready" if all_ready else "enriching", "count": len(items)}


# ─── Endpoint 2: Multimodal quiz (text and/or image upload) ─────────────────
@router.post("/generate-quiz-multimodal")
async def create_quiz_multimodal(
    noMatrik: str = Form(...),
    num_questions: int = Form(5),
    teks: Optional[str] = Form(None),
    imej: Optional[UploadFile] = File(None),
    idRingkasan: Optional[str] = Form(None),
):
    """
    Multimodal quiz generation endpoint.
    Accepts any combination of:
      - teks: raw text (lecture summary, notes)
      - imej: image file (slide, diagram, flowchart) — JPEG/PNG/WEBP/GIF
    At least one must be provided.
    Uses Gemini 1.5 Flash. Falls back to NLP strategy if Gemini is unavailable.
    """
    if not teks and not imej:
        raise HTTPException(
            status_code=400,
            detail="Sediakan sekurang-kurangnya satu input: teks atau imej."
        )

    image_bytes: Optional[bytes] = None
    image_mime: Optional[str] = None

    if imej:
        allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
        if imej.content_type not in allowed:
            raise HTTPException(
                status_code=415,
                detail="Format imej tidak disokong. Gunakan JPEG, PNG, WEBP, atau GIF."
            )
        image_bytes = await imej.read()
        image_mime = imej.content_type

    try:
        questions = await asyncio.to_thread(
            generate_multimodal_quiz,
            teks or "", image_bytes, image_mime, num_questions,
        )

        if not questions:
            raise HTTPException(
                status_code=422,
                detail="Tidak cukup kandungan untuk menjana kuiz daripada input yang diberikan."
            )

        db = get_firestore()
        batch = db.batch()
        saved_questions = []
        for q in questions:
            doc_ref = db.collection("kuiz").document()
            doc_data = {
                "idKuiz": doc_ref.id,
                "idRingkasan": idRingkasan or "",
                "noMatrik": noMatrik,
                "soalan": q["soalan"],
                "pilihanJawapan": q["pilihanJawapan"],
                "jawapanBetul": q["jawapanBetul"],
                "penjelasan": q.get("penjelasan", ""),
                "sumberInput": "multimodal",
                "tarikhCipta": datetime.utcnow(),
            }
            batch.set(doc_ref, doc_data)
            saved_questions.append(doc_data)
        batch.commit()

        return {"soalanKuiz": saved_questions}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
