# Graph Report - .  (2026-06-21)

## Corpus Check
- Large corpus: 77 files · ~1,084,719 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 463 nodes · 758 edges · 28 communities (20 shown, 8 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_FastAPI API Endpoints|FastAPI API Endpoints]]
- [[_COMMUNITY_Ollama LLM Client|Ollama LLM Client]]
- [[_COMMUNITY_Firebase Backend Init|Firebase Backend Init]]
- [[_COMMUNITY_Transcription Pipeline|Transcription Pipeline]]
- [[_COMMUNITY_PDFFile Extraction|PDF/File Extraction]]
- [[_COMMUNITY_Summarizer Service|Summarizer Service]]
- [[_COMMUNITY_System Design Doc|System Design Doc]]
- [[_COMMUNITY_FastAPI App & Health|FastAPI App & Health]]
- [[_COMMUNITY_Firebase Config Rules|Firebase Config Rules]]
- [[_COMMUNITY_Frontend LintBuild Config|Frontend Lint/Build Config]]
- [[_COMMUNITY_React ThemeLanguage Context|React Theme/Language Context]]
- [[_COMMUNITY_Input Page UI (screens)|Input Page UI (screens)]]
- [[_COMMUNITY_Auth & Landing Pages|Auth & Landing Pages]]
- [[_COMMUNITY_App UI Screenshots|App UI Screenshots]]
- [[_COMMUNITY_Frontend Dependencies|Frontend Dependencies]]
- [[_COMMUNITY_SignIn Shader Flow|SignIn Shader Flow]]
- [[_COMMUNITY_DeepLearner Logos|DeepLearner Logos]]
- [[_COMMUNITY_UI Utils & Navbar|UI Utils & Navbar]]
- [[_COMMUNITY_Claude Settings|Claude Settings]]
- [[_COMMUNITY_PDF Extraction & OCR|PDF Extraction & OCR]]
- [[_COMMUNITY_Framework Default Icons|Framework Default Icons]]
- [[_COMMUNITY_Quiz Generator (Bloom)|Quiz Generator (Bloom)]]
- [[_COMMUNITY_Auth Guard|Auth Guard]]
- [[_COMMUNITY_Multimodal Quiz + Gemini Vision|Multimodal Quiz + Gemini Vision]]
- [[_COMMUNITY_Vite EntryTemplate|Vite Entry/Template]]

## God Nodes (most connected - your core abstractions)
1. `useLanguage()` - 29 edges
2. `str` - 23 edges
3. `transcribe()` - 15 edges
4. `auth` - 14 edges
5. `get_firestore()` - 13 edges
6. `generate_quiz_nlp()` - 12 edges
7. `summarize_text()` - 12 edges
8. `t()` - 12 edges
9. `create_quiz()` - 11 edges
10. `generate_multimodal_quiz()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Lazy-Import Startup Performance Optimization` --semantically_similar_to--> `Lazy Whisper Model Loading`  [INFERRED] [semantically similar]
  README.md → D6_DeepLearner.md
- `DeepLearner Logo Variant 1 (deployed app asset)` --semantically_similar_to--> `DeepLearner Logo Variant 1 (root)`  [INFERRED] [semantically similar]
  frontend/public/DeepLearnerLogo1.png → DeepLearnerLogo1.png
- `DeepLearner Logo Variant 2 (deployed app asset)` --semantically_similar_to--> `DeepLearner Logo Variant 2 (root)`  [INFERRED] [semantically similar]
  frontend/public/DeepLearnerLogo2.png → DeepLearnerLogo2.png
- `DeepLearner Logo Variant 3 (deployed app asset)` --semantically_similar_to--> `DeepLearner Logo Variant 3 (root)`  [INFERRED] [semantically similar]
  frontend/public/DeepLearnerLogo3.png → DeepLearnerLogo3.png
