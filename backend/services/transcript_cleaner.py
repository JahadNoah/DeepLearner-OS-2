"""
Transcript Cleaner — DeepLearner v2
Cleans raw Whisper transcripts using Qwen3-32B via Groq Cloud.

Removes filler words, stutters, false starts, and fixes punctuation/grammar
while strictly preserving the speaker's original meaning and language
(Bahasa Melayu or English — including code-switching).

Config via .env:
  GROQ_API_KEY=gsk_...           (required)
  GROQ_MODEL=qwen/qwen3-32b      (default)
"""
import re

# ─── System Prompt ──────────────────────────────────────────────────────────
_SYSTEM_PROMPT = """\
You are an expert bilingual transcript editor specialising in academic lectures.
Your ONLY job is to CLEAN the raw transcript text provided by the user.

STRICT RULES — follow every one without exception:
1. REMOVE all filler words and sounds: "umm", "uhh", "ahh", "err", "like",
   "you know", "kan", "lah", "eh", "aa", "emm", "erm", and all stutters or
   false starts (e.g. "I— I was" → "I was", "dia, dia cakap" → "dia cakap").
2. FIX punctuation, capitalisation, and basic grammar errors.
3. MERGE fragmented or run-on sentences into clean, readable paragraphs.
4. PRESERVE the speaker's original meaning, tone, and all factual content exactly.
5. PRESERVE the original language — Bahasa Melayu stays Bahasa Melayu, English
   stays English, code-switching stays code-switched. Do NOT translate.
   If the speaker uses Bahasa Melayu, the output MUST be Bahasa Melayu Malaysia
   (standard Dewan Bahasa dan Pustaka spelling and vocabulary) — NEVER Bahasa
   Indonesia. For example use "kerana" not "karena", "boleh" not "bisa",
   "anda" not "kamu/Anda", "wang" not "uang".
6. Do NOT summarise, shorten, paraphrase, or add any new information whatsoever.
7. Do NOT add headings, bullet points, or any formatting — output clean prose only.

Output ONLY the cleaned transcript text. No explanations, no commentary.
"""


def clean_transcript(raw_text: str) -> str:
    """
    Clean a raw Whisper transcript using Qwen3-32B via Groq Cloud.

    Sends the raw text to Groq and returns a cleaned, readable version.
    Falls back to light rule-based normalisation if Groq is unreachable
    or returns an empty response.

    Args:
        raw_text: Raw transcript string from Whisper (may contain noise,
                  filler words, stutters, and broken sentences).

    Returns:
        Cleaned transcript as a plain-text string.
    """
    if not raw_text or not raw_text.strip():
        return raw_text

    from services.groq_service import groq_chat

    cleaned = groq_chat(
        _SYSTEM_PROMPT,
        raw_text.strip(),
        temperature=0.1,
        max_tokens=4096,
    )

    if not cleaned or len(cleaned) < 10:
        print("[transcript_cleaner] Groq unavailable/empty — using light normalize.")
        return _light_normalize(raw_text)

    return cleaned


# ─── Light Normaliser (fallback when Ollama is offline) ─────────────────────
def _light_normalize(text: str) -> str:
    """
    Minimal rule-based cleanup when Ollama is unavailable.
    Strips the most common fillers and collapses whitespace.
    Not a replacement for Ollama — just keeps output readable.
    """
    en_fillers = r'\b(umm+|uhh+|ahh+|err+|hmm+|erm+|like|you know)\b'
    ms_fillers = r'\b(aa+|emm+|erm+|kan\b|lah\b|eh\b|ha\b)\b'

    cleaned = re.sub(en_fillers, '', text, flags=re.IGNORECASE)
    cleaned = re.sub(ms_fillers, '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r' {2,}', ' ', cleaned)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    return cleaned.strip()
