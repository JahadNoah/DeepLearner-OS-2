"""
Flashcard Generator Service — DeepLearner v2
Generates study flashcards (front/back) from summary text via Groq (Qwen3-32B).

Mirrors the quiz-generation pattern (see services/quiz_generator.py):
  Groq call → robust JSON-array extraction → schema validation.
Returns [] on any failure so the router can surface a clean error.
"""
import re
import json
from typing import List
from dotenv import load_dotenv

from services.text_utils import detect_language

load_dotenv()


_SYSTEM_PROMPT = """You are an expert study-flashcard designer.
Turn an educational summary into concise active-recall flashcards.

Rules:
- Each card has a 'soalan' (front: a term, concept, or short question) and a 'jawapan'
  (back: a concise, self-contained answer — one or two sentences, no fluff).
- Test understanding of the key ideas, not trivia. Prefer definitions, cause-effect,
  and "why/how" prompts over verbatim copying.
- One idea per card. Keep both sides short enough to review at a glance.
- Match the language of the input text (Bahasa Melayu or English).
- Return ONLY a valid JSON array. No markdown fences, no extra text.
"""


def _extract_json_array(raw: str) -> list:
    """Extract a JSON array from LLM output that may contain markdown fences or wrapper objects."""
    raw = re.sub(r"```(?:json)?\s*", "", raw).strip().strip("`").strip()
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict):
            for key in ("cards", "flashcards", "kad", "items", "data"):
                if key in parsed and isinstance(parsed[key], list):
                    return parsed[key]
            vals = list(parsed.values())
            if vals and isinstance(vals[0], list):
                return vals[0]
    except json.JSONDecodeError:
        pass
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if match:
        return json.loads(match.group())
    return []


def _validate_flashcards(data: list) -> List[dict]:
    """Keep only well-formed {soalan, jawapan} cards."""
    if not isinstance(data, list):
        return []
    valid = []
    for item in data:
        if not isinstance(item, dict):
            continue
        soalan = str(item.get("soalan", "")).strip()
        jawapan = str(item.get("jawapan", "")).strip()
        if soalan and jawapan:
            valid.append({"soalan": soalan, "jawapan": jawapan})
    return valid


def generate_flashcards(summary_text: str, num_cards: int = 10) -> List[dict]:
    """
    Groq-powered flashcard generation from summary text.
    Uses Qwen3-32B (GROQ_MODEL) via groq_chat. Returns [] on any failure.
    """
    from services.groq_service import groq_chat

    lang = detect_language(summary_text)
    lang_label = (
        "in Bahasa Melayu (Malaysia, standard DBP — NOT Bahasa Indonesia)"
        if lang == "ms"
        else "in English"
    )

    user_prompt = (
        f"Create exactly {num_cards} study flashcards {lang_label} from the educational "
        f"summary below.\n\n"
        f"Summary:\n{summary_text[:5000]}\n\n"
        f"Return ONLY a valid JSON array, no markdown fences, no explanation:\n"
        f'[{{"soalan": "term or short question", "jawapan": "concise answer"}}]'
    )

    raw = groq_chat(_SYSTEM_PROMPT, user_prompt, temperature=0.5, max_tokens=2048)
    if not raw:
        return []
    parsed = _extract_json_array(raw)
    return _validate_flashcards(parsed)[:num_cards]