- `generate_quiz_nlp()` --semantically_similar_to--> `extractive_summarize()`  [INFERRED] [semantically similar]
  backend/services/quiz_generator.py → backend/services/summarizer.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Summarizer fallback chain (Gemini -> Ollama -> T5 -> Extractive)** — services_summarizer_summarize_text, services_summarizer_summarize_text_gemini, services_summarizer_summarize_text_ollama, services_summarizer_summarize_text_t5, services_summarizer_extractive_summarize [INFERRED 0.85]
- **Quiz generation fallback (Gemini -> NLP) + background Ollama enrich** — services_quiz_generator_generate_quiz, services_quiz_generator_generate_quiz_gemini, services_quiz_generator_generate_quiz_nlp, services_quiz_generator_enrich_and_save [INFERRED 0.85]
- **Transcription pipeline (Whisper -> Ollama clean -> Firestore + SSE)** — routers_transkripsi_transcribe, services_whisper_service_transcribe_audio, services_transcript_cleaner_clean_transcript, routers_progress_emit [INFERRED 0.85]
- **Input to Quiz Learning Pipeline** — pages_audioinput_inputpage, pages_transcript_transcript, pages_summary_summary, pages_quiz_quiz [INFERRED 0.85]
- **Landing Auth Entry Flow** — pages_landing_landing, pages_login_login, pages_register_register [INFERRED 0.75]
- **Saved Notes Archive Review** — pages_summary_summary, pages_history_history, pages_dashboard_dashboard [INFERRED 0.75]
- **End-to-End Audio-to-Quiz Learning Pipeline** — d6_deeplearner_whisper_service, d6_deeplearner_summarizer_service, d6_deeplearner_quiz_generator [INFERRED 0.95]
- **Tiered LLM Provider Fallback (Gemini/OpenAI to Ollama to Local)** — readme_openai_gpt4o_mini, readme_ollama_qwen, readme_gemini_flash [INFERRED 0.85]
- **Firebase Backend Stack (Auth/Firestore/Storage)** — d6_deeplearner_firebase_auth, d6_deeplearner_firestore, d6_deeplearner_firebase_storage [INFERRED 0.95]

## Communities (28 total, 8 thin omitted)

### Community 0 - "FastAPI API Endpoints"
Cohesion: 0.07
Nodes (41): POST /extract-pdf, POST /generate-quiz, GET/POST /progress (SSE), GET /quiz-status/{id}, GET /ringkasan/{id}, POST /summarize, POST /transcribe, Sidebar() (+33 more)

### Community 1 - "Ollama LLM Client"
Cohesion: 0.06
Nodes (67): bool, int, str, Ollama / Qwen local LLM, get_ollama_client(), invalidate_cache(), Force re-probe on next call (e.g. after a connection error)., Returns (client, model) tuple or (None, None) if Ollama is unreachable. (+59 more)

### Community 2 - "Firebase Backend Init"
Cohesion: 0.08
Nodes (36): get_bucket(), get_firebase_app(), get_firestore(), Firebase Admin SDK initializer. Place your serviceAccountKey.json in the backend, FastAPI App (main), int, str, UploadFile (+28 more)

### Community 3 - "Transcription Pipeline"
Cohesion: 0.08
Nodes (33): str, str, UploadFile, str, str, Firestore 'transkripsi' collection, get_bucket, create_job() (+25 more)

### Community 4 - "PDF/File Extraction"
Cohesion: 0.08
Nodes (29): str, UploadFile, bool, bytes, int, str, bytes, int (+21 more)

### Community 5 - "Summarizer Service"
Cohesion: 0.12
Nodes (29): float, int, str, str, _detect_sub_bullets(), extractive_summarize(), _get_t5_summarizer(), _pick_conclusion() (+21 more)

### Community 6 - "System Design Doc"
Cohesion: 0.08
Nodes (25): Black-Box & Recovery Testing Plan, Client-Server Architecture, DeepLearner OS, D6 DeepLearner System Development & Testing Doc, Firebase Storage, Bilingual i18n (Malay/English), Lazy Whisper Model Loading, Node 22 ESM/CJS Compatibility Decision (+17 more)

