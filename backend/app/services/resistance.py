"""Prototype Resistance Index — a simple deterministic score, NOT a validated psychological measure.

Rules (docs/IMPLEMENTATION_PLAN.md, decision 3):
  start 60 · parent objection +15 · repeat of same category +10 instead · explicit refusal +20
  · evidence shown for the objection −15 · parent accepts −20 · clamp 0–100
"""
START_SCORE = 60
OBJECTION_DELTA = 15
REPEAT_DELTA = 10
REFUSAL_DELTA = 20
EVIDENCE_DELTA = -15
ACCEPTANCE_DELTA = -20


def clamp(score: int) -> int:
    return max(0, min(100, score))


def band(score: int) -> str:
    if score >= 70:
        return "high"
    if score >= 40:
        return "medium"
    return "low"


def apply_objection(score: int, *, has_objection: bool, is_repeat: bool, refusal: bool) -> int:
    if has_objection:
        score += REPEAT_DELTA if is_repeat else OBJECTION_DELTA
    if refusal:
        score += REFUSAL_DELTA
    return clamp(score)


def apply_evidence(score: int) -> int:
    return clamp(score + EVIDENCE_DELTA)


def apply_acceptance(score: int) -> int:
    return clamp(score + ACCEPTANCE_DELTA)
