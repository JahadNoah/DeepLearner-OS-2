"""
Chat Router
  POST /api/chat — grounded Q&A over a saved transcript ("chat with your notes")

Full-context grounding: the whole transcript is placed in the system prompt and
the model answers only from it. No embeddings / retrieval (documents comfortably
fit Qwen3-32B's context).
"""
import asyncio
from typing import List, Dict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from firebase_config import get_firestore
from services.groq_service import groq_chat_messages

router = APIRouter()

# Cap the grounding text so a very long transcript can't blow the context window
# (max transcript is ~50k chars; 48k keeps headroom for history + the answer).
_SOURCE_CHAR_BUDGET = 48000
# Defensive server-side cap on prior turns (the client already trims to ~6).
_MAX_HISTORY = 10

_STUDY_TUTOR_PROMPT = """You are a study tutor helping a student understand their own lecture notes.

Rules:
- Answer ONLY using the SOURCE NOTES below. Do not use outside knowledge.
- If the answer is not in the notes, say so plainly (do not invent an answer).
- When helpful, quote the relevant line(s) from the notes to support your answer.
- Be concise and clear. Use short paragraphs or bullet points.
- Reply in the SAME LANGUAGE as the student's question (Bahasa Melayu or English).
"""


class ChatRequest(BaseModel):
    IDtranskripsi: str
    noMatrik: str
    question: str
    history: List[Dict] = []


@router.post("/chat")
async def chat(req: ChatRequest):
    question = (req.question or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="Soalan kosong")

    db = get_firestore()
    doc = db.collection("transkripsi").document(req.IDtranskripsi).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Transkripsi tidak dijumpai")

    source = doc.to_dict().get("teksPenuh", "")
    if not source:
        raise HTTPException(status_code=400, detail="Teks transkripsi kosong")

    try:
        system_prompt = f"{_STUDY_TUTOR_PROMPT}\n\nSOURCE NOTES:\n{source[:_SOURCE_CHAR_BUDGET]}"
        messages = [{"role": "system", "content": system_prompt}]
        for item in req.history[-_MAX_HISTORY:]:
            role = item.get("role")
            text = (item.get("text") or "").strip()
            if role in ("user", "assistant") and text:
                messages.append({"role": role, "content": text})
        messages.append({"role": "user", "content": question})

        # Generous budget: Qwen3 spends part of its output on a (stripped) <think>
        # block, so a small cap truncates long answers mid-sentence.
        answer = await asyncio.to_thread(groq_chat_messages, messages, 0.3, 3000)
        if not answer:
            raise HTTPException(status_code=503, detail="Perkhidmatan AI tidak tersedia. Sila cuba lagi.")

        return {"answer": answer}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
