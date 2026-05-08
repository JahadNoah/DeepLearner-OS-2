"""
Multimodal Quiz Generator — DeepLearner v2
Generates higher-order MCQ questions from text, image, or text+image input
using Google Gemini 1.5 Flash (Vision Language Model).

Supported input modes:
  - Text only     (e.g. a lecture summary or extracted PDF text)
  - Image only    (e.g. a lecture slide, diagram, or flowchart)
  - Text + Image  (both combined as one knowledge source)

Falls back to NLP-enhanced quiz_generator (Strategy A) if Gemini is unavailable.

Output schema per question:
  {
    "soalan":         "Challenging question text",
    "pilihanJawapan": ["Distractor 1", "Distractor 2", "Distractor 3", "Correct Answer"],
    "jawapanBetul":   "Correct Answer",
    "penjelasan":     "Why this is correct, grounded in the input content."
  }
"""
import os
import re
import json
import base64
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

_GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")

# ─── System Prompt ──────────────────────────────────────────────────────────
_SYSTEM_PROMPT = """\
You are an expert educational assessment designer for the DeepLearner system.
Your task is to generate Multiple Choice Questions (MCQs) that test HIGH-ORDER
CONCEPTUAL UNDERSTANDING (Bloom's Taxonomy levels 3-5: Apply, Analyse, Evaluate).

STRICT RULES:
1. READ ALL INPUT carefully:
   - If text is provided: extract key facts, concepts, cause-effect relationships,
     definitions, and processes.
   - If an image is provided: perform full OCR on all visible text AND interpret
     visual relationships (arrows, flowchart steps, diagram labels, hierarchy).
   - If both are provided: synthesise them as one unified knowledge source.

2. QUESTION QUALITY:
   - Every question must REQUIRE THINKING — not just finding a word in the text.
   - Cover a mix of: definition/concept, cause-effect, application, comparison,
     process order, and diagram interpretation.
   - Do NOT repeat the question stem verbatim from the source.

3. DISTRACTORS (wrong answers):
   - All 3 distractors must be highly plausible and contextually relevant.
   - Base them on common misconceptions, related-but-wrong concepts, or
     inverted relationships (e.g. cause vs. effect swapped).
   - Never use obviously wrong or unrelated words.

4. LANGUAGE:
   - Detect the language of the input content (Bahasa Melayu or English).
   - Generate ALL output (soalan, pilihanJawapan, jawapanBetul, penjelasan)
     in that SAME language.

5. OUTPUT FORMAT:
   - Return ONLY a valid JSON array. No markdown fences, no extra text.
   - Each element must strictly follow this schema:
     {
       "soalan": "...",
       "pilihanJawapan": ["option1", "option2", "option3", "option4"],
       "jawapanBetul": "one of the four options exactly as written above",
       "penjelasan": "explanation grounded in the input text/image"
     }
"""


# ─── Helpers ────────────────────────────────────────────────────────────────
def _build_user_prompt(text: str, num_questions: int, has_image: bool) -> str:
    """Construct the user turn prompt."""
    input_parts = []
    if has_image:
        input_parts.append(
            "the provided image (perform full OCR and interpret all visual elements)"
        )
    if text.strip():
        input_parts.append("the provided text")

    source = " and ".join(input_parts) if input_parts else "the provided content"

    prompt = (
        f"Generate exactly {num_questions} MCQ questions based on {source}.\n"
        "Detect the language from the content and respond in that same language.\n\n"
    )
    if text.strip():
        prompt += f"Text content:\n{text[:4000]}\n\n"
    prompt += "Return a JSON array only."
    return prompt


