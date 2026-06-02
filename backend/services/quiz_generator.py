"""
Quiz Generator Service — DeepLearner v2
Generates higher-order MCQ questions from summary text.

Two generation strategies:
  A. NLP-Enhanced (spaCy + heuristics) — always available, no API key needed.
  B. Groq (llama-3.3-70b-versatile by default) — Bloom's-Taxonomy-level questions.

generate_quiz() priority: Groq (B) → NLP (A).
Groq is also used for background explanation enrichment.
"""
import os
import re
import json
import random
from typing import List, Optional, Dict
from dotenv import load_dotenv

from services.text_utils import detect_language

load_dotenv()

# spaCy is fully lazy — imported only when first needed, never at module load.
_NLP_EN = None
_SPACY_CHECKED = False


def _get_nlp():
    """Import spaCy and load en_core_web_sm on first call; returns None if unavailable."""
    global _NLP_EN, _SPACY_CHECKED
    if _SPACY_CHECKED:
        return _NLP_EN
    _SPACY_CHECKED = True
    try:
        import spacy
        _NLP_EN = spacy.load("en_core_web_sm")
    except (ImportError, OSError):
        _NLP_EN = None
    return _NLP_EN


# ─── Text Helpers ─────────────────────────────────────────────────────────

# Matches known structural/heading lines that should NOT become quiz sentences
_HEADER_LINE_RE = re.compile(
    r'^\s*(?:'
    r'\d+(?:\.\d+)*[\s\.]'                                           # "1. " "2.3 "
    r'|(?:ringkasan|pengenalan|poin\s+utama|kesimpulan|'
    r'introduction|key\s+points?|conclusion|summary)\s*[:/]?\s*$'   # section labels alone
    r')',
    re.IGNORECASE,
)


def _is_heading_line(line: str) -> bool:
    """Return True if a line is a structural heading rather than a content sentence."""
    if _HEADER_LINE_RE.match(line):
        return True
    # Lines ending with ':' are header labels (e.g. "Tajuk:")
    if line.endswith(':'):
        return True
    # Short phrase with no sentence-internal punctuation and no terminal '.!?' →
    # almost certainly a subheading (e.g. "Latar Belakang Negara Bangsa Sebelum Kedatangan Barat")
    has_terminal = bool(re.search(r'[.!?]$', line))
    has_internal_punct = bool(re.search(r'[,;]', line))
    if not has_terminal and not has_internal_punct and len(line.split()) <= 12:
        return True
    return False


def extract_sentences(text: str) -> List[str]:
    """
    Split structured summary text into clean, content-bearing sentences.

    Improvements over a simple regex split:
    - Strips markdown formatting AND leading bullet markers.
    - Skips structural/heading lines (numbered sections, section labels,
      short unpunctuated noun phrases) so they never appear in quiz context.
    - Joins wrapped content lines (lines without terminal .!?) into the
      complete sentence they belong to before splitting.
    """
    plain = re.sub(r"[*_#`~]", "", text)
    plain = re.sub(r"📄", "", plain)

    sentences: List[str] = []
    buffer = ""

    for raw_line in plain.split('\n'):
        line = raw_line.strip()
        # Strip leading bullet markers (-, •)
        line = re.sub(r'^[-•]\s*', '', line)

        if not line:
            # Empty line: flush whatever is in the buffer
            if buffer.strip():
                parts = re.split(r'(?<=[.!?])\s+', buffer.strip())
                sentences.extend(p.strip() for p in parts if p.strip())
                buffer = ""
            continue

        if _is_heading_line(line):
            # Flush buffer and discard this heading line
            if buffer.strip():
                parts = re.split(r'(?<=[.!?])\s+', buffer.strip())
                sentences.extend(p.strip() for p in parts if p.strip())
                buffer = ""
            continue

        # Accumulate content into the buffer
        buffer = (buffer + " " + line).strip()

        # If the line ends a sentence, flush the buffer
        if re.search(r'[.!?]$', line):
            parts = re.split(r'(?<=[.!?])\s+', buffer.strip())
            sentences.extend(p.strip() for p in parts if p.strip())
            buffer = ""

    # Flush any remaining content
    if buffer.strip():
        parts = re.split(r'(?<=[.!?])\s+', buffer.strip())
        sentences.extend(p.strip() for p in parts if p.strip())

    return [s for s in sentences if len(s.split()) >= 6]


