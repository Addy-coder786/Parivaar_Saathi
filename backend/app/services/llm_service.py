"""The ONLY module that talks to an LLM provider.

Providers (config.LLM_PROVIDER): "anthropic" via the Anthropic SDK, or "groq" / "openai_compatible"
via the OpenAI-style chat-completions API that Groq, Ollama, OpenRouter and others expose.

The LLM classifies and phrases; it never supplies facts. Evidence comes from the dataset.
When no API key is configured (or APP_MODE=demo), callers use the deterministic Demo Scenario
Mode path — `is_enabled()` tells them which one applies. Every public call here raises on
failure so the pipeline can fall back to rules/templates.
"""
import json
import re
import time
import urllib.error
import urllib.request

import anthropic

from app import config
from app.seed_data import TRADES

OBJECTIONS = ["income", "employment", "safety", "social_status", "distance", "placement"]
PARENT_INTENTS = ["objection", "refusal", "acceptance", "parent_message"]
LEARNER_INTENTS = ["learner_goal", "learner_message"]

# Phrases the product must never emit (master context §23).
BANNED_PATTERNS = [r"guaranteed", r"100\s*%", r"world'?s first", r"zero hallucination", r"pakki naukri", r"\bpakka\b"]

_client: anthropic.Anthropic | None = None


def is_configured() -> bool:
    if config.LLM_PROVIDER == "openai_compatible":
        return bool(config.LLM_BASE_URL)  # a local server (Ollama) needs no key
    return bool(config.LLM_API_KEY)


def is_enabled() -> bool:
    return is_configured() and config.APP_MODE != "demo"


def mode() -> str:
    return "llm" if is_enabled() else "demo"


def describe() -> dict:
    """Non-secret description of the configured provider for /meta and /health."""
    return {"provider": config.LLM_PROVIDER, "model": config.LLM_MODEL if is_enabled() else None,
            "base_url": config.LLM_BASE_URL if config.LLM_PROVIDER != "anthropic" else None}


# --- Anthropic SDK path -------------------------------------------------------------------

def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        # Short timeout and a single retry: a slow LLM must never stall the demo — the pipeline falls back.
        _client = anthropic.Anthropic(api_key=config.LLM_API_KEY, timeout=config.LLM_TIMEOUT, max_retries=1)
    return _client


def _anthropic_call(system: str, user: str, max_tokens: int, schema: dict | None) -> str:
    output_config: dict = {"effort": "low"}
    if schema:
        output_config["format"] = {"type": "json_schema", "schema": schema}
    response = _get_client().messages.create(
        model=config.LLM_MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
        output_config=output_config,
    )
    if response.stop_reason == "refusal":
        raise RuntimeError("LLM declined the request")
    return "".join(b.text for b in response.content if b.type == "text").strip()


# --- OpenAI-compatible path (Groq, Ollama, OpenRouter, ...) ------------------------------------

def _openai_compatible_call(system: str, user: str, max_tokens: int, schema: dict | None) -> str:
    # Cloudflare in front of hosted providers (Groq) rejects Python's default urllib signature (error 1010).
    headers = {"Content-Type": "application/json", "Accept": "application/json",
               "User-Agent": "ParivaarSaathi-prototype/0.1 (SIH26241; +python-stdlib)"}
    if config.LLM_API_KEY:
        headers["Authorization"] = f"Bearer {config.LLM_API_KEY}"
    if schema:
        # JSON mode guarantees valid JSON but not a shape, so the schema rides in the prompt and
        # the caller validates every field against its enums.
        user = f"{user}\n\nRespond with a single JSON object matching this JSON schema exactly:\n{json.dumps(schema)}"
    body = {
        "model": config.LLM_MODEL,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "max_tokens": max_tokens,
        "temperature": 0.2,
    }
    if schema:
        body["response_format"] = {"type": "json_object"}
    if "gpt-oss" in config.LLM_MODEL:
        # Reasoning model: keep thinking short so replies stay fast; reasoning tokens count against max_tokens.
        body["reasoning_effort"] = "low"
    req = urllib.request.Request(f"{config.LLM_BASE_URL.rstrip('/')}/chat/completions", method="POST",
                                 data=json.dumps(body).encode("utf-8"), headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=config.LLM_TIMEOUT) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"LLM HTTP {e.code}: {e.read().decode('utf-8', 'replace')[:200]}") from None
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        raise RuntimeError(f"LLM connection error: {getattr(e, 'reason', e)}") from None
    choice = payload["choices"][0]
    if choice.get("finish_reason") == "content_filter":
        raise RuntimeError("LLM declined the request")
    text = (choice["message"].get("content") or "").strip()
    # Some models wrap JSON in a code fence despite JSON mode.
    return re.sub(r"^```(?:json)?\s*|\s*```$", "", text).strip()


