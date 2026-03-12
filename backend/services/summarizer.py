"""
Summarization Service — DeepLearner v2
Transforms messy lecture transcripts into clean, structured summaries.

Strict filtering rules applied to all strategies:
  - Removes timestamps, page markers, navigation buttons, URLs, copyright notices.
  - Language-aware: detects Bahasa Melayu vs English and labels accordingly.

Three strategies:
  A. Extractive (fast, no API key needed) — noise-filtered, structured Markdown.
  B. LLM-Powered (OpenAI GPT-4o-mini) — conceptual, Bloom's-ready.
     Requires OPENAI_API_KEY in .env.
  D. Ollama/Qwen (local LLM) — uses OLLAMA_MODEL from .env (default: qwen2.5:8b).
     Requires Ollama running on OLLAMA_HOST (default: http://localhost:11434).

summarize_text() priority: OpenAI → Ollama → T5 → Extractive.
Optional: set USE_AI_SUMMARIZER=true in .env to use T5-small instead of OpenAI.
"""
import os
import re
from dotenv import load_dotenv

load_dotenv()

_t5_summarizer = None

# ─── Language Detection ─────────────────────────────────────────────────────
_MALAY_MARKERS = {
    "yang", "dan", "atau", "pada", "di", "ke", "dari", "dengan", "untuk",
    "adalah", "ini", "itu", "juga", "oleh", "dalam", "tidak", "akan",
    "telah", "boleh", "lebih", "seperti", "apabila", "jika", "semua",
    "setiap", "antara", "iaitu", "kerana", "namun", "walau", "tetapi",
}


def _detect_language(text: str) -> str:
    """Returns 'ms' for Malay or 'en' for English."""
    words = set(re.findall(r'\b\w+\b', text.lower()))
    return "ms" if len(words & _MALAY_MARKERS) >= 3 else "en"


# ─── Deep Text Cleaner ──────────────────────────────────────────────────────
# Regex patterns for noise removal
_NOISE_PATTERNS = [
    r"\[Halaman \d+\]",                         # page markers  [Halaman 3]
    r"Halaman\s+\d+\s*(daripada\s*\d+)?",       # Halaman 1 daripada 5
    r"\b\d{1,2}/\d{1,2}/\d{2,4},?\s*\d{1,2}:\d{2}\s*(AM|PM|am|pm)?\b",  # timestamps 3/9/26, 2:14 PM
    r"https?://\S+",                            # URLs
    r"www\.\S+",                                # www. links
    r"©\s*\d{4}[^\n]*",                        # copyright © 2026 …
    r"All\s+Rights\s+Reserved[^\n]*",              # standalone copyright footer
    r"\bBack\b|\bNext\b|\bHome\b|\bMenu\b",    # nav buttons
    r"\bMuat\s*turun\b|\bCetak\b|\bKongsi\b",  # Malay nav/UI labels
    r"[-–—]{3,}",                               # horizontal rules
    r"\bPage \d+\b|\bSlide \d+\b",             # English page/slide markers
]
_NOISE_RE = re.compile("|".join(_NOISE_PATTERNS), re.IGNORECASE)


# ─── Heading Line & Duplicate Filter ────────────────────────────────────────
_HEADING_LINE_RE = re.compile(
    r'^\s*(?:'
    r'\d+(?:\.\d+)*[\s\.]'   # numbered sections: "7.3 " "1.1." "1. "
    r'|\d+/\d+'              # fraction-prefixed lines: "1/2 Topic", "2/2"
    r')',
    re.IGNORECASE,
)

_HEADING_VERB_RE = re.compile(
    r'\b(?:adalah|ialah|merupakan|bermaksud|dilaksanakan|diumumkan|'
    r'terdiri|dijawat|diwujudkan|berlaku|berkhidmat|bertanggungjawab|'
    r'is|are|was|were|has|have|had|can|will|should|provide|refer|define)\b',
    re.IGNORECASE,
)

# Matches image/infographic alt-text descriptions — not actual subject content
_IMAGE_DESC_RE = re.compile(
    r'imej\s+ini\s+(?:menunjukkan|memaparkan|menggambarkan|merupakan)|'
    r'ilustrasi\s+(?:seorang|sebuah|ini)|'
    r'infografik\s+(?:tentang|mengenai|ini)|'
    r'di\s+sudut\s+(?:kiri|kanan)\s+(?:atas|bawah)|'
    r"logo\s+['\"]\w[^'\"]*['\"]",
    re.IGNORECASE,
)


def _rejoin_pdf_wraps(text: str) -> str:
    """
    Rejoin soft-wrapped lines from PDF/web-page extraction.
    When a line ends without terminal punctuation (.!?:) and the next
    line starts with a lowercase letter, they are joined — restoring
    full paragraphs so image alt-text blocks can be detected and filtered.
    """
    lines = text.split('\n')
    out: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            out.append('')
            continue
        if out and out[-1] and not re.search(r'[.!?:]\s*$', out[-1]) and stripped[0].islower():
            out[-1] = out[-1] + ' ' + stripped
        else:
            out.append(stripped)
    return '\n'.join(out)


