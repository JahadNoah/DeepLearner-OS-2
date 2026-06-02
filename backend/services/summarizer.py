"""
Summarization Service — DeepLearner v2
Transforms messy lecture transcripts into clean, structured summaries.

Strict filtering rules applied to all strategies:
  - Removes timestamps, page markers, navigation buttons, URLs, copyright notices.
  - Language-aware: detects Bahasa Melayu vs English and labels accordingly.

Two strategies:
  A. Extractive (fast, no API key needed) — noise-filtered, structured Markdown.
  B. Groq (llama-3.3-70b-versatile by default) — high-quality structured summary.
     Requires GROQ_API_KEY in .env.

summarize_text() priority: Groq → T5 (optional) → Extractive.
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
# STRATEGY B — Groq (llama-3.3-70b-versatile by default)
# ═══════════════════════════════════════════════════════════════════════════
_SYSTEM_PROMPT = """\
You are an expert Educational Content Processor for the DeepLearner system.
Transform the provided lecture transcript into a clean, structured summary.

STRICT FILTERING RULES:
1. IGNORE TIMESTAMPS — remove all dates and times (e.g., "3/9/26, 2:14 PM").
2. IGNORE METADATA — remove page numbers, navigation buttons (e.g., "Back", "Halaman 1").
3. IGNORE URLs/FOOTERS — do not include links or copyright notices (e.g., "© 2026 Pandai.org").
4. LANGUAGE — if the input is in Bahasa Melayu, ALL output MUST be in STANDARD BAHASA MELAYU MALAYSIA (the variety used in Malaysian schools and the Dewan Bahasa dan Pustaka, DBP). DO NOT use Bahasa Indonesia. Specifically:
   - Use Malaysian spellings: "kerajaan" (not "pemerintah"), "wang" (not "uang"), "cuti" (not "libur"), "bilik" (not "kamar"), "kereta" (not "mobil"), "akhbar" (not "koran"), "pejabat" (not "kantor"), "kemudian" (not "lalu/terus" in the Indo sense), "menggunakan" (not "memakai"), "boleh" (not "bisa"), "sahaja" (not "saja"), "manakala" (not "sedangkan"), "ialah" / "adalah" (not "merupakan" overused as Indo style), "mengapa" (not "kenapa" in formal text), "bagaimana" (not "gimana"), "ini" / "itu" (not "nih" / "tuh").
   - Pronouns: "anda" / "saya" / "kita" / "mereka" — NEVER "kalian", "kamu" (informal Indo), "lu", "gue".
   - NO Indonesian particles: "lho", "deh", "kok", "sih", "banget", "nih", "tuh", "udah", "gitu", "yaudah".
   - "di" as preposition is written separate from place ("di sekolah"); "di-" as passive prefix is attached ("dijalankan") — Malaysian standard, same as Indo orthographically but watch the vocabulary.
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


def summarize_text_groq(lang: str, cleaned: str) -> str:
    """
    Strategy B: Groq-powered summarization (llama-3.3-70b-versatile by default).
    Requires GROQ_API_KEY in .env. Returns '' on failure.
    """
    from services.groq_client import chat as groq_chat
    lang_note = (
        "The input is in BAHASA MELAYU MALAYSIA (Malaysian Malay, DBP standard). "
        "ALL output MUST be in Bahasa Melayu Malaysia. DO NOT use Bahasa Indonesia "
        "vocabulary, slang, or particles (no 'kalian', 'banget', 'kok', 'sih', 'nih', "
        "'udah', 'gitu', 'merupakan' overuse, 'pemerintah', 'uang', 'bisa', 'saja' — "
        "use 'kerajaan', 'wang', 'boleh', 'sahaja' instead)."
        if lang == "ms"
        else "The input is in English."
    )
    result = groq_chat(
        _SYSTEM_PROMPT,
        f"{lang_note}\n\nTranscript:\n{cleaned[:5000]}",
        temperature=0.3,
        max_tokens=1200,
    )
    return result if result and len(result) > 50 else ""


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
      1. Strategy B (Groq) — if GROQ_API_KEY is set in .env
      2. Strategy C (T5-small) — if USE_AI_SUMMARIZER=true in .env
      3. Strategy A (Extractive) — always available fallback
    """
    # Compute once, reuse across all strategies
    lang = detect_language(text)
    cleaned = clean_text(text)

    use_t5 = os.getenv("USE_AI_SUMMARIZER", "false").lower() == "true"

    # Strategy B — Groq
    result = summarize_text_groq(lang, cleaned)
    if result:
        return result

    # Strategy C — T5
    if use_t5:
        result = summarize_text_t5(text, lang, max_length, min_length)
        if result:
            return result

    # Strategy A — Extractive (guaranteed fallback)
    return extractive_summarize(text, lang, cleaned, max_sentences=10)
