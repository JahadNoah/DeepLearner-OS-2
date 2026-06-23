#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# DeepLearner OS — one-shot launcher for local testing + public Cloudflare tunnel.
#
# Run it in its OWN terminal tab so it survives independently:
#     bash "start.sh"
#
# It starts:  backend (FastAPI :8000) + frontend (Vite :5173) + public tunnel.
# Press Ctrl-C once to stop all three cleanly.
# ─────────────────────────────────────────────────────────────────────────────
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Node.js v22 is required (see README) — Node 24 breaks the Vite/ESM interop.
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"

BACKEND_PID=""; FRONTEND_PID=""
cleanup() {
  echo ""
  echo "Stopping DeepLearner OS…"
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null
  pkill -f "uvicorn main:app" 2>/dev/null
  pkill -f "node.*vite" 2>/dev/null
  exit 0
}
trap cleanup INT TERM

echo "▶ Backend  (FastAPI :8000)…"
( cd "$ROOT/backend" && source venv/bin/activate && exec python -m uvicorn main:app --port 8000 ) \
  > "$ROOT/.backend.log" 2>&1 &
BACKEND_PID=$!

echo "▶ Frontend (Vite :5173)…"
( cd "$ROOT/frontend" && exec npm run dev -- --host ) \
  > "$ROOT/.frontend.log" 2>&1 &
FRONTEND_PID=$!

echo "⏳ Waiting for backend to answer /health (first start can be slow)…"
until curl -s -m 2 -o /dev/null "http://localhost:8000/health"; do sleep 2; done
echo "✔ Backend ready."

echo "⏳ Waiting for frontend…"
until curl -s -m 2 -o /dev/null "http://127.0.0.1:5173/"; do sleep 2; done
echo "✔ Frontend ready."

echo ""
echo "▶ Opening public Cloudflare tunnel — the shareable URL prints below."
echo "  (It changes each run; copy the new https://*.trycloudflare.com link.)"
echo "──────────────────────────────────────────────────────────────────────"
# Runs in the foreground so this terminal stays alive; Ctrl-C triggers cleanup.
cloudflared tunnel --url http://localhost:5173