STOP_WORDS = {
    # Malay
    "yang", "dan", "atau", "pada", "di", "ke", "dari", "dengan", "untuk",
    "adalah", "ini", "itu", "juga", "oleh", "dalam", "tidak", "akan",
    "telah", "boleh", "lebih", "seperti", "apabila", "jika", "semua",
    "setiap", "antara", "mereka", "kita", "kami", "saya", "anda",
    # English
    "the", "a", "an", "is", "are", "was", "were", "in", "on", "at",
    "to", "for", "of", "and", "or", "it", "this", "that", "with",
    "by", "as", "be", "been", "has", "have", "had", "but", "not",
}


# ═══════════════════════════════════════════════════════════════════════════
# SOLUTION A — NLP-Enhanced (spaCy + heuristics)
# ═══════════════════════════════════════════════════════════════════════════

# ─── A1: Keyword / Entity Extraction ──────────────────────────────────────
def _extract_nouns_spacy(sentence: str) -> List[str]:
    """Return NOUN/PROPN tokens via spaCy POS tagging (English)."""
    nlp = _get_nlp()
    if not nlp:
        return []
    doc = nlp(sentence)
    return [
        token.text for token in doc
        if token.pos_ in ("NOUN", "PROPN") and not token.is_stop and len(token.text) > 3
    ]


def _extract_keywords_fallback(sentence: str) -> List[str]:
    """Heuristic keyword extraction: filters stop words; lifts capitalised terms."""
    words = sentence.split()
    candidates = [
        w.strip(".,!?;:\"'()")
        for w in words
        if len(w) > 4
        and w.lower().strip(".,!?;:\"'()") not in STOP_WORDS
        and not w.isdigit()
        and w.isalpha()
    ]
    caps = [w for w in candidates if w[0].isupper()]
    rest = [w for w in candidates if not w[0].isupper()]
    return caps + rest


def extract_keywords(sentence: str) -> List[str]:
    """Extract keywords; prefer spaCy nouns, fall back to heuristic."""
    nouns = _extract_nouns_spacy(sentence)
    return nouns if nouns else _extract_keywords_fallback(sentence)


def _extract_entity_map(text: str) -> Dict[str, List[str]]:
    """
    Extract named entities grouped by label using spaCy.
    E.g. {"PERSON": ["Ahmad", "Siti"], "ORG": ["UTM", "MARA"]}
    Returns an empty dict when spaCy is unavailable.
    """
    nlp = _get_nlp()
    if not nlp:
        return {}
    doc = nlp(text[:10_000])
    entity_map: Dict[str, List[str]] = {}
    for ent in doc.ents:
        entity_map.setdefault(ent.label_, []).append(ent.text)
    return entity_map


# ─── A2: Plausible Distractor Generation ──────────────────────────────────
def _same_type_distractors(
    correct: str,
    entity_map: Dict[str, List[str]],
    n: int = 3,
) -> List[str]:
    """Return entities of the same NER label as `correct` (most plausible distractors)."""
    for entities in entity_map.values():
        if any(correct.lower() == e.lower() for e in entities):
            pool = [e for e in entities if e.lower() != correct.lower()]
            if len(pool) >= n:
                return random.sample(pool, n)
    return []


def generate_distractors(
    correct: str,
    sentence_keywords: List[str],
    global_keywords: List[str],
    entity_map: Dict[str, List[str]],
    n: int = 3,
) -> List[str]:
    """
    Build n plausible wrong-answer options.
    Priority: same NER type  →  same-sentence keywords  →  global keyword pool.
    """
    typed = _same_type_distractors(correct, entity_map, n)
    if len(typed) >= n:
        return typed[:n]

    same = [kw for kw in sentence_keywords if kw.lower() != correct.lower()]
    random.shuffle(same)
    global_pool = [
        kw for kw in global_keywords
        if kw.lower() != correct.lower()
        and kw.lower() not in {k.lower() for k in same}
    ]
    random.shuffle(global_pool)

    combined = typed + same + global_pool
    seen: set = set()
    unique: List[str] = []
    for kw in combined:
        if kw.lower() not in seen:
            seen.add(kw.lower())
            unique.append(kw)
        if len(unique) == n:
            break
    return unique


