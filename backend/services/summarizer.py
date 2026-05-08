"""
Summarization Service — DeepLearner v2
Transforms messy lecture transcripts into clean, structured summaries.

Strict filtering rules applied to all strategies:
  - Removes timestamps, page markers, navigation buttons, URLs, copyright notices.
  - Language-aware: detects Bahasa Melayu vs English and labels accordingly.

Three strategies:
  A. Extractive (fast, no API key needed) — noise-filtered, structured Markdown.
  D. Ollama/Qwen (local LLM) — uses OLLAMA_MODEL from .env (default: qwen3:8b).
     Requires Ollama running on OLLAMA_HOST (default: http://localhost:11434).
  E. Google Gemini (free tier) — gemini-1.5-flash via GEMINI_API_KEY in .env.

summarize_text() priority: Gemini → Ollama → T5 → Extractive.
"""
import os
import re
from dotenv import load_dotenv

from services.text_utils import detect_language, clean_text

load_dotenv()

_t5_summarizer = None


# ─── Sentence Splitting & Scoring ───────────────────────────────────────────
def _split_sentences(text: str) -> list[str]:
    """Split into sentences with a minimum word count."""
    parts = re.split(r"(?<=[.!?])\s+", text)
    return [s.strip() for s in parts if len(s.split()) >= 5]


def _score_sentences(sentences: list[str]) -> list[tuple[float, int, str]]:
    """
    Score sentences for extractive importance.
    - Length-based score (longer = more content).
    - 1.4× boost for first-third sentences (introductory context).
    - 1.2× boost for sentences containing defining patterns (e.g. "ialah", "is a", "refers to").
    """
    n = len(sentences)
    third = n // 3
    define_re = re.compile(
        r"\bialah\b|\badalah\b|\bmerupakan\b|\bis a\b|\brefers to\b|\bdefined as\b",
        re.IGNORECASE,
    )
    scored = []
    for i, s in enumerate(sentences):
        score = float(len(s.split()))
        if i < third:
            score *= 1.4
        if define_re.search(s):
            score *= 1.2
        scored.append((score, i, s))
    return scored


# ─── Sub-concept Detector (for nested bullets) ──────────────────────────────
_SUBCONCEPT_RE = re.compile(
    r"^(?:ciri[- ]ciri|jenis|contoh|langkah|proses|fungsi|komponen|elemen|"
    r"features?|types?|examples?|steps?|process|components?)\s*[:—–]",
    re.IGNORECASE,
)


def _detect_sub_bullets(sentences: list[str]) -> list[str | list[str]]:
    """
    Group sentences that follow a 'Ciri-ciri:' / 'Features:' header
    as nested lists. Returns a mixed list of strings and [header, [items…]].
    """
    result: list = []
    i = 0
    while i < len(sentences):
        s = sentences[i]
        if _SUBCONCEPT_RE.match(s) and i + 1 < len(sentences):
            sub: list[str] = []
            j = i + 1
            while j < len(sentences) and j < i + 5 and len(sentences[j].split()) <= 15:
                sub.append(sentences[j])
                j += 1
            if sub:
                result.append((s, sub))
                i = j
                continue
        result.append(s)
        i += 1
    return result


# ─── Conclusion Selector ────────────────────────────────────────────────────
_CONCLUSION_SKIP_RE = re.compile(
    r'^(?:langkah[- ]langkah|cara[- ]cara|kaedah\s+(?:untuk|dalam)|'
    r'terdapat\s+\w+\s+(?:jenis|cara|langkah|bentuk)|'
    r'steps?\s+(?:are|to\b)|types?\s+of|examples?\s+(?:are|of))',
    re.IGNORECASE,
)


