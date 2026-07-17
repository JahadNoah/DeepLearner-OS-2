"""
Study Pack Router
  POST /api/study — generate one study artifact (guide | timeline | glossary | faq)
                    from a saved transcript. Stateless; the client caches results.
"""
import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from firebase_config import get_firestore
from services.study_generator import (
    generate_study_guide,
    generate_timeline,
    generate_glossary,
    generate_faq,
)

router = APIRouter()

_GENERATORS = {
    "guide": generate_study_guide,
    "timeline": generate_timeline,
    "glossary": generate_glossary,
    "faq": generate_faq,
}


class StudyRequest(BaseModel):
    IDtranskripsi: str
    noMatrik: str
    type: str


@router.post("/study")
async def study(req: StudyRequest):
    gen = _GENERATORS.get(req.type)
    if gen is None:
        raise HTTPException(status_code=400, detail=f"Jenis tidak sah: {req.type}")

    db = get_firestore()
    doc = db.collection("transkripsi").document(req.IDtranskripsi).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Transkripsi tidak dijumpai")

    source = doc.to_dict().get("teksPenuh", "")
    if not source:
        raise HTTPException(status_code=400, detail="Teks transkripsi kosong")

    try:
        content = await asyncio.to_thread(gen, source)
        # The study guide is free text: empty means the model failed.
        # timeline/glossary/faq may legitimately be [] (e.g. non-chronological source).
        if req.type == "guide" and not content:
            raise HTTPException(status_code=503, detail="Perkhidmatan AI tidak tersedia. Sila cuba lagi.")
        return {"type": req.type, "content": content}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
