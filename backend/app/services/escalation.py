"""Human escalation: trigger rule + deterministic warm-handoff brief.

Rule (docs/IMPLEMENTATION_PLAN.md, decision 1):
  index >= 70 AND (>= 2 unresolved objections OR explicit refusal after evidence was shown),
  plus a manual "Talk to a counsellor" request at any time.
"""
import json
from datetime import datetime, timezone

from app.db import connect
from app.services import resistance, responses
from app.services.responses import OBJECTION_LABELS

THRESHOLD = 70

SUGGESTED_ACTIONS = {
    "safety": "Share centre safety details directly; offer a centre visit with the parent and a female trainer.",
    "social_status": "Discuss the career progression path and local examples of technicians who became "
                     "supervisors or contractors; address the degree comparison respectfully.",
    "income": "Walk through the local wage progression; separate training-period and job earnings.",
    "employment": "Connect the family with a local employer or alumnus from the job radar list.",
    "distance": "Explain transport options and check whether a nearer centre is available.",
    "placement": "Explain reported outcomes and what the centre does and does not guarantee.",
}


def unresolved_categories(conn, session_id: str) -> list[str]:
    """Categories whose latest objection row is unresolved."""
    rows = conn.execute(
        "SELECT category, resolved FROM objections o WHERE session_id = ? AND id = ("
        " SELECT MAX(id) FROM objections WHERE session_id = o.session_id AND category = o.category)",
        (session_id,),
    ).fetchall()
    return [r["category"] for r in rows if not r["resolved"]]


def should_escalate(score: int, unresolved: list[str], refusal: bool, evidence_shown_before: bool) -> str | None:
    """Returns the reason string if the rule fires, else None."""
    if score < THRESHOLD:
        return None
    if refusal and evidence_shown_before:
        return "Refusal after evidence was shown"
    if len(unresolved) >= 2:
        return f"{len(unresolved)} concerns still unresolved"
    return None


def build_brief(conn, session: dict, score: int) -> dict:
    sid = session["id"]
    objections = conn.execute(
        "SELECT category, severity FROM objections WHERE session_id = ? ORDER BY id", (sid,)
    ).fetchall()
    counts: dict[str, int] = {}
    for o in objections:
        counts[o["category"]] = counts.get(o["category"], 0) + 1
    top = sorted(counts, key=lambda c: -counts[c])
    unresolved = unresolved_categories(conn, sid)
    shown = conn.execute(
        "SELECT DISTINCT category FROM objections WHERE session_id = ? AND evidence_shown = 1", (sid,)
    ).fetchall()
    parent_lines = [
        r["text"] for r in conn.execute(
            "SELECT text FROM messages WHERE session_id = ? AND persona = 'parent' ORDER BY id DESC LIMIT 3", (sid,)
        ).fetchall()
    ][::-1]
    actions = [SUGGESTED_ACTIONS[c] for c in (unresolved or top)[:2] if c in SUGGESTED_ACTIONS]
    return {
        "learner": {"goal": session["trade"], "gender": session["learner_gender"]},
        "parent": session["parent_relation"],
        "district": session["district"],
        "trade": session["trade"],
        "resistance_score": score,
        "resistance_band": resistance.band(score),
        "top_concerns": [OBJECTION_LABELS[c] for c in top],
        "evidence_shown": [f"{OBJECTION_LABELS[r['category']]} evidence card" for r in shown],
        "remaining_concerns": [OBJECTION_LABELS[c] for c in unresolved],
        "suggested_action": " ".join(actions) or "Hold a joint call with learner and parent to understand the concern.",
        "parent_said": parent_lines,
    }


SESSION_LANGUAGE = {"hinglish": "Hindi", "hindi": "Hindi", "english": "English"}


