# DeepLearner OS — System Architecture (v2)

> Paste-ready blueprint for D5 / D6 / D7 reports.
> Last updated: 2026-05-20

---

## 1. High-Level Overview

**DeepLearner OS** is an AI-powered learning assistant that takes student-provided lecture content (audio, video, image, PDF, or YouTube link) and produces three artefacts:

1. A cleaned **transcript** (transkripsi)
2. A structured **summary** (ringkasan)
3. A higher-order-thinking **quiz** (kuiz) with explanations

The system supports **Bahasa Melayu Malaysia (DBP standard)** and **English**, with automatic language detection and strict anti-Indonesian guardrails on all LLM output.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite 6, plain CSS (single `index.css`, 3000+ lines), `lucide-react` icons, custom i18n (EN/MS), Firebase Auth client |
| **Backend** | Python 3.11+, FastAPI, Uvicorn |
| **Auth & DB** | Firebase Authentication, Cloud Firestore (NoSQL) |
| **Speech-to-text** | OpenAI **Whisper** (local model, configurable size: `tiny` → `large`) |
| **LLM (primary)** | **Groq Cloud API** — currently `qwen/qwen3-32b` (Qwen3 32B); `llama-3.3-70b-versatile` as historical fallback |
| **Vision LLM** | **Google Gemini 1.5 Flash** — only for image input and OCR of scanned PDFs |
| **NLP fallback** | spaCy `en_core_web_sm` — entity recognition / keyword extraction for offline quiz generation |
| **Hosting** | Frontend on **Vercel**; backend run standalone (local / VPS / container) |

---

## 3. Backend Service Layout

```
backend/services/
├── groq_client.py                  Singleton wrapper around Groq SDK; chat() helper.
├── whisper_service.py              Whisper transcription for audio/video.
├── transcript_cleaner.py           LLM pass: fix grammar, punctuation, fillers — preserves
│                                   original language.
├── summarizer.py                   Multi-strategy summarizer:
│                                     A) Extractive (regex + sentence-scoring, no API)
│                                     B) Groq LLM (preferred)
│                                     C) T5-small (optional legacy)
├── quiz_generator.py               Multi-strategy MCQ generator:
│                                     A) NLP (spaCy + heuristic distractors + smart T/F)
│                                     B) Groq LLM (Bloom's Taxonomy levels 2–4)
│                                   + background explanation enrichment via LLM.
├── multimodal_quiz_generator.py    Routes: text → Groq, image → Gemini, PDF → OCR + Groq.
├── pdf_extractor.py                Native + OCR text extraction from PDFs.
└── text_utils.py                   Language detection (ms vs en), normalization, cleaning.
```

---

## 4. API Routes (FastAPI, `backend/routers/`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/transkripsi` | POST | Upload audio / video / YouTube / PDF / image → returns transcript |
| `/api/ringkasan`   | POST | Transcript text in → structured Markdown summary out |
| `/api/kuiz`        | POST | Summary in → list of MCQs (returns instantly, background-enriches explanations) |
| `/api/nota`        | GET / POST | CRUD for user notes |
| `/api/dokumen`     | POST | PDF document handling |
| `/api/progress`    | GET  | User progress dashboard data |
| `/health`          | GET  | Liveness probe |
| `/health/groq`     | GET  | LLM-readiness probe (reports active model) |

---

## 5. AI Processing Pipeline (End-to-End)

```
[User Upload]
    │
    ├── Audio/Video ─► Whisper (local) ─────────────► raw transcript
    ├── YouTube URL  ─► yt-dlp → Whisper ───────────► raw transcript
    ├── Image        ─► Gemini 1.5 Flash Vision ───► extracted text/concepts
    └── PDF          ─► native text OR OCR (Gemini) ► extracted text
                                  │
                                  ▼
              ┌──── transcript_cleaner (Groq Qwen3) ────┐
              │   • cleans fillers, punctuation         │
              │   • preserves original language          │
              └────────────────┬─────────────────────────┘
                               ▼
            ┌──── summarizer (Groq Qwen3) ────┐
            │   Strategy B (preferred):        │
            │     Structured Markdown summary  │
            │     with Pengenalan / Poin       │
            │     Utama / Kesimpulan sections  │
            │   Fallback: extractive regex     │
            └─────────────┬────────────────────┘
                          ▼
        ┌──── quiz_generator (Groq Qwen3) ────┐
        │   Strategy B: Bloom-level MCQ        │
        │     • definition                     │
        │     • cause-effect                   │
        │     • application                    │
        │     • comparison                     │
        │   4 plausible options + correct      │
        │   answer + penjelasan (reasoning)    │
        │   Fallback (Strategy A):             │
        │     spaCy + heuristic fill-in-blank, │
        │     smart entity-swap True/False     │
        │   Background LLM enrichment of       │
        │   penjelasan after response sent.    │
        └─────────────┬────────────────────────┘
                      ▼
           [Persisted in Firestore]
                      ▼
        [React frontend renders transcript /
         summary / quiz pages]
```

---

## 6. Language Handling

