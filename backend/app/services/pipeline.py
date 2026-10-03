"""Message pipeline: persona → classify → evidence → reply → resistance → escalation → telemetry events.

Detection and phrasing each have an LLM path and a deterministic path:
  detection: LLM structured output (when enabled and confident) else keyword rules
  phrasing:  LLM text around the retrieved evidence, accepted only if `reply_is_grounded`, else templates
The evidence itself always comes from the dataset.
"""
import logging
from datetime import datetime, timezone

from app.db import connect
from app.services import classifier, escalation, evidence_engine, llm_service, resistance, responses

LLM_MIN_CONFIDENCE = 0.5
log = logging.getLogger("parivaarsaathi.pipeline")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _insert_message(conn, session_id: str, persona: str, text: str, ts: str, intent=None, objection=None,
                    channel: str = "web") -> None:
    conn.execute(
        "INSERT INTO messages (session_id, persona, text, intent, objection, timestamp, channel)"
        " VALUES (?, ?, ?, ?, ?, ?, ?)",
        (session_id, persona, text, intent, objection, ts, channel),
    )


def _detect(persona: str, text: str, session: dict, llm_on: bool) -> tuple[dict, str]:
    rules = classifier.classify(persona, text)
    if not llm_on:
        return rules, "rules"
    try:
        llm = llm_service.classify_message(persona, text, session)
    except Exception as e:
        log.info("LLM classification unavailable, using rules: %s", str(e)[:160])
        return rules, "rules"
    if llm["confidence"] < LLM_MIN_CONFIDENCE:
        log.info("LLM classification low confidence (%.2f), using rules", llm["confidence"])
        return rules, "rules"
    if persona == "learner" and not llm["trade"]:
        llm["trade"] = rules["trade"]
    return llm, "llm"


def _llm_phrase(session: dict, detection: dict, text: str, cards: list[dict], escalation_id: int | None) -> str | None:
    objection = detection["objection"]
    try:
        candidate = llm_service.phrase_reply(
            language=session["language"],
            intent=detection["intent"],
            parent_relation=session["parent_relation"],
            learner_gender=session["learner_gender"],
            district=session["district"],
            trade=session["trade"],
            parent_text=text,
            objection_label=responses.OBJECTION_LABELS.get(objection) if objection else None,
            cards=cards,
            refusal=detection["refusal"],
            escalation_case_id=escalation_id,
        )
    except Exception as e:
        log.info("LLM phrasing unavailable, using template: %s", str(e)[:160])
        return None
    extra = f"{session['district']} {session['trade']} {evidence_engine.JOB_RADIUS_KM} {escalation_id or ''}"
    if not candidate:
        return None
    if not llm_service.reply_is_grounded(candidate, cards, extra):
        log.info("LLM reply discarded by fact-guard, using template. Candidate: %s", candidate[:300])
        return None
    if not llm_service.reply_matches_language(candidate, session["language"]):
        log.info("LLM reply discarded: not in the session language (%s). Candidate: %s", session["language"], candidate[:200])
        return None
    return candidate


