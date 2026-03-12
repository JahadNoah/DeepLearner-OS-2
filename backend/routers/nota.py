"""
Nota Router — manages saved learning sessions.
GET  /api/nota/{noMatrik}  — list all sessions
POST /api/nota             — save a new session
DELETE /api/nota/{idNota}  — delete a session
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from firebase_config import get_firestore
from datetime import datetime

router = APIRouter()


class NotaRequest(BaseModel):
    noMatrik: str
    tajuk: str
    IDtranskripsi: str
    idRingkasan: str


@router.get("/nota/{noMatrik}")
async def get_nota(noMatrik: str):
    """Get all saved sessions for a student."""
    db = get_firestore()
    docs = db.collection("nota").where("noMatrik", "==", noMatrik)\
             .order_by("tarikhSimpan", direction="DESCENDING").stream()
    results = [doc.to_dict() for doc in docs]
    return {"nota": results}


@router.post("/nota")
async def save_nota(req: NotaRequest):
    """Save a new learning session."""
    db = get_firestore()
    doc_ref = db.collection("nota").document()
    doc_data = {
        "idNota": doc_ref.id,
        "noMatrik": req.noMatrik,
        "tajuk": req.tajuk,
        "IDtranskripsi": req.IDtranskripsi,
        "idRingkasan": req.idRingkasan,
        "tarikhSimpan": datetime.utcnow()
    }
    doc_ref.set(doc_data)
    return {"idNota": doc_ref.id, "message": "Nota berjaya disimpan"}


@router.delete("/nota/{idNota}")
async def delete_nota(idNota: str):
    """Delete a saved session by ID."""
    db = get_firestore()
    doc_ref = db.collection("nota").document(idNota)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Nota tidak dijumpai")
    doc_ref.delete()
    return {"message": "Nota berjaya dipadam"}
