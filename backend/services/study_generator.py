"""
Study Pack Generator — DeepLearner v2
Generates four study artifacts from a transcript via Groq (Qwen3-32B):
  - study guide (Markdown)
  - timeline    ([{tempoh, tajuk, keterangan}])
  - glossary    ([{istilah, takrif}])
  - faq         ([{soalan, jawapan}])

Mirrors the quiz/flashcard generation pattern (Groq call → robust JSON-array
extraction → schema validation). Each returns "" or [] on failure.
"""
import re
import json
from typing import List
from dotenv import load_dotenv

from services.text_utils import detect_language

load_dotenv()

# Generous budget: Qwen3 spends part of its output on a (stripped) <think> block,
# so a small cap truncates long study guides / long arrays mid-way.
_MAX_TOKENS = 3000


def _lang_label(text: str) -> str:
    return (
        "in Bahasa Melayu (Malaysia, standard DBP — NOT Bahasa Indonesia)"
        if detect_language(text) == "ms"
        else "in English"
    )


def _extract_json_array(raw: str) -> list:
    """Extract a JSON array from LLM output that may contain markdown fences or wrapper objects."""
    raw = re.sub(r"```(?:json)?\s*", "", raw).strip().strip("`").strip()
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict):
            for key in ("timeline", "glossary", "faq", "items", "data", "events"):
                if key in parsed and isinstance(parsed[key], list):
                    return parsed[key]
            vals = list(parsed.values())
            if vals and isinstance(vals[0], list):
                return vals[0]
    except json.JSONDecodeError:
        pass
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            return []
    return []


def _validate_pairs(data: list, key_a: str, key_b: str) -> List[dict]:
    """Keep only items with both non-empty string fields."""
    if not isinstance(data, list):
        return []
    out = []
    for item in data:
        if not isinstance(item, dict):
            continue
        a = str(item.get(key_a, "")).strip()
        b = str(item.get(key_b, "")).strip()
        if a and b:
            out.append({key_a: a, key_b: b})
    return out


# ─── Study Guide (Markdown) ─────────────────────────────────────────────────
_GUIDE_SYSTEM = """You are an expert study-guide writer.
Turn a lecture transcript into a clear, well-structured revision guide.

Rules:
- Use Markdown: short section headings (##), bullet points, and **bold** for key terms.
- Cover the key concepts, the most important points, and what a student should focus on.
- Be faithful to the source — do not add facts that aren't in it.
- Keep it scannable and concise. Match the language of the source text.
"""


def generate_study_guide(text: str) -> str:
    from services.groq_service import groq_chat
    user = (
        f"Write a structured study guide {_lang_label(text)} from the lecture transcript below.\n\n"
        f"Transcript:\n{text[:8000]}\n\n"
        f"Return ONLY the Markdown study guide, no preamble."
    )
    return groq_chat(_GUIDE_SYSTEM, user, temperature=0.4, max_tokens=_MAX_TOKENS)


# ─── Timeline ───────────────────────────────────────────────────────────────
_TIMELINE_SYSTEM = """You extract chronological timelines from lecture material.
Return ONLY a valid JSON array. No markdown fences, no extra text.
If the material is NOT chronological (no events, dates, or ordered phases), return an empty array [].
Never invent dates or events that are not supported by the source.
"""


def generate_timeline(text: str) -> List[dict]:
    from services.groq_service import groq_chat
    user = (
        f"Extract a chronological timeline {_lang_label(text)} from the transcript below. "
        f"Each entry needs a 'tempoh' (a date, year, era, or phase label), a short 'tajuk' (title), "
        f"and a 'keterangan' (1-2 sentence description).\n\n"
        f"Transcript:\n{text[:8000]}\n\n"
        f"Return ONLY a JSON array (or [] if not chronological):\n"
        f'[{{"tempoh": "e.g. 1400s / Phase 1", "tajuk": "short title", "keterangan": "what happened"}}]'
    )
    raw = groq_chat(_TIMELINE_SYSTEM, user, temperature=0.3, max_tokens=_MAX_TOKENS)
    if not raw:
        return []
    return _validate_timeline(_extract_json_array(raw))


def _validate_timeline(data: list) -> List[dict]:
    if not isinstance(data, list):
        return []
    out = []
    for item in data:
        if not isinstance(item, dict):
            continue
        tempoh = str(item.get("tempoh", "")).strip()
        tajuk = str(item.get("tajuk", "")).strip()
        keterangan = str(item.get("keterangan", "")).strip()
        if tajuk and (tempoh or keterangan):
            out.append({"tempoh": tempoh, "tajuk": tajuk, "keterangan": keterangan})
    return out


# ─── Glossary ───────────────────────────────────────────────────────────────
_GLOSSARY_SYSTEM = """You build glossaries of key terms from lecture material.
Return ONLY a valid JSON array. No markdown fences, no extra text.
Only include terms that actually appear in the source; keep definitions concise.
"""


def generate_glossary(text: str) -> List[dict]:
    from services.groq_service import groq_chat
    user = (
        f"Build a glossary of the key terms {_lang_label(text)} from the transcript below. "
        f"Each entry needs an 'istilah' (term) and a concise 'takrif' (definition).\n\n"
        f"Transcript:\n{text[:8000]}\n\n"
        f"Return ONLY a JSON array:\n"
        f'[{{"istilah": "term", "takrif": "concise definition"}}]'
    )
    raw = groq_chat(_GLOSSARY_SYSTEM, user, temperature=0.3, max_tokens=_MAX_TOKENS)
    if not raw:
        return []
    return _validate_pairs(_extract_json_array(raw), "istilah", "takrif")


# ─── FAQ ────────────────────────────────────────────────────────────────────
_FAQ_SYSTEM = """You write exam-style FAQs from lecture material.
Return ONLY a valid JSON array. No markdown fences, no extra text.
Questions should be the kind a student is likely to be tested on; answers must come from the source.
"""


def generate_faq(text: str) -> List[dict]:
    from services.groq_service import groq_chat
    user = (
        f"Write likely exam questions with answers {_lang_label(text)} from the transcript below. "
        f"Each entry needs a 'soalan' (question) and a 'jawapan' (answer).\n\n"
        f"Transcript:\n{text[:8000]}\n\n"
        f"Return ONLY a JSON array:\n"
        f'[{{"soalan": "question", "jawapan": "answer grounded in the notes"}}]'
    )
    raw = groq_chat(_FAQ_SYSTEM, user, temperature=0.4, max_tokens=_MAX_TOKENS)
    if not raw:
        return []
    return _validate_pairs(_extract_json_array(raw), "soalan", "jawapan")