def _call(system: str, user: str, max_tokens: int, schema: dict | None = None) -> str:
    if not is_enabled():
        raise RuntimeError("LLM not enabled; use Demo Scenario Mode")
    if config.LLM_PROVIDER == "anthropic":
        return _anthropic_call(system, user, max_tokens, schema)
    return _openai_compatible_call(system, user, max_tokens, schema)


def complete_json(system: str, user: str, schema: dict, max_tokens: int = 1024) -> dict:
    """Structured-output call. Raises if the LLM is not enabled; callers fall back to Demo Scenario Mode."""
    return json.loads(_call(system, user, max_tokens, schema))


def complete_text(system: str, user: str, max_tokens: int = 1024) -> str:
    """Plain-text call for phrasing a response around evidence records it is given."""
    return _call(system, user, max_tokens)


def ping() -> dict:
    """One tiny real call so an operator can verify the key/model without guessing. Never returns secrets."""
    info = {**describe(), "enabled": is_enabled()}
    if not is_enabled():
        return {**info, "ok": False, "error": "LLM not enabled (no key for this provider, or APP_MODE=demo)"}
    t0 = time.perf_counter()
    try:
        text = complete_text("Reply with the single word OK.", "Ping.", max_tokens=64)  # reasoning models need headroom
        return {**info, "ok": True, "latency_ms": round((time.perf_counter() - t0) * 1000), "reply": text[:40]}
    except Exception as e:  # report, never raise — this is a diagnostics endpoint
        return {**info, "ok": False, "latency_ms": round((time.perf_counter() - t0) * 1000), "error": str(e)[:300]}


# ---------------------------------------------------------------------------
# Classification
# ---------------------------------------------------------------------------

CLASSIFY_SCHEMA = {
    "type": "object",
    "properties": {
        "intent": {"type": "string", "enum": PARENT_INTENTS + LEARNER_INTENTS},
        "objection": {"type": ["string", "null"], "enum": OBJECTIONS + [None]},
        "refusal": {"type": "boolean"},
        "trade": {"type": ["string", "null"], "enum": TRADES + [None]},
        "confidence": {"type": "number"},
    },
    "required": ["intent", "objection", "refusal", "trade", "confidence"],
    "additionalProperties": False,
}

CLASSIFY_SYSTEM = f"""You classify ONE message from a family career-counselling chat in India.
Two personas share the chat: the LEARNER (a young person who wants a vocational/skill course) and the
PARENT (who may object). Messages are usually Hinglish (Hindi in Latin script), Hindi, or English.
The persona who typed is given; do not change it.

Return JSON only.
- intent: for a parent message one of {PARENT_INTENTS}; for a learner message one of {LEARNER_INTENTS}.
  "objection" = the parent raises a concern. "refusal" = the parent refuses without a specific concern.
  "acceptance" = the parent agrees / is satisfied / open to enrolment. "parent_message" = anything else.
  "learner_goal" = the learner states a course or trade they want.
- objection: when the parent raises a concern, the category:
  income (salary, earnings), employment (jobs, future, scope, career viability), safety (girl's safety,
  travel safety, harassment, late hours), social_status (izzat, degree vs course, what people will say,
  marriage prospects), distance (centre too far, commute), placement (placement guarantee, job after certificate).
  Otherwise null. A message can be both an objection and a refusal (e.g. "Phir bhi, degree nahi toh izzat nahi").
- refusal: true if the parent explicitly refuses or says "still no" (phir bhi, bilkul nahi, nahi karne denge).
- trade: the trade mentioned, if any, from {TRADES}; else null.
- confidence: 0–1 for your classification."""


