"""
Shared Text Utilities — DeepLearner v2
Language detection, noise removal, and text cleaning shared across
summarizer and quiz_generator services.
"""
import re


# ─── Language Detection ─────────────────────────────────────────────────────
MALAY_MARKERS = {
    "yang", "dan", "atau", "pada", "di", "ke", "dari", "dengan", "untuk",
    "adalah", "ini", "itu", "juga", "oleh", "dalam", "tidak", "akan",
    "telah", "boleh", "lebih", "seperti", "apabila", "jika", "semua",
    "setiap", "antara", "iaitu", "kerana", "namun", "walau", "tetapi",
}


def detect_language(text: str) -> str:
    """Returns 'ms' for Malay or 'en' for English."""
    words = set(re.findall(r'\b\w+\b', text.lower()))
    return "ms" if len(words & MALAY_MARKERS) >= 3 else "en"


# ─── Deep Text Cleaner ──────────────────────────────────────────────────────
_NOISE_PATTERNS = [
    r"\[Halaman \d+\]",                         # page markers  [Halaman 3]
    r"Halaman\s+\d+\s*(daripada\s*\d+)?",       # Halaman 1 daripada 5
    r"\b\d{1,2}/\d{1,2}/\d{2,4},?\s*\d{1,2}:\d{2}\s*(AM|PM|am|pm)?\b",  # timestamps
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
    line starts with a lowercase letter, they are joined.
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
    Remove structural noise line-by-line:
    numbered headings, fraction-prefixed lines, slide fractions,
    short noun-phrase headings, image alt-text, consecutive duplicates.
    """
    kept = []
    seen: set = set()

    for raw_line in text.split('\n'):
        line = raw_line.strip()
        if not line:
            kept.append('')
            continue

        line = re.sub(r'\s+\d+/\d+\s*$', '', line).strip()
        if not line:
            continue

        if _HEADING_LINE_RE.match(line):
            continue

        if _IMAGE_DESC_RE.search(line):
            continue

        norm = re.sub(r'\s+', ' ', line).lower()
        if norm in seen:
            continue
        seen.add(norm)

        has_terminal      = bool(re.search(r'[.!?]$', line))
        has_internal_punct = bool(re.search(r'[,;]', line))
        has_verb          = bool(_HEADING_VERB_RE.search(line))
        if not has_terminal and not has_internal_punct and not has_verb and len(line.split()) <= 10:
            continue

        kept.append(line)

    return '\n'.join(kept)


def clean_text(text: str) -> str:
    """Strip structural headings and noise from transcript text."""
    text = _rejoin_pdf_wraps(text)
    text = _strip_heading_lines(text)
    cleaned = _NOISE_RE.sub(" ", text)
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()
    return cleaned
