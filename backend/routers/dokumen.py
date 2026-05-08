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
    filename_lower = dokumen.filename.lower()
    supported_types = (".pdf", ".txt")
    if not any(filename_lower.endswith(ext) for ext in supported_types):
        raise HTTPException(
            status_code=400,
            detail=f"Format fail '{dokumen.filename}' tidak disokong. Sila muat naik fail PDF atau TXT."
        )

    file_bytes = await dokumen.read()

    # MIME type guard — reject if browser sent a misleading content-type
    allowed_mimes = {"application/pdf", "text/plain", "application/octet-stream", ""}
    declared_mime = (dokumen.content_type or "").split(";")[0].strip()
    if declared_mime and declared_mime not in allowed_mimes:
        raise HTTPException(
            status_code=400,
            detail="MIME_NOT_SUPPORTED"
        )

    # File size guard — 20 MB max
    if len(file_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="FILE_TOO_LARGE")

    try:
        truncated = False
        # --- Handle plain text files ---
        if filename_lower.endswith(".txt"):
            try:
                extracted_text = file_bytes.decode("utf-8")
            except UnicodeDecodeError:
                extracted_text = file_bytes.decode("latin-1")
            page_count = 1
            pdf_url = ""
        else:
            # --- Handle PDF files ---
            result = extract_text_from_pdf(file_bytes)
            extracted_text = result["text"]
            page_count = result["pages"]

            # Upload PDF to Firebase Storage (optional — continues if Storage not set up)
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

        if not extracted_text or not extracted_text.strip():
            raise ValueError("PDF_NO_TEXT")

        # Text length cap — 50,000 chars
        truncated = False
        if len(extracted_text) > 50_000:
            extracted_text = extracted_text[:50_000]
            truncated = True

        # Save to transkripsi collection (same as audio — same flow after this)
        db = get_firestore()
        doc_ref = db.collection("transkripsi").document()
        doc_data = {
            "IDtranskripsi": doc_ref.id,
            "noMatrik": noMatrik,
            "failAudio": pdf_url,
            "teksPenuh": extracted_text,
            "bahasa": "teks" if filename_lower.endswith(".txt") else "pdf",
            "jilidMuka": page_count,
            "tarikhCipta": datetime.utcnow()
        }
        doc_ref.set(doc_data)

        response = {
            "IDtranskripsi": doc_ref.id,
            "teksPenuh": extracted_text,
            "bahasa": doc_data["bahasa"],
            "jilidMuka": page_count,
            "failAudio": pdf_url
        }
        if truncated:
            response["truncated"] = True
        return response

    except ValueError as e:
        code = str(e)
        if code == "PDF_NO_TEXT":
            raise HTTPException(status_code=422, detail="PDF_NO_TEXT")
        raise HTTPException(status_code=422, detail=code)
    except Exception as e:
        msg = str(e).lower()
        if any(k in msg for k in ("connection", "timeout", "unavailable", "refused")):
            raise HTTPException(status_code=503, detail="AI_SERVICE_UNAVAILABLE")
        raise HTTPException(status_code=500, detail=str(e))