def classify_message(persona: str, text: str, session: dict) -> dict:
    """LLM classification in the pipeline's detection shape. Raises on any failure."""
    user = (
        f"Persona who typed: {persona}\n"
        f"Session: district={session['district']}, trade={session['trade']}, learner_gender={session['learner_gender']}\n"
        f"Message: {text}"
    )
    out = complete_json(CLASSIFY_SYSTEM, user, CLASSIFY_SCHEMA, max_tokens=1024)  # room for reasoning models
    allowed = LEARNER_INTENTS if persona == "learner" else PARENT_INTENTS
    intent = out["intent"] if out["intent"] in allowed else allowed[-1]
    objection = out["objection"] if (persona == "parent" and out["objection"] in OBJECTIONS) else None
    refusal = bool(out["refusal"]) and persona == "parent"
    if objection and intent not in ("objection",):
        intent = "objection"
    if intent == "objection" and not objection:
        intent = "parent_message"
    return {
        "persona": persona,
        "intent": intent,
        "objection": objection,
        "severity": "high" if refusal else ("medium" if objection else None),
        "needs_evidence": objection is not None,
        "refusal": refusal,
        "trade": out["trade"] if out["trade"] in TRADES else None,
        "confidence": max(0.0, min(1.0, float(out["confidence"]))),
    }


# ---------------------------------------------------------------------------
# Phrasing around evidence
# ---------------------------------------------------------------------------

LANGUAGE_INSTRUCTIONS = {
    "hinglish": "Write in Hinglish (Hindi in Latin script), simple spoken words, the way a local counsellor talks.",
    "hindi": "Write in Hindi using Devanagari script, simple everyday words.",
    "english": "Write in simple, warm English.",
}

LANGUAGE_NAMES = {"hinglish": "Hinglish (Latin script)", "hindi": "Hindi in Devanagari script", "english": "English"}

# Common Hinglish words; an "English" reply containing several of them is in the wrong language.
_HINGLISH_MARKERS = re.compile(r"\b(hai|hain|aap|aapka|aapki|ke|ki|mein|nahi|liye|kya|toh|bhi|sakte)\b", re.I)


def reply_matches_language(reply: str, language: str) -> bool:
    """Guardrail: the session's language wins over the parent's. A mismatch falls back to the template."""
    if language == "english":
        return len(_HINGLISH_MARKERS.findall(reply)) < 2
    if language == "hindi":
        return bool(re.search(r"[ऀ-ॿ]", reply))
    return True


PHRASE_SYSTEM = """You are ParivaarSaathi, a family career counsellor's assistant in India. You are talking to a PARENT
whose child wants a vocational/skill course. The parent's concern has already been classified and matching
evidence has been retrieved from a demonstration dataset. The evidence will be shown to the parent as cards
BELOW your message — you do not need to repeat every number.

Rules — these are strict:
1. Use ONLY facts, numbers and names that appear in the EVIDENCE provided. Never add a statistic, salary,
   job count, scheme name, employer or claim that is not in the evidence. If the parent raised a concern and
   the evidence is empty, say honestly that this data is not available yet and that a human counsellor can help.
2. Never persuade with generic reassurance. Point to the evidence.
3. Never promise or guarantee a job, salary, placement or safety. Avoid words like "guaranteed", "100%",
   "pakki naukri", "pakka".
4. Be warm and respectful ("aap"). Acknowledge the concern in one short clause, then point to the evidence,
   then one short next step. 2–4 sentences. No bullet points, no headings, no emojis.
5. If the parent refused, acknowledge that calmly and mention that a human counsellor can talk to them.
6. If the parent accepted, thank them and suggest the next step (centre visit / counsellor).
7. Do not mention that you are an AI or that the dataset is a demonstration."""