def _pick_conclusion(sentences: list[str]) -> str:
    """
    Select a meaningful closing sentence from the bottom third.
    Falls back to the last sentence.
    """
    n = len(sentences)
    pool = sentences[max(0, 2 * n // 3):]
    for s in reversed(pool):
        if (len(s.split()) >= 8
                and re.search(r'[.!?]$', s)
                and not re.search(r'[:：]$', s)
                and not _CONCLUSION_SKIP_RE.match(s)):
            return s
    return sentences[-1]


# ═══════════════════════════════════════════════════════════════════════════
# STRATEGY A — Extractive Summarizer
# ═══════════════════════════════════════════════════════════════════════════
def extractive_summarize(text: str, lang: str, cleaned: str, max_sentences: int = 8) -> str:
    """
    Filters noise, scores sentences, and formats a structured Markdown summary:
    TITLE → PENGENALAN → POIN UTAMA (with optional nested bullets) → KESIMPULAN.
    No AI model required — works instantly.
    """
    sentences = _split_sentences(cleaned)

    if not sentences:
        return cleaned[:1000]

    lbl_title     = "Ringkasan"
    lbl_intro     = "**Pengenalan:**" if lang == "ms" else "**Introduction:**"
    lbl_points    = "**Poin Utama:**" if lang == "ms" else "**Key Points:**"
    lbl_conclude  = "**Kesimpulan:**" if lang == "ms" else "**Conclusion:**"

    intro = sentences[0]
    last  = _pick_conclusion(sentences)

    if len(sentences) == 1:
        return f"## {lbl_title}\n\n{lbl_intro}\n{intro}"

    body = sentences[1:-1] if len(sentences) > 2 else sentences[1:]
    scored = _score_sentences(body)
    scored.sort(reverse=True)
    bullet_count = max(2, max_sentences - 2)
    top = sorted(scored[:bullet_count], key=lambda x: x[1])
    bullet_sentences = [s for _, _, s in top if s != last]

    grouped = _detect_sub_bullets(bullet_sentences)

    lines = [f"## {lbl_title}\n", lbl_intro, intro, "", lbl_points]
    for item in grouped:
        if isinstance(item, tuple):
            header, sub_items = item
            lines.append(f"- {header}")
            for si in sub_items:
                lines.append(f"  - {si}")
        else:
            lines.append(f"- {item}")

    lines += ["", lbl_conclude, last]
    return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════
# STRATEGY E — Google Gemini (free tier)
# ═══════════════════════════════════════════════════════════════════════════
_GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")

_SYSTEM_PROMPT = """\
You are an expert Educational Content Processor for the DeepLearner system.
Transform the provided lecture transcript into a clean, structured summary.

STRICT FILTERING RULES:
1. IGNORE TIMESTAMPS — remove all dates and times (e.g., "3/9/26, 2:14 PM").
2. IGNORE METADATA — remove page numbers, navigation buttons (e.g., "Back", "Halaman 1").
3. IGNORE URLs/FOOTERS — do not include links or copyright notices (e.g., "© 2026 Pandai.org").
4. LANGUAGE — if the input is in Bahasa Melayu, ALL output must be in Bahasa Melayu.
5. NO DUPLICATION — do NOT repeat the topic title or any heading in the output body. Each concept appears exactly once.
6. COMPLETE SENTENCES ONLY — every bullet must be a full sentence expressing a concept. Do NOT output bare noun phrases, department names, or section labels as bullets.
7. IGNORE SLIDE STRUCTURE — ignore section numbers (e.g., "7.3"), slide counters (e.g., "1/2", "2/2"), and repeated subheadings.
8. IGNORE IMAGE DESCRIPTIONS — skip any alt-text for diagrams or infographics (e.g., lines starting with "Imej ini menunjukkan...", "Di sekeliling ikon ini...", "Logo 'Pandai'..."). These are visual annotations, NOT subject content.

REQUIRED OUTPUT FORMAT (Markdown only, no extra commentary):
## [Clear bold title]

**Pengenalan:**
[1-2 sentence overview of the topic]

**Poin Utama:**
- [Key concept 1]
  - [Sub-point if applicable]
- [Key concept 2]
- [Key concept 3]
...

**Kesimpulan:**
[Concise closing statement on historical significance or final outcome]
"""


def summarize_text_gemini(lang: str, cleaned: str) -> str:
    """
    Strategy E: Gemini-powered summarization (free tier).
    Uses gemini-2.0-flash via GEMINI_API_KEY in .env.
    Returns empty string on any failure or missing key.
    """
    if not _GEMINI_KEY:
        return ""
    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=_GEMINI_KEY)
        lang_note = (
            "The input is in Bahasa Melayu. ALL output MUST be in Bahasa Melayu."
            if lang == "ms"
            else "The input is in English."
        )
        prompt = f"{_SYSTEM_PROMPT}\n\n{lang_note}\n\nTranscript:\n{cleaned[:5000]}"
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=1200,
            ),
        )
        result = response.text.strip()
        return result if len(result) > 50 else ""
    except Exception as e:
        print(f"Gemini summarizer failed: {e}")
        return ""