def _validate_questions(data: object) -> list[dict]:
    """
    Validate and sanitise LLM output against the MCQ schema.
    Handles both bare arrays and wrapped objects.
    """
    # Unwrap common wrapper keys
    if isinstance(data, dict):
        for key in ("questions", "quiz", "mcq", "soalan", "items", "data", "kuiz"):
            if key in data and isinstance(data[key], list):
                data = data[key]
                break
        else:
            data = list(data.values())[0] if data else []

    if not isinstance(data, list):
        return []

    valid = []
    for item in data:
        if not isinstance(item, dict):
            continue
        soalan     = str(item.get("soalan", "")).strip()
        pilihan    = item.get("pilihanJawapan", [])
        jawapan    = str(item.get("jawapanBetul", "")).strip()
        penjelasan = str(item.get("penjelasan", "")).strip()

        if (
            soalan
            and isinstance(pilihan, list)
            and len(pilihan) == 4
            and all(isinstance(o, str) for o in pilihan)
            and jawapan in pilihan
        ):
            valid.append({
                "soalan":         soalan,
                "pilihanJawapan": pilihan,
                "jawapanBetul":   jawapan,
                "penjelasan":     penjelasan,
            })
    return valid


def _extract_json(raw: str) -> list[dict]:
    """
    Robustly extract and parse JSON from Gemini's response.
    Handles markdown fences (```json ... ```) and leading/trailing noise.
    """
    # Strip markdown fences
    raw = re.sub(r"```(?:json)?", "", raw, flags=re.IGNORECASE).strip().strip("`").strip()

    # Try direct parse first
    try:
        return _validate_questions(json.loads(raw))
    except json.JSONDecodeError:
        pass

    # Find outermost JSON array
    match = re.search(r'\[.*\]', raw, re.DOTALL)
    if match:
        try:
            return _validate_questions(json.loads(match.group()))
        except json.JSONDecodeError:
            pass

    # Find outermost JSON object (e.g. {"questions": [...]})
    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if match:
        try:
            return _validate_questions(json.loads(match.group()))
        except json.JSONDecodeError:
            pass

    return []


# ═══════════════════════════════════════════════════════════════════════════
# Core Multimodal Generation Function
# ═══════════════════════════════════════════════════════════════════════════
def generate_multimodal_quiz(
    text: str = "",
    image_bytes: Optional[bytes] = None,
    image_mime_type: Optional[str] = "image/jpeg",
    num_questions: int = 5,
) -> list[dict]:
    """
    Generate MCQ questions from text, image, or text+image input.

    Args:
        text:             Raw text content (lecture summary, extracted PDF text, etc.)
        image_bytes:      Raw bytes of an image (lecture slide, diagram, flowchart).
        image_mime_type:  MIME type of the image (image/jpeg, image/png, etc.)
        num_questions:    Number of questions to generate.

    Returns:
        List of question dicts: soalan, pilihanJawapan, jawapanBetul, penjelasan
        Falls back to NLP-based quiz_generator on any failure or missing API key.
    """
    if not text.strip() and not image_bytes:
        return []

    # ── Strategy: Gemini 1.5 Flash (VLM) ────────────────────────────────
    if _GEMINI_KEY:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=_GEMINI_KEY)

            # Build content parts list
            parts: list = []

            if image_bytes:
                parts.append(types.Part(
                    inline_data=types.Blob(
                        mime_type=image_mime_type or "image/jpeg",
                        data=image_bytes,
                    )
                ))

            parts.append(_build_user_prompt(text, num_questions, has_image=bool(image_bytes)))

            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[types.Content(role="user", parts=parts)],
                config=types.GenerateContentConfig(
                    system_instruction=_SYSTEM_PROMPT,
                    temperature=0.6,
                    max_output_tokens=2048,
                ),
            )

            questions = _extract_json(response.text)
            if questions:
                return questions[:num_questions]
            print("[multimodal_quiz] Gemini returned no valid questions — falling back.")

        except Exception as e:
            print(f"[multimodal_quiz] Gemini failed: {e} — falling back to NLP strategy.")

    # ── Fallback: NLP-enhanced quiz_generator (text only) ────────────────
    if text.strip():
        from services.quiz_generator import generate_quiz_nlp
        return generate_quiz_nlp(text, num_questions)

    return []