# ─── A3: Smart Sentence Negation (for True/False) ─────────────────────────
_NEGATE_EN = [
    (r'\bcan\b',        'cannot'),
    (r'\bcannot\b',     'can'),
    (r'\bis\b',         'is not'),
    (r'\bare\b',        'are not'),
    (r'\bwas\b',        'was not'),
    (r'\bwere\b',       'were not'),
    (r'\bwill\b',       'will not'),
    (r'\bhas\b',        'has not'),
    (r'\bhave\b',       'have not'),
    (r'\bincreases?\b', 'decreases'),
    (r'\bdecreases?\b', 'increases'),
    (r'\bhigher\b',     'lower'),
    (r'\blower\b',      'higher'),
    (r'\bmore\b',       'less'),
    (r'\bless\b',       'more'),
    (r'\bfirst\b',      'last'),
    (r'\blast\b',       'first'),
    (r'\blargest?\b',   'smallest'),
    (r'\bsmallest?\b',  'largest'),
    (r'\bmajority\b',   'minority'),
    (r'\bprimary\b',    'secondary'),
]

_NEGATE_MS = [
    (r'\badalah\b',      'bukan'),
    (r'\bbukan\b',       'adalah'),
    (r'\bboleh\b',       'tidak boleh'),
    (r'\btidak boleh\b', 'boleh'),
    (r'\bmeningkat\b',   'menurun'),
    (r'\bmenurun\b',     'meningkat'),
    (r'\blebih\b',       'kurang'),
    (r'\bkurang\b',      'lebih'),
    (r'\bpertama\b',     'terakhir'),
    (r'\bterakhir\b',    'pertama'),
    (r'\butama\b',       'sampingan'),
    (r'\btinggi\b',      'rendah'),
    (r'\brendah\b',      'tinggi'),
    (r'\bbesar\b',       'kecil'),
    (r'\bkecil\b',       'besar'),
    (r'\bsemua\b',       'sebahagian'),
    (r'\bsentiasa\b',    'tidak pernah'),
]


def _negate_sentence(sentence: str, lang: str) -> Optional[str]:
    """Apply one random negation pattern to produce a false version of the sentence."""
    patterns = _NEGATE_MS if lang == "ms" else _NEGATE_EN
    shuffled = patterns.copy()
    random.shuffle(shuffled)
    for pattern, replacement in shuffled:
        if re.search(pattern, sentence, re.IGNORECASE):
            negated = re.sub(pattern, replacement, sentence, count=1, flags=re.IGNORECASE)
            if negated.lower() != sentence.lower():
                return negated
    return None


def _swap_entity(sentence: str, entity_map: Dict[str, List[str]]) -> Optional[str]:
    """Replace one named entity with a different entity of the same type."""
    for entities in entity_map.values():
        for ent in entities:
            if ent in sentence and len(entities) > 1:
                alt = random.choice([e for e in entities if e != ent])
                return sentence.replace(ent, alt, 1)
    return None


def _mutate_number(sentence: str) -> Optional[str]:
    """Replace a numeric value with a different one."""
    numbers = re.findall(r'\b\d+(?:\.\d+)?\b', sentence)
    if not numbers:
        return None
    target = random.choice(numbers)
    val = float(target)
    new_val = val * random.choice([0.2, 0.5, 2.0, 3.0])
    new_str = str(int(new_val)) if new_val == int(new_val) else f"{new_val:.1f}"
    return sentence.replace(target, new_str, 1) if new_str != target else None


def _make_false_sentence(
    sentence: str, lang: str, entity_map: Dict[str, List[str]]
) -> Optional[str]:
    """Try negation, entity-swap, and number mutation to create a false sentence."""
    strategies = [
        lambda: _negate_sentence(sentence, lang),
        lambda: _swap_entity(sentence, entity_map),
        lambda: _mutate_number(sentence),
    ]
    random.shuffle(strategies)
    for strategy in strategies:
        result = strategy()
        if result:
            return result
    return None