def handle_message(session_id: str, persona: str, text: str, now: str | None = None, use_llm: bool = True,
                   channel: str = "web") -> tuple[dict, list[dict]]:
    """Returns (api_response, events_to_broadcast).

    `now` lets the history seeder backdate messages; `use_llm=False` forces the deterministic path
    (the seeder and Demo Scenario sessions use it). `channel` records where the turn came from (web | whatsapp).
    """
    ts = now or _now()
    cards: list[dict] = []
    events: list[dict] = []
    escalation_info = None

    with connect() as conn:
        session = dict(conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone())
    llm_on = use_llm and bool(session.get("use_llm", 1)) and llm_service.is_enabled()
    lang = session["language"]
    district, trade, gender = session["district"], session["trade"], session["learner_gender"]
    detection, detection_source = _detect(persona, text, session, llm_on)
    objection = detection["objection"]

    # --- Phase A: state changes, inside one transaction -----------------------------------
    with connect() as conn:
        score_before = session["resistance_score"]
        score_peak = score_after = score_before
        _insert_message(conn, session_id, persona, text, ts, detection["intent"], objection, channel)

        def base_event(kind: str) -> dict:
            return {
                "type": kind, "session_id": session_id, "district": district, "trade": trade, "gender": gender,
                "before_score": score_peak, "after_score": score_after,
                "before_band": resistance.band(score_peak), "after_band": resistance.band(score_after),
                "timestamp": ts,
            }

        if persona == "learner":
            reply = (
                responses.learner_goal_reply(detection["trade"] or trade, district, lang)
                if detection["intent"] == "learner_goal"
                else responses.learner_message_reply(lang)
            )

        elif objection or detection["refusal"]:
            evidence_before = conn.execute(
                "SELECT COUNT(*) FROM objections WHERE session_id = ? AND evidence_shown = 1", (session_id,)
            ).fetchone()[0] > 0
            is_repeat = bool(objection) and conn.execute(
                "SELECT COUNT(*) FROM objections WHERE session_id = ? AND category = ?", (session_id, objection)
            ).fetchone()[0] > 0
            if is_repeat:
                detection["severity"] = "high"
            score_peak = resistance.apply_objection(
                score_before, has_objection=bool(objection), is_repeat=is_repeat, refusal=detection["refusal"]
            )
            if objection:
                cards = evidence_engine.retrieve(objection, district, trade, gender)
                score_after = resistance.apply_evidence(score_peak) if cards else score_peak
                resolved = bool(cards) and not detection["refusal"] and not is_repeat
                conn.execute(
                    "INSERT INTO objections (session_id, persona, category, severity, refusal, evidence_shown,"
                    " resolved, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (session_id, persona, objection, detection["severity"], int(detection["refusal"]),
                     int(bool(cards)), int(resolved), ts),
                )
                reply = responses.objection_reply(objection, district, trade, cards, detection["refusal"], lang)
                events.append({
                    **base_event("resistance_update"),
                    "objection": objection,
                    "severity": detection["severity"],
                    "evidence_shown": [c["type"] for c in cards],
                })
                conn.execute(
                    "INSERT INTO resistance_events (session_id, district, trade, objection, gender, severity,"
                    " before_score, after_score, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (session_id, district, trade, objection, gender, detection["severity"],
                     score_peak, score_after, ts),
                )
            else:
                # Refusal without a specific concern: the index still moves, so the dashboard must hear about it.
                score_after = score_peak
                reply = responses.refusal_only_reply(lang)
                events.append({**base_event("resistance_update"), "objection": "refusal", "severity": "high", "evidence_shown": []})
                conn.execute(
                    "INSERT INTO resistance_events (session_id, district, trade, objection, gender, severity,"
                    " before_score, after_score, timestamp) VALUES (?, ?, ?, 'refusal', ?, 'high', ?, ?, ?)",
                    (session_id, district, trade, gender, score_peak, score_after, ts),
                )

            unresolved = escalation.unresolved_categories(conn, session_id)
            reason = escalation.should_escalate(score_after, unresolved, detection["refusal"], evidence_before)
            if reason:
                session["resistance_score"] = score_after
                escalation_info = escalation.create(conn, session, score_after, reason, created_at=ts)

        elif detection["intent"] == "acceptance":
            score_after = resistance.apply_acceptance(score_before)
            conn.execute("UPDATE objections SET resolved = 1 WHERE session_id = ? AND evidence_shown = 1", (session_id,))
            if not escalation.unresolved_categories(conn, session_id) and session["status"] == "active":
                conn.execute("UPDATE sessions SET status = 'resolved' WHERE id = ?", (session_id,))
            reply = responses.acceptance_reply(lang)
            events.append({**base_event("family_decision"), "decision": "open_to_enrolment"})

        else:
            reply = responses.parent_message_reply(lang)

        if score_after != score_before:
            conn.execute("UPDATE sessions SET resistance_score = ? WHERE id = ?", (score_after, session_id))

    new_case_id = escalation_info["id"] if escalation_info and escalation_info["is_new"] else None
    if new_case_id and objection:  # the escalation note replaces the "we can connect you" offer
        reply = responses.objection_reply(objection, district, trade, cards, refusal=False, language=lang)

    # --- Phase B: optional LLM phrasing (network call outside the transaction) -------------
    reply_source = "template"
    if llm_on and persona == "parent":
        phrased = _llm_phrase(session, detection, text, cards, new_case_id)
        if phrased:
            reply, reply_source = phrased, "llm"

    if new_case_id and reply_source == "template":
        reply += " " + responses.escalation_note(new_case_id, lang)
    if new_case_id:
        events.append({
            "type": "escalation_created", "escalation_id": new_case_id, "session_id": session_id,
            "district": district, "trade": trade, "gender": gender, "priority": escalation_info["priority"],
            "reason": escalation_info["reason"], "timestamp": ts,
        })

    # --- Phase C: persist the assistant turn ------------------------------------------------
    with connect() as conn:
        _insert_message(conn, session_id, "assistant", reply, ts, channel=channel)

    response = {
        "message": {"persona": persona, "text": text, "channel": channel},
        "detection": {
            **detection,
            "source": detection_source,
            "objection_label": responses.OBJECTION_LABELS.get(objection) if objection else None,
            "district": district,
            "trade": trade,
        },
        "reply": {"text": reply, "cards": cards, "source": reply_source, "mode": "llm" if llm_on else "demo"},
        "resistance": {
            "before": score_before,
            "peak": score_peak,
            "after": score_after,
            "before_band": resistance.band(score_peak),
            "after_band": resistance.band(score_after),
        },
        "escalation": escalation_info,
    }
    return response, events
