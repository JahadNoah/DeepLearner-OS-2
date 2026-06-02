#!/usr/bin/env bash
# DeepLearner backend dev server.
# Watches only services/ and routers/ for changes — venv/ is intentionally
# excluded so .pyc/site-packages activity doesn't trigger reload storms.
# main.py and firebase_config.py changes require a manual restart.

set -e
cd "$(dirname "$0")"

if [ ! -d venv ]; then
  echo "venv/ not found. Run: python3 -m venv venv && pip install -r requirements.txt"
  exit 1
fi

source venv/bin/activate

PORT="${PORT:-8001}"

# Invoke uvicorn via `python -m` so the venv's site-packages is used
# (avoids stale shebangs in venv/bin/* if the project folder was renamed).
exec python -m uvicorn main:app \
  --port "$PORT" \
  --reload \
  --reload-dir services \
  --reload-dir routers