# ─── A4: Question Template Builders ───────────────────────────────────────
def _make_blank_question(
    sentence: str,
    sentence_keywords: List[str],
    global_keywords: List[str],
    entity_map: Dict[str, List[str]],
    lang: str,
) -> Optional[dict]:
    """Template 1 — Fill-in-the-blank with entity-aware distractors."""
    if not sentence_keywords:
        return None
    # Prefer capitalised terms (likely proper nouns / key concepts)
    priority = [kw for kw in sentence_keywords if kw[0].isupper()] or sentence_keywords
    correct = random.choice(priority)
    blanked = re.sub(re.escape(correct), "______", sentence, count=1)

    if lang == "ms":
        question_text = f"Apakah perkataan yang tepat untuk melengkapkan ayat berikut?\n\"{blanked}\""
    else:
        question_text = f"Which word best completes the following sentence?\n\"{blanked}\""

    distractors = generate_distractors(correct, sentence_keywords, global_keywords, entity_map)
    if len(distractors) < 3:
        return None
    options = distractors[:3] + [correct]
    random.shuffle(options)
    penjelasan = (
        f"Jawapan betul ialah '{correct}'. Pilihan lain ({', '.join(distractors[:3])}) adalah kata kunci lain daripada teks yang tidak sesuai dalam konteks ayat ini."
        if lang == "ms" else
        f"The correct answer is '{correct}'. The other options ({', '.join(distractors[:3])}) are keywords from the text but do not fit this context."
    )
    return {"soalan": question_text, "pilihanJawapan": options, "jawapanBetul": correct, "penjelasan": penjelasan}


def _make_factual_question(
    sentence: str,
    sentence_keywords: List[str],
    global_keywords: List[str],
    entity_map: Dict[str, List[str]],
    lang: str,
) -> Optional[dict]:
    """Template 2 — Conceptual identification using a hidden-blank framing."""
    if not sentence_keywords:
        return None
    correct = random.choice(sentence_keywords)
    context = re.sub(re.escape(correct), "______", sentence, count=1)

    if lang == "ms":
        question_text = (
            f"Berdasarkan ayat berikut, apakah konsep atau entiti yang paling tepat untuk '______'?\n"
            f"\"{context}\""
        )
    else:
        question_text = (
            f"Based on the following statement, which concept or entity best fits '______'?\n"
            f"\"{context}\""
        )

    distractors = generate_distractors(correct, sentence_keywords, global_keywords, entity_map)
    if len(distractors) < 3:
        return None
    options = distractors[:3] + [correct]
    random.shuffle(options)
    penjelasan = (
        f"Jawapan betul ialah '{correct}'. Ayat asal: \"{sentence}\" — pilihan lain ({', '.join(distractors[:3])}) tidak memenuhi konteks ini."
        if lang == "ms" else
        f"The correct answer is '{correct}'. Original sentence: \"{sentence}\" — other options ({', '.join(distractors[:3])}) do not fit this context."
    )
    return {"soalan": question_text, "pilihanJawapan": options, "jawapanBetul": correct, "penjelasan": penjelasan}


def _make_truefalse_question(
    sentence: str,
    lang: str,
    entity_map: Dict[str, List[str]],
) -> Optional[dict]:
    """
    Template 3 — Smart True/False.
    50 % chance the displayed sentence is deliberately mutated (false),
    so 'Salah / False' is a genuine possible correct answer.
    """
    if len(sentence.split()) < 6:
        return None

    present_false = random.random() < 0.5
    displayed = sentence
    if present_false:
        mutated = _make_false_sentence(sentence, lang, entity_map)
        if mutated:
            displayed = mutated
        else:
            present_false = False  # mutation failed, fall back to true

    if lang == "ms":
        question_text = f"Adakah kenyataan berikut BENAR atau SALAH?\n\"{displayed}\""
        correct = "Salah" if present_false else "Benar"
        options = ["Benar", "Salah"]
    else:
        question_text = f"Is the following statement TRUE or FALSE?\n\"{displayed}\""
        correct = "False" if present_false else "True"
        options = ["True", "False"]
    if lang == "ms":
        if present_false:
            penjelasan = f"Kenyataan yang dipaparkan adalah SALAH. Ayat yang betul ialah: \"{sentence}\""
        else:
            penjelasan = f"Kenyataan ini adalah BENAR. Ia disokong oleh teks asal: \"{sentence}\""
    else:
        if present_false:
            penjelasan = f"The displayed statement is FALSE. The correct statement is: \"{sentence}\""
        else:
            penjelasan = f"This statement is TRUE, supported by the source text: \"{sentence}\""
    return {"soalan": question_text, "pilihanJawapan": options, "jawapanBetul": correct, "penjelasan": penjelasan}


# ─── A5: Question Type Selector ───────────────────────────────────────────
_TEMPLATES = ["blank", "factual", "truefalse"]
_WEIGHTS   = [0.40,    0.40,      0.20]