_NUMBER = re.compile(r"\d+(?:\.\d+)?")


_DEVANAGARI_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")


def _number_tokens(text: str) -> set[str]:
    # Hindi replies may use Devanagari numerals (१२,०००); compare them as the same numbers as the evidence.
    return set(_NUMBER.findall(text.translate(_DEVANAGARI_DIGITS).replace(",", "")))


def reply_is_grounded(reply: str, cards: list[dict], extra_allowed: str = "") -> bool:
    """Guardrail: every number in the reply must be a number that occurs in the evidence (or the allowed
    extra text), compared as whole numbers — so an invented "23" is not excused by a "₹23,000" in a card.
    "11 hazaar" / "22.5 hazaar" style abbreviations of ₹11,000 / ₹22,500 are accepted."""
    low = reply.lower()
    if any(re.search(p, low) for p in BANNED_PATTERNS):
        return False
    pool = _number_tokens(json.dumps(cards, ensure_ascii=False) + " " + extra_allowed)
    for n in _number_tokens(reply):
        if n in pool:
            continue
        try:
            scaled = str(int(round(float(n) * 1000)))
        except ValueError:
            scaled = ""
        if scaled in pool:
            continue
        return False
    return True


def phrase_reply(
    *,
    language: str,
    intent: str,
    parent_relation: str,
    learner_gender: str,
    district: str,
    trade: str,
    parent_text: str,
    objection_label: str | None,
    cards: list[dict],
    refusal: bool,
    escalation_case_id: int | None,
) -> str:
    """LLM phrasing of the reply. Raises on failure; the caller validates with reply_is_grounded()."""
    compact_cards = [
        {
            "title": c["title"],
            "items": c["items"],
            **({"employers": c["employers"][:5]} if c.get("employers") else {}),
        }
        for c in cards
    ]
    no_evidence_turn = {
        "acceptance": "This message is the parent agreeing — no evidence cards are attached and none are needed. "
                      "Do NOT say that data is missing. Thank them warmly and suggest the next step (centre visit / counsellor).",
        "refusal": "This message is a refusal without a specific concern — no evidence cards are attached and none are needed. "
                   "Do NOT say that data is missing. Acknowledge calmly, do not argue, and say a human counsellor can talk to them.",
        "parent_message": "This message is not a specific concern — no evidence cards are attached and none are needed. "
                          "Do NOT say that data is missing. Ask one short question about which concern matters most "
                          "(salary, jobs, safety, respect, distance, placement).",
    }
    user = (
        f"{LANGUAGE_INSTRUCTIONS.get(language, LANGUAGE_INSTRUCTIONS['hinglish'])}\n\n"
        f"Parent: {parent_relation}. Learner: {learner_gender}. District: {district}. Trade: {trade}.\n"
        f"Parent said: \"{parent_text}\"\n"
        f"Classified intent: {intent}. Concern: {objection_label or 'none'}. Refusal: {refusal}.\n"
        + (no_evidence_turn[intent] + "\n" if intent in no_evidence_turn else "")
        + (f"This case has just been handed to a human counsellor (Case #{escalation_case_id}); say so in one sentence.\n"
           if escalation_case_id else "")
        + f"\nEVIDENCE (JSON): {json.dumps(compact_cards, ensure_ascii=False)}\n\n"
        f"Reply language: {LANGUAGE_NAMES.get(language, 'Hinglish')}, even if the parent wrote in another language. "
        "Write the reply now."
    )
    return complete_text(PHRASE_SYSTEM, user, max_tokens=900)  # room for reasoning models
