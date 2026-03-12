"""
DeepLearner OS — FastAPI Backend Entry Point
"""
import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import transkripsi, ringkasan, kuiz, nota, dokumen

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

@app.get("/")
def root():
    return {"message": "DeepLearner OS API is running 🚀"}