def _build_question(
    sentence: str,
    sentence_keywords: List[str],
    global_keywords: List[str],
    entity_map: Dict[str, List[str]],
    lang: str,
    used_types: List[str],
) -> Optional[dict]:
    """Select a template (avoiding repetition) and attempt to build a question."""
    for _ in range(3):
        if len(used_types) >= 2 and len(set(used_types[-2:])) == 1:
            available = [t for t in _TEMPLATES if t != used_types[-1]]
            w = [_WEIGHTS[_TEMPLATES.index(t)] for t in available]
        else:
            available = _TEMPLATES
            w = _WEIGHTS

        chosen = random.choices(available, weights=w, k=1)[0]
        used_types.append(chosen)

        if chosen == "blank":
            q = _make_blank_question(sentence, sentence_keywords, global_keywords, entity_map, lang)
        elif chosen == "factual":
            q = _make_factual_question(sentence, sentence_keywords, global_keywords, entity_map, lang)
        else:
            q = _make_truefalse_question(sentence, lang, entity_map)

        if q is not None:
            return q
    return None


def generate_quiz_nlp(summary_text: str, num_questions: int = 5) -> List[dict]:
    """
    Strategy A: NLP-enhanced question generation.
    Always available — no API key required.
    """
    lang = detect_language(summary_text)
    sentences = extract_sentences(summary_text)
    if not sentences:
        return []

    entity_map = _extract_entity_map(summary_text)
    all_keywords = list({kw for s in sentences for kw in extract_keywords(s)})

    questions: List[dict] = []
    used_sentences: set = set()
    used_types: List[str] = []
    shuffled = sentences.copy()
    random.shuffle(shuffled)

    for sentence in shuffled:
        if len(questions) >= num_questions:
            break
        if sentence in used_sentences:
            continue
        sentence_keywords = extract_keywords(sentence)
        q = _build_question(sentence, sentence_keywords, all_keywords, entity_map, lang, used_types)
        if q:
            questions.append(q)
            used_sentences.add(sentence)

    return questions


# ═══════════════════════════════════════════════════════════════════════════
# STRATEGY B — Groq (llama-3.3-70b-versatile by default)
# ═══════════════════════════════════════════════════════════════════════════
_SYSTEM_PROMPT = """You are an expert educational assessment designer specialising in Bloom's Taxonomy.
Generate Multiple Choice Questions that test conceptual understanding, application, and analysis —
NOT simple recall or verbatim copying from the text.

Rules:
- Every question must require thinking, not just finding words in the source text.
- All 4 options must be plausible and contextually relevant.
- Distractors must represent common misconceptions or related-but-wrong concepts.
- Cover a mix of: definition, cause-effect, application, comparison.
- For True/False style questions: include BOTH true and false statements.
- Match the language of the input text. If the input is in Bahasa Melayu, output MUST be STANDARD BAHASA MELAYU MALAYSIA (DBP standard, as used in Malaysian schools). DO NOT use Bahasa Indonesia vocabulary, slang, or particles. Use "kerajaan" not "pemerintah", "wang" not "uang", "boleh" not "bisa", "sahaja" not "saja", "anda" not "kalian", "mengapa" not "kenapa", "bagaimana" not "gimana". No Indonesian particles ("lho", "deh", "kok", "sih", "banget", "nih", "udah").
- Return ONLY a valid JSON array. No markdown fences, no extra text.
- Each object MUST include a 'penjelasan' field: explain in 1-2 sentences why the correct answer is right AND briefly why each wrong option is incorrect.
"""


def _extract_json_array(raw: str) -> list:
    """Extract a JSON array from LLM output that may contain markdown fences or wrapper objects."""
    raw = re.sub(r"```(?:json)?\s*", "", raw).strip().strip("`").strip()
    # Try direct parse first
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict):
            for key in ("questions", "quiz", "mcq", "items", "data"):
                if key in parsed and isinstance(parsed[key], list):
                    return parsed[key]
            vals = list(parsed.values())
            if vals and isinstance(vals[0], list):
                return vals[0]
    except json.JSONDecodeError:
        pass
    # Fallback: find JSON array via regex
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if match:
        return json.loads(match.group())
    return []


_LETTER_TO_INDEX = {"A": 0, "B": 1, "C": 2, "D": 3}