def _strip_heading_lines(text: str) -> str:
    """
    Pre-process transcript text line-by-line to remove structural noise:
    - Numbered section headings  (e.g. "7.3 Sistem Ahli")
    - Fraction-prefixed lines    (e.g. "1/2 Sistem Ahli")
    - Standalone / trailing slide fractions (e.g. "2/2", "Topik 2/2")
    - Short unpunctuated noun-phrase lines that are headings (≤10 words, no verb)
    - Consecutive duplicate lines
    """
    kept = []
    seen: set = set()

    for raw_line in text.split('\n'):
        line = raw_line.strip()
        if not line:
            kept.append('')
            continue

        # Strip trailing slide fraction (e.g. "Sistem Ahli 1/2")
        line = re.sub(r'\s+\d+/\d+\s*$', '', line).strip()
        if not line:
            continue

        # Skip numbered sections and fraction-prefixed lines
        if _HEADING_LINE_RE.match(line):
            continue

        # Skip image/infographic alt-text description lines
        if _IMAGE_DESC_RE.search(line):
            continue

        # Deduplicate (normalise whitespace and case for comparison)
        norm = re.sub(r'\s+', ' ', line).lower()
        if norm in seen:
            continue
        seen.add(norm)

        # Short unpunctuated phrases without verbs are headings → skip
        has_terminal      = bool(re.search(r'[.!?]$', line))
        has_internal_punct = bool(re.search(r'[,;]', line))
        has_verb          = bool(_HEADING_VERB_RE.search(line))
        if not has_terminal and not has_internal_punct and not has_verb and len(line.split()) <= 10:
            continue

        kept.append(line)

    return '\n'.join(kept)


def _clean_text(text: str) -> str:
    """Strip structural headings and noise from transcript text."""
    text = _rejoin_pdf_wraps(text)
    text = _strip_heading_lines(text)
    cleaned = _NOISE_RE.sub(" ", text)
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()
    return cleaned


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
            # Collect short follow-up sentences as sub-bullets
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
    Avoids procedure-list headers ("Langkah-langkah..."), bare noun
    phrases, and lines ending with ":".
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
def extractive_summarize(text: str, max_sentences: int = 8) -> str:
    """
    Filters noise, scores sentences, and formats a structured Markdown summary:
    TITLE → PENGENALAN → POIN UTAMA (with optional nested bullets) → KESIMPULAN.
    No AI model required — works instantly.
    """
    lang = _detect_language(text)
    cleaned = _clean_text(text)
    sentences = _split_sentences(cleaned)

    if not sentences:
        return cleaned[:1000]

    # ── Labels (bilingual) ──
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

    # ── Group nested sub-bullets ──
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
# STRATEGY B — LLM-Powered (OpenAI GPT-4o-mini)
# ═══════════════════════════════════════════════════════════════════════════
_OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")

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


def summarize_text_llm(text: str) -> str:
    """
    Strategy B: LLM-powered summarization via OpenAI API.
    Returns empty string on any failure or missing key.
    """
    if not _OPENAI_KEY:
        return ""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=_OPENAI_KEY)
        lang = _detect_language(text)
        lang_note = "The input is in Bahasa Melayu. All output MUST be in Bahasa Melayu." \
            if lang == "ms" else "The input is in English."

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user",   "content": f"{lang_note}\n\nTranscript:\n{_clean_text(text)[:6000]}"},
            ],
            temperature=0.4,
            max_tokens=1200,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"LLM summarizer failed: {e}")
        return ""


# ═══════════════════════════════════════════════════════════════════════════
# STRATEGY D — Ollama/Qwen (local LLM)
# ═══════════════════════════════════════════════════════════════════════════
def summarize_text_ollama(text: str) -> str:
    """
    Strategy D: Ollama/Qwen local LLM summarization.
    Uses OLLAMA_MODEL (default: qwen2.5:8b) via local Ollama server.
    Returns empty string on failure or if Ollama is offline.
    """
    ollama_host  = os.getenv("OLLAMA_HOST",  "http://localhost:11434")
    ollama_model = os.getenv("OLLAMA_MODEL", "qwen2.5:8b")
    try:
        import ollama as _ollama
        client = _ollama.Client(host=ollama_host)
        lang = _detect_language(text)
        lang_note = (
            "The input is in Bahasa Melayu. ALL output MUST be in Bahasa Melayu."
            if lang == "ms"
            else "The input is in English."
        )
        response = client.chat(
            model=ollama_model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user",   "content": f"{lang_note}\n\nTranscript:\n{_clean_text(text)[:5000]}"},
            ],
            options={"temperature": 0.2, "num_predict": 1200},
        )
        result = response["message"]["content"].strip()
        return result if len(result) > 50 else ""
    except Exception as e:
        print(f"Ollama summarizer failed: {e}")
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


def summarize_text_t5(text: str, max_length: int = 300, min_length: int = 80) -> str:
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

        lang = _detect_language(text)
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

    Priority:
      1. Strategy B (OpenAI) — if OPENAI_API_KEY is set in .env
      2. Strategy D (Ollama/Qwen) — if Ollama is running locally
      3. Strategy C (T5-small) — if USE_AI_SUMMARIZER=true in .env
      4. Strategy A (Extractive) — always available fallback
    """
    use_t5 = os.getenv("USE_AI_SUMMARIZER", "false").lower() == "true"

    # Strategy B — OpenAI LLM
    result = summarize_text_llm(text)
    if result:
        return result

    # Strategy D — Ollama/Qwen
    result = summarize_text_ollama(text)
    if result:
        return result

    # Strategy C — T5
    if use_t5:
        result = summarize_text_t5(text, max_length, min_length)
        if result:
            return result

    # Strategy A — Extractive (guaranteed fallback)
    return extractive_summarize(text, max_sentences=10)
