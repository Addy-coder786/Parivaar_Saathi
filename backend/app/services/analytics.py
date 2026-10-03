"""Aggregates for the Resistance Intelligence dashboard."""
import json

from app.db import connect
from app.seed_data import DISTRICT_COORDS, DISTRICTS, TRADES
from app.services.responses import OBJECTION_LABELS

CATEGORIES = list(OBJECTION_LABELS)


def _top(counts: dict[str, int]) -> str | None:
    return max(counts, key=counts.get) if counts and max(counts.values()) > 0 else None


def summary() -> dict:
    with connect() as conn:
        kpis = {
            "live_sessions": conn.execute("SELECT COUNT(*) FROM sessions WHERE is_demo_history = 0").fetchone()[0],
            "total_sessions": conn.execute("SELECT COUNT(*) FROM sessions").fetchone()[0],
            "high_resistance": conn.execute(
                "SELECT COUNT(*) FROM sessions WHERE resistance_score >= 70 AND status != 'resolved'").fetchone()[0],
            "resolved_objections": conn.execute("SELECT COUNT(*) FROM objections WHERE resolved = 1").fetchone()[0],
            "total_objections": conn.execute("SELECT COUNT(*) FROM objections").fetchone()[0],
            "open_escalations": conn.execute(
                "SELECT COUNT(*) FROM escalations WHERE status != 'closed'").fetchone()[0],
        }
        rows = conn.execute(
            "SELECT o.category, s.district, s.trade, s.learner_gender AS gender"
            " FROM objections o JOIN sessions s ON s.id = o.session_id"
        ).fetchall()
        session_rows = conn.execute(
            "SELECT district, resistance_score, status FROM sessions"
        ).fetchall()

    by_objection = {c: 0 for c in CATEGORIES}
    by_district = {d: {c: 0 for c in CATEGORIES} for d in DISTRICTS}
    by_trade = {t: {c: 0 for c in CATEGORIES} for t in TRADES}
    by_gender = {c: {"female": 0, "male": 0, "other": 0} for c in CATEGORIES}
    for r in rows:
        by_objection[r["category"]] += 1
        by_district.setdefault(r["district"], {c: 0 for c in CATEGORIES})[r["category"]] += 1
        by_trade.setdefault(r["trade"], {c: 0 for c in CATEGORIES})[r["category"]] += 1
        by_gender[r["category"]][r["gender"]] += 1

    district_stats = {d: {"sessions": 0, "high": 0, "score_sum": 0} for d in by_district}
    for s in session_rows:
        st = district_stats.setdefault(s["district"], {"sessions": 0, "high": 0, "score_sum": 0})
        st["sessions"] += 1
        st["score_sum"] += s["resistance_score"]
        if s["resistance_score"] >= 70 and s["status"] != "resolved":
            st["high"] += 1

    return {
        "kpis": kpis,
        "top_concern": _top(by_objection),
        "by_objection": [{"category": c, "count": by_objection[c]} for c in CATEGORIES],
        "by_district": [
            {
                "district": d,
                **{k: DISTRICT_COORDS.get(d, {}).get(k) for k in ("lng", "lat", "state")},
                "counts": counts,
                "total": sum(counts.values()),
                "top_concern": _top(counts),
                "sessions": district_stats[d]["sessions"],
                "high_resistance": district_stats[d]["high"],
                "avg_score": round(district_stats[d]["score_sum"] / district_stats[d]["sessions"])
                if district_stats[d]["sessions"] else None,
            }
            for d, counts in by_district.items()
        ],
        "by_trade": [
            {"trade": t, "total": sum(counts.values()), "top_concern": _top(counts), "counts": counts}
            for t, counts in by_trade.items()
        ],
        "by_gender": [{"category": c, **by_gender[c]} for c in CATEGORIES],
        "includes_demo_history": True,
    }


def escalations(status: str | None = None) -> list[dict]:
    query = (
        "SELECT e.*, s.district, s.trade, s.learner_gender, s.parent_relation, s.resistance_score,"
        " s.is_demo_history FROM escalations e JOIN sessions s ON s.id = e.session_id"
    )
    params: tuple = ()
    if status:
        query += " WHERE e.status = ?"
        params = (status,)
    query += " ORDER BY CASE e.status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,"
    query += " CASE e.priority WHEN 'high' THEN 0 ELSE 1 END, e.created_at DESC"
    with connect() as conn:
        rows = conn.execute(query, params).fetchall()
    return [{**{k: r[k] for k in r.keys() if k != "summary"}, "brief": json.loads(r["summary"])} for r in rows]