def _validate_llm_response(data: list) -> List[dict]:
    """Validate and sanitize LLM output against the expected question schema."""
    if not isinstance(data, list):
        return []

    valid = []
    for item in data:
        if not isinstance(item, dict):
            continue
        soalan  = item.get("soalan", "").strip()
        pilihan = item.get("pilihanJawapan", [])
        jawapan = item.get("jawapanBetul", "").strip()
        penjelasan = item.get("penjelasan", "").strip()
        if not (soalan and isinstance(pilihan, list) and len(pilihan) in (2, 4)):
            continue
        # If model emitted a letter (A/B/C/D) instead of the full option text,
        # remap it to the corresponding entry in pilihanJawapan.
        if jawapan.upper() in _LETTER_TO_INDEX and len(pilihan) == 4:
            idx = _LETTER_TO_INDEX[jawapan.upper()]
            jawapan = str(pilihan[idx]).strip()
        if jawapan in pilihan:
            valid.append({"soalan": soalan, "pilihanJawapan": pilihan, "jawapanBetul": jawapan, "penjelasan": penjelasan})
    return valid


def generate_quiz_groq(summary_text: str, num_questions: int = 5) -> List[dict]:
    """
    Strategy B: Groq-powered MCQ generation (llama-3.3-70b-versatile default).
    Produces higher-order thinking questions (Bloom's Taxonomy levels 2-4).
    Requires GROQ_API_KEY in .env. Returns [] on any failure.
    """
    from services.groq_client import chat as groq_chat
    lang = detect_language(summary_text)
    lang_label = "in Bahasa Melayu" if lang == "ms" else "in English"

    user_prompt = (
        f"Generate exactly {num_questions} MCQ questions {lang_label} from the educational "
        f"summary below. Each question must have exactly 4 options and one correct answer.\n\n"
        f"Summary:\n{summary_text[:5000]}\n\n"
        f"CRITICAL JSON RULES:\n"
        f"- 'pilihanJawapan' must contain the FULL ANSWER TEXT for each of the 4 options "
        f"(NOT placeholders like 'A','B','C','D').\n"
        f"- 'jawapanBetul' must be the EXACT, VERBATIM STRING of one of the 4 options "
        f"(NOT a letter like 'A' or 'B'). It must match one entry in 'pilihanJawapan' character-for-character.\n"
        f"- 'penjelasan' explains why the correct option is right and why each of the other 3 options is wrong.\n\n"
        f"Return ONLY a valid JSON array, no markdown fences, no extra text:\n"
        f'[{{"soalan": "<question>", "pilihanJawapan": ["<option1 full text>", "<option2 full text>", "<option3 full text>", "<option4 full text>"], "jawapanBetul": "<one of the four option strings, verbatim>", "penjelasan": "<reasoning>"}}]'
    )

    raw = groq_chat(_SYSTEM_PROMPT, user_prompt, temperature=0.6, max_tokens=2048)
    if not raw:
        return []

    parsed = _extract_json_array(raw)
    return _validate_llm_response(parsed)[:num_questions]


# ═══════════════════════════════════════════════════════════════════════════
# Explanation Enrichment — upgrades NLP template explanations via LLM
# ═══════════════════════════════════════════════════════════════════════════
_EXPLAIN_SYSTEM = """\
You are an educational tutor. Given a list of quiz questions, rewrite the 'penjelasan' field
for each question with clear, pedagogically useful reasoning:
- Explain WHY the correct answer is right (reference the underlying concept).
- Briefly explain why each wrong option is incorrect (1 sentence each).
- Keep language consistent with the question (Bahasa Melayu or English).
- Be concise: 2-4 sentences total per question.
Return ONLY a valid JSON array with the same length as the input, each object having exactly
two keys: "index" (integer, same as input) and "penjelasan" (string).
No markdown fences, no extra text.
"""


