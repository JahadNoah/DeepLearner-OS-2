# Deploying DeepLearner OS

Frontend → **Vercel** (already done). Backend → **Render** (FastAPI, persistent
so live progress (SSE) + quiz enrichment keep working).

Thanks to the Groq migration, the backend no longer needs the local ML stack
(torch/whisper/transformers), so it deploys small and fast.

---

## 1. Backend on Render

### a. Create the service
1. Push this repo to GitHub (done).
2. Render dashboard → **New → Blueprint** → connect this repo. It reads
   [`render.yaml`](render.yaml) and creates the `deeplearner-backend` web service.
   - (Or **New → Web Service** manually: Root Dir `backend`, Build
     `pip install -r requirements.txt`, Start
     `uvicorn main:app --host 0.0.0.0 --port $PORT`, Health check `/health`.)

### b. Set the secret env vars (Render → service → Environment)
| Key | Value |
|-----|-------|
| `GROQ_API_KEY` | your Groq key |
| `GROQ_API_KEY_2` | (optional) fallback Groq key |
| `GEMINI_API_KEY` | your Gemini key |
| `FIREBASE_STORAGE_BUCKET` | `your-project-id.appspot.com` |
| `FIREBASE_CREDENTIALS_JSON` | the **entire** `serviceAccountKey.json` contents (paste the raw JSON, or base64 of it) |
| `ALLOWED_ORIGINS` | your Vercel URL, e.g. `https://deeplearner-os.vercel.app` |

> The key file can't be committed (it's gitignored). `firebase_config.py` now
> reads `FIREBASE_CREDENTIALS_JSON` first and falls back to a file path.
> To base64 it: `base64 -i backend/serviceAccountKey.json | pbcopy`

### c. Deploy
Render builds and gives you a URL like `https://deeplearner-backend.onrender.com`.
Verify: open `…/health` → `{"status":"ok"}` and `…/health/groq` → `"ready"`.

> Free tier sleeps after ~15 min idle; first request after sleep takes ~30–60s.

---

## 2. Point the Vercel frontend at the backend

In Vercel → project → **Settings → Environment Variables**, add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://deeplearner-backend.onrender.com/api` |

Then **redeploy** the frontend (env vars apply on the next build). The frontend
already uses `import.meta.env.VITE_API_URL || "/api"`, so prod calls now hit
Render while local dev keeps using the Vite proxy.

---

## 3. Verify end-to-end
Open the Vercel URL → log in → upload a short `.wav`/`.mp3` lecture →
Transkripsi → Ringkasan → Kuiz. If `/api` calls fail with CORS, double-check
`ALLOWED_ORIGINS` on Render matches the Vercel origin exactly (no trailing slash).

---

## Local development (unchanged)
```bash
bash start.sh          # backend + frontend + tunnel
```
Want the offline local fallbacks (local Whisper, T5, spaCy)? Install the extras:
```bash
cd backend && pip install -r requirements-optional.txt
python -m spacy download en_core_web_sm
```
