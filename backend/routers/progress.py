"""
Progress Router — SSE streaming for long-running jobs.

Flow:
  1. Client calls POST /api/progress/create  → gets { job_id }
  2. Client opens EventSource on GET /api/progress/{job_id}
  3. Backend calls emit(job_id, step, data) during processing
  4. Stream closes automatically after a "done" or "error" event

Architectural note:
  Uses asyncio.Queue per job stored in a module-level dict.
  Works correctly with uvicorn single-worker mode (the default).
  With --workers > 1 the queue dict is per-process; in that case
  switch to a Redis pub/sub backend.
"""
import asyncio
import json
import uuid
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter()

_queues: dict[str, asyncio.Queue] = {}


def create_job() -> str:
    """Create a new job queue and return its ID."""
    job_id = str(uuid.uuid4())[:8]
    _queues[job_id] = asyncio.Queue()
    return job_id


async def emit(job_id: str, event: str, data: dict) -> None:
    """Push an SSE event into the job's queue."""
    if job_id in _queues:
        payload = f"event: {event}\ndata: {json.dumps(data)}\n\n"
        await _queues[job_id].put(payload)


async def emit_done(job_id: str) -> None:
    await emit(job_id, "done", {"step": "done"})


async def emit_error(job_id: str, message: str) -> None:
    await emit(job_id, "error", {"step": "error", "message": message})


async def _stream(job_id: str):
    q = _queues.get(job_id)
    if not q:
        yield "event: error\ndata: {\"step\": \"error\", \"message\": \"job not found\"}\n\n"
        return
    try:
        while True:
            try:
                msg = await asyncio.wait_for(q.get(), timeout=120.0)
            except asyncio.TimeoutError:
                yield "event: error\ndata: {\"step\": \"error\", \"message\": \"timeout\"}\n\n"
                break
            yield msg
            if '"done"' in msg or '"error"' in msg:
                break
    finally:
        _queues.pop(job_id, None)


@router.post("/progress/create")
async def create_progress_job():
    """Create a new SSE job and return its ID."""
    job_id = create_job()
    return {"job_id": job_id}


@router.get("/progress/{job_id}")
async def stream_progress(job_id: str):
    """Stream SSE events for a job."""
    return StreamingResponse(
        _stream(job_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