def _enrich_explanations(questions: List[dict], summary_text: str) -> List[dict]:
    """
    Replace template-based penjelasan with LLM-generated reasoning via Groq.
    Falls back to the original template explanations on any error.
    Processes all questions in one batch call for efficiency.
    """
    if not questions:
        return questions

    # Build compact batch payload for the LLM
    batch = [
        {
            "index": i,
            "soalan": q["soalan"],
            "pilihanJawapan": q["pilihanJawapan"],
            "jawapanBetul": q["jawapanBetul"],
        }
        for i, q in enumerate(questions)
    ]
    lang = detect_language(summary_text)
    lang_note = (
        "All penjelasan MUST be written in STANDARD BAHASA MELAYU MALAYSIA (DBP standard). "
        "DO NOT use Bahasa Indonesia vocabulary or slang. Use 'kerajaan' (not 'pemerintah'), "
        "'wang' (not 'uang'), 'boleh' (not 'bisa'), 'sahaja' (not 'saja'), 'anda' (not 'kalian'), "
        "'mengapa' (not 'kenapa'), 'bagaimana' (not 'gimana'). No Indonesian particles."
        if lang == "ms"
        else "All penjelasan must be written in English."
    )
    user_prompt = (
        f"{lang_note}\n\n"
        f"Context (source summary):\n{summary_text[:2000]}\n\n"
        f"Questions:\n{json.dumps(batch, ensure_ascii=False)}\n\n"
        f'Return JSON array: [{{"index": 0, "penjelasan": "..."}}]'
    )

    # ── Enrich via Groq ──
    from services.groq_client import chat as groq_chat
    raw = groq_chat(_EXPLAIN_SYSTEM, user_prompt, temperature=0.3, max_tokens=1500)

    if not raw:
        return questions  # keep original template explanations

    # ── Parse and merge enriched explanations ──
    try:
        enriched = _extract_json_array(raw)
        if not enriched:
            return questions
        enriched_map = {
            item["index"]: item["penjelasan"]
            for item in enriched
            if isinstance(item, dict) and "index" in item and "penjelasan" in item
        }
        result = []
        for i, q in enumerate(questions):
            q_copy = dict(q)
            if i in enriched_map and enriched_map[i].strip():
                q_copy["penjelasan"] = enriched_map[i].strip()
            result.append(q_copy)
        return result
    except Exception as e:
        print(f"Explanation enrichment parse failed: {e}")
        return questions


def enrich_and_save(questions_with_ids: list, summary_text: str) -> None:
    """
    Background-safe function: enriches NLP template explanations via LLM
    and updates each question doc in Firestore.
    Call this from a FastAPI BackgroundTask — never block the response on it.
    Always marks docs as "ready" when finished (even if enrichment failed).
    """
    from firebase_config import get_firestore
    db = get_firestore()
    try:
        # Extract just the question dicts for enrichment
        questions = [{k: v for k, v in q.items() if k != "idKuiz"} for q in questions_with_ids]
        enriched = _enrich_explanations(questions, summary_text)
        for original, eq in zip(questions_with_ids, enriched):
            id_kuiz = original.get("idKuiz")
            if not id_kuiz:
                continue
            update = {"status": "ready"}
            new_penjelasan = eq.get("penjelasan", "")
            if new_penjelasan and new_penjelasan != original.get("penjelasan", ""):
                update["penjelasan"] = new_penjelasan
            db.collection("kuiz").document(id_kuiz).update(update)
    except Exception as e:
        print(f"Background enrichment failed: {e}")
        # Ensure all docs are marked ready so frontend doesn't poll forever
        for q in questions_with_ids:
            id_kuiz = q.get("idKuiz")
            if id_kuiz:
                try:
                    db.collection("kuiz").document(id_kuiz).update({"status": "ready"})
                except Exception:
                    pass


# ═══════════════════════════════════════════════════════════════════════════
# Main Entry Point
# ═══════════════════════════════════════════════════════════════════════════
def generate_quiz(summary_text: str, num_questions: int = 5) -> List[dict]:
    """
    Generates MCQ quiz questions from a summary text.

    Priority: Strategy B (Groq) → Strategy A (NLP).
    Background enrichment via enrich_and_save() also routes through Groq.

    Args:
        summary_text:  The summarized text to generate questions from.
        num_questions: Number of MCQ questions to generate.

    Returns:
        List of dicts with keys: soalan, pilihanJawapan, jawapanBetul, penjelasan
    """
    # Strategy B — Groq (fast, high-quality HOT questions)
    questions = generate_quiz_groq(summary_text, num_questions)
    if len(questions) >= num_questions:
        return questions

    # Strategy A — NLP (instant; explanations will be enriched in background)
    remaining = num_questions - len(questions)
    nlp_questions = generate_quiz_nlp(summary_text, remaining)

    # Return immediately — enrichment happens in the background via enrich_and_save()
    return (questions + nlp_questions)[:num_questions]
