"""
DeepLearner OS — FastAPI Backend Entry Point
"""
import os
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from routers import transkripsi, ringkasan, kuiz, nota, dokumen, progress, flashcard

app = FastAPI(
    title="DeepLearner OS API",
    description="AI-powered learning assistant backend — Transcription, Summarization, Quiz Generation",
    version="1.0.0"
)

# Allow React frontend to call this API
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174,http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(transkripsi.router, prefix="/api", tags=["Transkripsi"])
app.include_router(ringkasan.router, prefix="/api", tags=["Ringkasan"])
app.include_router(kuiz.router, prefix="/api", tags=["Kuiz"])
app.include_router(nota.router, prefix="/api", tags=["Nota"])
app.include_router(dokumen.router, prefix="/api", tags=["Dokumen PDF"])
app.include_router(progress.router, prefix="/api", tags=["Progress"])
app.include_router(flashcard.router, prefix="/api", tags=["Flashcard"])


@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/health/groq")
def health_groq():
    """Shows whether Groq (the primary LLM) is configured."""
    from services.groq_service import is_available, _GROQ_MODEL
    configured = is_available()
    return {
        "status": "ready" if configured else "offline",
        "provider": "groq",
        "model": _GROQ_MODEL,
        "configured": configured,
    }

# ── Serve built React frontend (only if dist/ exists) ────────────────────────
FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_react(full_path: str):
        """Catch-all: return index.html so React Router handles routing."""
        index = FRONTEND_DIST / "index.html"
        return FileResponse(index)
else:
    @app.get("/")
    def root():
        return {"message": "DeepLearner OS API is running 🚀 (run 'npm run build' in frontend/ to serve the UI)"}

