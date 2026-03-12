"""
Transcript Cleaner — DeepLearner v2
Cleans raw Whisper transcripts using a local Qwen model via Ollama.

Removes filler words, stutters, false starts, and fixes punctuation/grammar
while strictly preserving the speaker's original meaning and language
(Bahasa Melayu or English — including code-switching).

Requires Ollama running locally:
  brew install ollama
  ollama pull qwen2.5:8b
  ollama serve          # starts automatically on macOS after install

Config via .env:
  OLLAMA_MODEL=qwen2.5:8b       (default)
  OLLAMA_HOST=http://localhost:11434  (default)
"""
import os
import re
from dotenv import load_dotenv

load_dotenv()

_OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:8b")
_OLLAMA_HOST  = os.getenv("OLLAMA_HOST",  "http://localhost:11434")

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
6. Do NOT summarise, shorten, paraphrase, or add any new information whatsoever.
7. Do NOT add headings, bullet points, or any formatting — output clean prose only.

Output ONLY the cleaned transcript text. No explanations, no commentary.
"""


def clean_transcript(raw_text: str) -> str:
    """
    Clean a raw Whisper transcript using a local Qwen model via Ollama.

    Sends the raw text to the local Ollama server and returns a cleaned,
    readable version. Falls back to light rule-based normalisation if
    Ollama is unreachable or returns an empty response.

    Args:
        raw_text: Raw transcript string from Whisper (may contain noise,
                  filler words, stutters, and broken sentences).

    Returns:
        Cleaned transcript as a plain-text string.
    """
    if not raw_text or not raw_text.strip():
        return raw_text

    try:
        import ollama

        client = ollama.Client(host=_OLLAMA_HOST)

        response = client.chat(
            model=_OLLAMA_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user",   "content": raw_text.strip()},
            ],
            options={
                "temperature":    0.1,   # strict formatting — no creative output
                "repeat_penalty": 1.1,   # penalise transcript-style repetition
                "num_predict":    4096,  # enough tokens for a full lecture
            },
        )

        cleaned = response["message"]["content"].strip()

        if not cleaned or len(cleaned) < 10:
            print("[transcript_cleaner] Ollama returned empty response — using raw text.")
            return _light_normalize(raw_text)

        return cleaned

    except ImportError:
        print("[transcript_cleaner] 'ollama' package not installed. Run: pip install ollama")
        return _light_normalize(raw_text)

    except Exception as e:
        # Covers: Ollama not running, model not pulled, timeout, etc.
        print(f"[transcript_cleaner] Ollama unavailable ({type(e).__name__}: {e}) "
              "— using raw text.")
        return _light_normalize(raw_text)


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