def route(conn, session: dict, unresolved: list[str]) -> tuple[str | None, str]:
    """Picks a counsellor from the simulated pool (production: NCS counsellor network).

    Rule: covers the district → speaks the family's language → a female counsellor when a daughter's
    family raised a safety concern → lightest open caseload. Returns (code, human-readable reason).
    """
    language = SESSION_LANGUAGE.get(session["language"], "Hindi")
    raised_safety = "safety" in unresolved or conn.execute(
        "SELECT 1 FROM objections WHERE session_id = ? AND category = 'safety' LIMIT 1", (session["id"],)).fetchone()
    want_female = session["learner_gender"] == "female" and bool(raised_safety)
    load = {r["counsellor_code"]: r["n"] for r in conn.execute(
        "SELECT counsellor_code, COUNT(*) AS n FROM escalations WHERE status != 'closed' GROUP BY counsellor_code")}
    pool = [dict(r) for r in conn.execute("SELECT * FROM counsellors").fetchall()]
    local = [c for c in pool if session["district"] in c["districts"].split(",") and c["cluster"] != "State helpdesk"]
    candidates = [c for c in local if language in c["languages"].split(",")] or         [c for c in pool if language in c["languages"].split(",")]
    if not candidates:
        return None, "No counsellor available — sent to the general queue"
    if want_female and any(c["female"] for c in candidates):
        candidates = [c for c in candidates if c["female"]]
    best = min(candidates, key=lambda c: (load.get(c["code"], 0), c["code"]))
    reasons = [best["cluster"], f"speaks {language}"]
    if want_female and best["female"]:
        reasons.append("female counsellor for a daughter's safety concern")
    n = load.get(best["code"], 0)
    reasons.append(f"{n} open case{'' if n == 1 else 's'} before this one")
    return best["code"], " · ".join(reasons)


def priority_for(score: int, session: dict, unresolved: list[str]) -> str:
    if score >= 80 or (session["learner_gender"] == "female" and "safety" in unresolved):
        return "high"
    return "medium"


def create(conn, session: dict, score: int, reason: str, created_at: str | None = None) -> dict:
    """Creates an escalation unless the session already has an open one. Returns it either way."""
    existing = conn.execute(
        "SELECT * FROM escalations WHERE session_id = ? AND status != 'closed'", (session["id"],)
    ).fetchone()
    if existing:
        return {**dict(existing), "brief": json.loads(existing["summary"]), "is_new": False}
    brief = build_brief(conn, session, score)
    unresolved = unresolved_categories(conn, session["id"])
    created_at = created_at or datetime.now(timezone.utc).isoformat()
    priority = priority_for(score, session, unresolved)
    counsellor, routing = route(conn, session, unresolved)
    brief["routed_to"] = {"counsellor": counsellor, "reason": routing, "simulated": True}
    cur = conn.execute(
        "INSERT INTO escalations (session_id, priority, reason, summary, status, created_at, counsellor_code, routing)"
        " VALUES (?, ?, ?, ?, 'open', ?, ?, ?)",
        (session["id"], priority, reason, json.dumps(brief, ensure_ascii=False), created_at, counsellor, routing),
    )
    conn.execute("UPDATE sessions SET status = 'escalated' WHERE id = ?", (session["id"],))
    return {
        "id": cur.lastrowid, "session_id": session["id"], "priority": priority, "reason": reason,
        "status": "open", "created_at": created_at, "brief": brief, "is_new": True,
        "counsellor_code": counsellor, "routing": routing,
    }


def request_manual(session: dict, reason: str, channel: str = "web") -> tuple[dict, str, list[dict]]:
    """A family asks for a counsellor (web button or "0" on WhatsApp). Returns (escalation, reply, events)."""
    with connect() as conn:
        esc = create(conn, session, session["resistance_score"], reason)
        reply = responses.manual_escalation_reply(esc["id"], session["language"])
        if esc["is_new"]:
            conn.execute(
                "INSERT INTO messages (session_id, persona, text, timestamp, channel) VALUES (?, 'assistant', ?, ?, ?)",
                (session["id"], reply, esc["created_at"], channel),
            )
    events = []
    if esc["is_new"]:
        events.append({
            "type": "escalation_created", "escalation_id": esc["id"], "session_id": session["id"],
            "district": session["district"], "trade": session["trade"], "gender": session["learner_gender"],
            "priority": esc["priority"], "reason": esc["reason"], "counsellor_code": esc["counsellor_code"],
            "timestamp": esc["created_at"],
        })
    return esc, reply, events