# ═══════════════════════════════════════════════════════════════════════════
# STRATEGY D — Ollama/Qwen (local LLM)
# ═══════════════════════════════════════════════════════════════════════════
def summarize_text_ollama(lang: str, cleaned: str) -> str:
    """
    Strategy D: Ollama/Qwen LLM summarization.
    Auto-switches between tunnel and local Ollama.
    Returns empty string on failure or if Ollama is offline.
    """
    try:
        from services.ollama_client import get_ollama_client, invalidate_cache
        client, model = get_ollama_client()
        if not client:
            return ""
        lang_note = (
            "The input is in Bahasa Melayu. ALL output MUST be in Bahasa Melayu."
            if lang == "ms"
            else "The input is in English."
        )
        response = client.chat(
            model=model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user",   "content": f"{lang_note}\n\nTranscript:\n{cleaned[:5000]}"},
            ],
            options={"temperature": 0.2, "num_predict": 1200},
        )
        result = response["message"]["content"].strip()
        return result if len(result) > 50 else ""
    except Exception as e:
        print(f"Ollama summarizer failed: {e}")
        invalidate_cache()
        return ""


# ═══════════════════════════════════════════════════════════════════════════
# STRATEGY C — T5-small (optional legacy AI)
# ═══════════════════════════════════════════════════════════════════════════
def _get_t5_summarizer():
    global _t5_summarizer
    if _t5_summarizer is None:
        from transformers import pipeline
        model_name = os.getenv("SUMMARIZER_MODEL", "t5-small")
        print(f"Loading summarization model: {model_name}...")
        _t5_summarizer = pipeline("summarization", model=model_name)
        print("Summarization model loaded ✓")
    return _t5_summarizer


def summarize_text_t5(text: str, lang: str, max_length: int = 300, min_length: int = 80) -> str:
    """Strategy C: T5-small transformer summarization (USE_AI_SUMMARIZER=true)."""
    try:
        summarizer = _get_t5_summarizer()
        MAX_WORDS = 512
        words = text.split()
        if len(words) > MAX_WORDS:
            chunks = [" ".join(words[i:i + MAX_WORDS]) for i in range(0, len(words), MAX_WORDS)]
            parts = [summarizer(c, max_length=150, min_length=30, do_sample=False)[0]["summary_text"] for c in chunks]
            raw = summarizer(" ".join(parts), max_length=max_length, min_length=min_length, do_sample=False)[0]["summary_text"]
        else:
            raw = summarizer(text, max_length=max_length, min_length=min_length, do_sample=False)[0]["summary_text"]

        lbl_intro    = "**Pengenalan:**" if lang == "ms" else "**Introduction:**"
        lbl_points   = "**Poin Utama:**" if lang == "ms" else "**Key Points:**"
        lbl_conclude = "**Kesimpulan:**" if lang == "ms" else "**Conclusion:**"

        ai_sentences = _split_sentences(raw)
        if ai_sentences:
            intro   = ai_sentences[0]
            bullets = ai_sentences[1:-1] if len(ai_sentences) > 2 else []
            concl   = ai_sentences[-1] if len(ai_sentences) > 1 else ""
            lines   = ["## Ringkasan\n", lbl_intro, intro, "", lbl_points]
            for s in bullets:
                lines.append(f"- {s}")
            if concl:
                lines += ["", lbl_conclude, concl]
            return "\n".join(lines)
        return raw
    except Exception as e:
        print(f"T5 summarizer failed: {e} — falling back to extractive")
        return ""


# ═══════════════════════════════════════════════════════════════════════════
# Main Entry Point
# ═══════════════════════════════════════════════════════════════════════════
def summarize_text(text: str, max_length: int = 300, min_length: int = 80) -> str:
    """
    Summarizes the given text with noise filtering and structured Markdown output.

    Language detection and text cleaning are computed once and reused across all strategies.

    Priority:
      1. Strategy E (Gemini) — if GEMINI_API_KEY is set in .env
      2. Strategy D (Ollama/Qwen) — if Ollama is running locally
      3. Strategy C (T5-small) — if USE_AI_SUMMARIZER=true in .env
      4. Strategy A (Extractive) — always available fallback
    """
    # Compute once, reuse across all strategies
    lang = detect_language(text)
    cleaned = clean_text(text)

    use_t5 = os.getenv("USE_AI_SUMMARIZER", "false").lower() == "true"

    # Strategy E — Gemini (free)
    result = summarize_text_gemini(lang, cleaned)
    if result:
        return result

    # Strategy D — Ollama/Qwen
    result = summarize_text_ollama(lang, cleaned)
    if result:
        return result

    # Strategy C — T5
    if use_t5:
        result = summarize_text_t5(text, lang, max_length, min_length)
        if result:
            return result

    # Strategy A — Extractive (guaranteed fallback)
    return extractive_summarize(text, lang, cleaned, max_sentences=10)