- **Auto-detect** language per document via `text_utils.detect_language()` → returns `"ms"` or `"en"`.
- All LLM prompts include **explicit guardrails** forcing Bahasa Melayu Malaysia (DBP standard) when input is BM:
  - Use `kerajaan` (not `pemerintah`), `wang` (not `uang`), `boleh` (not `bisa`), `sahaja` (not `saja`), `anda` (not `kalian`), `mengapa` (not `kenapa`), `bagaimana` (not `gimana`).
  - **No** Indonesian particles: `lho`, `deh`, `kok`, `sih`, `banget`, `nih`, `udah`, `gitu`.
- Frontend has full EN/MS i18n via `frontend/src/i18n/translations.js` + `useLanguage` context.

---

## 7. Data Model (Firestore Collections)

| Collection | Document Shape |
|-----------|----------------|
| `users/{uid}` | Profile, preferences (language, etc.) |
| `transkripsi/{id}` | Raw + cleaned transcript, source metadata, `ownerUid` |
| `ringkasan/{id}` | Markdown summary linked to a transcript |
| `kuiz/{id}` | One MCQ document: `soalan`, `pilihanJawapan[4]`, `jawapanBetul`, `penjelasan`, `status: "pending" \| "ready"` |
| `nota/{id}` | User-authored notes |
| `progress/{uid}/...` | Quiz attempts, scores |

---

## 8. Frontend Pages

| Page | Purpose |
|------|---------|
| `Landing.jsx` | Marketing splash (video background, glassmorphic) |
| `Login.jsx` / `Register.jsx` | Firebase Auth (glassmorphic split panel) |
| `Dashboard.jsx` | Workspace home (sidebar + main view) |
| `AudioInput.jsx` / `InputPage.jsx` | Upload audio / record / paste YouTube / upload PDF or image |
| `Transkrip.jsx` | View + edit cleaned transcript |
| `Ringkasan.jsx` | View summary |
| `Kuiz.jsx` | Take quiz, see explanations after submission |
| `Nota.jsx` | User notes |

All styles in a single `index.css`. The v2 redesign uses **glassmorphism** with a strict monochrome palette plus **Poppins** + **Source Serif 4** italic.

---

## 9. Key Architectural Decisions (v2 vs v1)

1. **Removed Ollama dependency.**
   v1 ran Llama 3 locally via Ollama. v2 moved to **Groq Cloud** for ~10× faster inference and zero local GPU requirement. The legacy `ollama_client.py` was deleted and replaced by `groq_client.py`.

2. **Switched primary LLM to Qwen3-32B.**
   Llama-3.3 occasionally drifted into Bahasa Indonesia on BM input. Qwen3-32B has substantially better Malaysian Malay coverage. The model is env-configurable (`GROQ_MODEL`), so swapping models is a single env var change.

3. **Multi-strategy fallbacks for every AI feature.**
   - Summarizer: Groq → T5 (optional) → extractive regex.
   - Quiz generator: Groq → spaCy/heuristic NLP.
   - This guarantees graceful degradation when the API is unavailable.

4. **Background enrichment pattern.**
   The quiz endpoint returns instantly with template explanations; high-quality LLM explanations are written into Firestore asynchronously and the frontend polls / streams the upgrade. Users never wait for the LLM round-trip.

5. **Multimodal routing.**
   - Text → Groq (cheap, fast).
   - Image → Gemini Vision (only model needed for visual content).
   - PDF → native extraction first, fall back to Gemini OCR only for scanned pages.

---

## 10. Deployment

### Frontend (Vercel)
- Automatic preview deploys per branch.
- `vercel.json` lives inside `frontend/`.
- Build: `npm run build` in `frontend/` (Vite 6 + `@tailwindcss/postcss`).

### Backend (standalone FastAPI)
- Started via `./dev.sh` or any uvicorn host.

### Required Environment Variables
| Var | Purpose |
|-----|---------|
| `GROQ_API_KEY` | Groq Cloud API key |
| `GROQ_MODEL` | LLM model id (default `qwen/qwen3-32b`) |
| `GEMINI_API_KEY` | Google Gemini API key (vision + OCR) |
| `FIREBASE_CREDENTIALS_PATH` | Path to service account JSON |
| `FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket name |
| `WHISPER_MODEL` | Whisper model size (`tiny` / `base` / `small` / `medium` / `large`) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |

---

## 11. Repository Layout

```
DeepLearner_OS/
├── backend/
│   ├── main.py                 FastAPI entry point + CORS + router registration
│   ├── firebase_config.py      Firestore client initialization
│   ├── dev.sh                  Local dev launcher
│   ├── requirements.txt
│   ├── .env.example
│   ├── routers/                FastAPI route handlers
│   │   ├── transkripsi.py
│   │   ├── ringkasan.py
│   │   ├── kuiz.py
│   │   ├── nota.py
│   │   ├── dokumen.py
│   │   └── progress.py
│   └── services/               Business logic / AI pipeline
│       ├── groq_client.py
│       ├── whisper_service.py
│       ├── transcript_cleaner.py
│       ├── summarizer.py
│       ├── quiz_generator.py
│       ├── multimodal_quiz_generator.py
│       ├── pdf_extractor.py
│       └── text_utils.py
└── frontend/
    ├── vercel.json
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── pages/              Landing, Login, Register, Dashboard, AudioInput,
        │                       InputPage, Transkrip, Ringkasan, Kuiz, Nota
        ├── components/         Sidebar, modals, shared UI
        ├── context/            useLanguage, AuthContext
        ├── i18n/translations.js
        └── index.css           All styles (3000+ lines, append-only convention)
```
