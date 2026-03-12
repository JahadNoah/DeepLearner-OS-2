"""
PDF / Slide Text Extraction Service
Extracts text from PDF files (lecture notes, slides, etc.)
Strategy 1: pdfplumber (text-based PDFs)
Strategy 2: PyMuPDF (text-based PDFs, wider format support)
Strategy 3: Gemini Vision OCR (scanned/image-based PDFs)
"""
import io
import os
import base64
import pdfplumber
import fitz  # PyMuPDF
from dotenv import load_dotenv

load_dotenv()


def _ocr_with_gemini(file_bytes: bytes, total_pages: int) -> str:
    """Render each PDF page as an image and OCR via Gemini Vision."""
    import google.generativeai as genai

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    extracted = []

    # Limit to first 20 pages to avoid token/time overrun
    pages_to_process = min(doc.page_count, 20)

    for i in range(pages_to_process):
        page = doc[i]
        # Render at 150 DPI — good quality / reasonable size balance
        mat = fitz.Matrix(150 / 72, 150 / 72)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img_bytes = pix.tobytes("jpeg")
        img_b64 = base64.b64encode(img_bytes).decode()

        response = model.generate_content([
            {
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": img_b64
                }
            },
            "Extract ALL text from this image exactly as it appears. "
            "Return only the extracted text, no commentary."
        ])
        text = response.text.strip() if response.text else ""
        if text:
            extracted.append(f"[Halaman {i + 1}]\n{text}")

    doc.close()
    return "\n\n".join(extracted)


def extract_text_from_pdf(file_bytes: bytes) -> dict:
    """
    Extracts all text from a PDF file.
    Tries pdfplumber → PyMuPDF → Gemini Vision OCR.
    """
    # --- Strategy 1: pdfplumber ---
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            total_pages = len(pdf.pages)
            extracted = []
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text and text.strip():
                    extracted.append(f"[Halaman {i + 1}]\n{text.strip()}")
            full_text = "\n\n".join(extracted)
            if full_text.strip():
                return {"text": full_text, "pages": total_pages, "method": "pdfplumber"}
    except Exception:
        pass

    # --- Strategy 2: PyMuPDF fallback ---
    total_pages = 1
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        total_pages = doc.page_count
        extracted = []
        for i in range(total_pages):
            text = doc[i].get_text()
            if text and text.strip():
                extracted.append(f"[Halaman {i + 1}]\n{text.strip()}")
        doc.close()
        full_text = "\n\n".join(extracted)
        if full_text.strip():
            return {"text": full_text, "pages": total_pages, "method": "pymupdf"}
    except Exception:
        pass

    # --- Strategy 3: Gemini Vision OCR (scanned/image PDFs) ---
    try:
        ocr_text = _ocr_with_gemini(file_bytes, total_pages)
        if ocr_text.strip():
            return {"text": ocr_text, "pages": total_pages, "method": "gemini-ocr"}
    except Exception:
        pass

    raise ValueError(
        "PDF ini tidak mengandungi teks yang boleh diekstrak. "
        "Pastikan GEMINI_API_KEY dikonfigurasi untuk menyokong PDF imbasan/imej."
    )