### Community 7 - "FastAPI App & Health"
Cohesion: 0.13
Nodes (18): health_ollama(), str, DeepLearner OS — FastAPI Backend Entry Point, Shows which Ollama endpoint is active and whether the model is loaded., Catch-all: return index.html so React Router handles routing., serve_react(), bool, float (+10 more)

### Community 8 - "Firebase Config Rules"
Cohesion: 0.09
Nodes (21): firestore, rules, storage, rules, dependencies, axios, class-variance-authority, firebase (+13 more)

### Community 9 - "Frontend Lint/Build Config"
Cohesion: 0.09
Nodes (21): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @tailwindcss/postcss, @tailwindcss/vite (+13 more)

### Community 10 - "React Theme/Language Context"
Cohesion: 0.11
Nodes (15): LanguageContext, LanguageProvider(), ThemeContext, ThemeProvider(), AppLayout(), Dashboard, getActiveItem(), History (+7 more)

### Community 11 - "Input Page UI (screens)"
Cohesion: 0.24
Nodes (11): AI Insight Pulse Tip Card, Audio Input / Content Input Page, Document & Slides Upload Dropzone (PDF, PPTX, DOCX), Glassmorphic Dark Design Language, Malay Language Localization, Manual Research Text Entry Panel, Sidebar Navigation (Utama, Sesi Baharu, Sejarah, Profile, Settings), Research Hub Content Input Screen (Pusat Sumber Penyelidikan) (+3 more)

### Community 12 - "Auth & Landing Pages"
Cohesion: 0.22
Nodes (6): Firebase Auth, Firestore: pelajar, Landing(), FEATURES, Login(), Register()

### Community 13 - "App UI Screenshots"
Cohesion: 0.39
Nodes (8): Backend API Error / Not Found State, Audio Input / Source Upload Screen, Dark Glassmorphic Design Language, Dashboard Sidebar Navigation, Malay (Bahasa Melayu) Localization, Research Source Center — Content Input Screen, Research Source Center — Content Input Screen (Duplicate), Raw API JSON Error — Not Found

### Community 14 - "Frontend Dependencies"
Cohesion: 0.25
Nodes (7): dependencies, clsx, framer-motion, lucide-react, tailwind-merge, devDependencies, @tailwindcss/postcss

### Community 16 - "DeepLearner Logos"
Cohesion: 0.33
Nodes (6): DeepLearner Logo Variant 1 (root), DeepLearner Logo Variant 2 (root), DeepLearner Logo Variant 3 (root), DeepLearner Logo Variant 1 (deployed app asset), DeepLearner Logo Variant 2 (deployed app asset), DeepLearner Logo Variant 3 (deployed app asset)

### Community 19 - "PDF Extraction & OCR"
Cohesion: 0.67
Nodes (3): Firebase Firestore Database, PDF/Document Text Extraction Module, Gemini Vision OCR PDF Fallback

## Knowledge Gaps
- **114 isolated node(s):** `allow`, `str`, `UploadFile`, `str`, `BackgroundTasks` (+109 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `transcribe()` connect `Transcription Pipeline` to `Ollama LLM Client`, `Firebase Backend Init`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `get_firestore()` connect `Firebase Backend Init` to `Ollama LLM Client`, `Transcription Pipeline`, `PDF/File Extraction`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `get_ollama_client()` connect `Ollama LLM Client` to `FastAPI App & Health`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `transcribe()` (e.g. with `get_bucket()` and `get_firestore()`) actually correct?**
  _`transcribe()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `allow`, `Firebase Admin SDK initializer. Place your serviceAccountKey.json in the backend`, `str` to the rest of the system?**
  _200 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `FastAPI API Endpoints` be split into smaller, more focused modules?**
  _Cohesion score 0.07374254049445865 - nodes in this community are weakly interconnected._
- **Should `Ollama LLM Client` be split into smaller, more focused modules?**
  _Cohesion score 0.058384547848990345 - nodes in this community are weakly interconnected._