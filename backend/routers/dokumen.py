"""
Dokumen Router — POST /api/extract-pdf
Accepts a PDF/slide file, extracts text, saves to Firestore transkripsi collection.
The rest of the flow (summarize → quiz) works exactly the same as audio.
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from firebase_config import get_firestore, get_bucket
from services.pdf_extractor import extract_text_from_pdf
import uuid
from datetime import datetime

router = APIRouter()


@router.post("/extract-pdf")
async def extract_pdf(
    dokumen: UploadFile = File(...),
    noMatrik: str = Form(...)
):
    """
    Upload a PDF or slide file to extract text.
    Saves the extracted text to Firestore as a 'transkripsi' document
    so it feeds into the same summarize → quiz pipeline.
    """
    if not dokumen.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Hanya fail PDF (.pdf) yang disokong.")

    file_bytes = await dokumen.read()

    try:
        result = extract_text_from_pdf(file_bytes)
        extracted_text = result["text"]
        page_count = result["pages"]

        # Upload PDF to Firebase Storage (optional — continues even if Storage not set up)
        pdf_url = ""
        try:
            bucket = get_bucket()
            blob_name = f"dokumen/{noMatrik}/{uuid.uuid4()}.pdf"
            blob = bucket.blob(blob_name)
            blob.upload_from_string(file_bytes, content_type="application/pdf")
            blob.make_public()
            pdf_url = blob.public_url
        except Exception:
            pass  # Storage not configured — continue without file URL

        # Save to transkripsi collection (same as audio — same flow after this)
        db = get_firestore()
        doc_ref = db.collection("transkripsi").document()
        doc_data = {
            "IDtranskripsi": doc_ref.id,
            "noMatrik": noMatrik,
            "failAudio": pdf_url,
            "teksPenuh": extracted_text,
            "bahasa": "pdf",
            "jilidMuka": page_count,
            "tarikhCipta": datetime.utcnow()
        }
        doc_ref.set(doc_data)

        return {
            "IDtranskripsi": doc_ref.id,
            "teksPenuh": extracted_text,
            "bahasa": "pdf",
            "jilidMuka": page_count,
            "failAudio": pdf_url
        }

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
