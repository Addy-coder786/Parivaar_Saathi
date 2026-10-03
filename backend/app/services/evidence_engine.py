"""Objection → structured evidence from the dataset. The LLM never supplies these facts.

Card types: job_radar, paisa_map, safety (Beti Suraksha for female learners), roadmap (Pragati Path),
distance, placement. Every card carries `items` (label/value rows) so the UI can always fall back to a
generic table, and `feeds` naming the Outcome Data Engine feeds it was built from (see feeds.py).
"""
from app.db import connect
from app.seed_data import NSQF_NOTE, pragati_path, wage_quintiles
from app.services import surveys
from app.services.feeds import SOURCE

JOB_RADIUS_KM = 15


def _card(card_type: str, title: str, items: list[dict], source: str, as_of: str, **extra) -> dict:
    return {"type": card_type, "title": title, "items": items, "source": source, "as_of": as_of, "demo": True, **extra}


def _evidence_rows(conn, category: str, district: str, trade: str):
    return conn.execute(
        "SELECT title, label, value, source, as_of FROM evidence"
        " WHERE category = ? AND district = ? AND trade = ? ORDER BY sort_order",
        (category, district, trade),
    ).fetchall()


def _items(rows) -> list[dict]:
    return [{"label": r["label"], "value": r["value"]} for r in rows]


def _rs(n: int) -> str:
    return f"₹{n:,}"


def _paisa_map(conn, district: str, trade: str) -> dict | None:
    rows = _evidence_rows(conn, "income", district, trade)
    if not rows:
        return None
    q = wage_quintiles(district, trade)
    items = _items(rows) + [
        {"label": f"Middle 60% of district workers in {q['nic_label']} (NIC {q['nic']}) earn",
         "value": f"{_rs(q['p20'])}–{q['p80']:,} / month"},
    ]
    return _card("paisa_map", f"Paisa-Map — {trade}, {district}", items, f"{rows[0]['source']}; {SOURCE['B']}",
                 rows[0]["as_of"], feeds=["B"], quintiles=q,
                 note="Monthly wage ranges for this district and occupation; not a salary guarantee.")


def _roadmap(conn, district: str, trade: str) -> dict | None:
    steps = pragati_path(district, trade)
    items = []
    for i, st in enumerate(steps, start=1):
        value = st["title"]
        if st.get("nsqf"):
            value += f" — NSQF Level {st['nsqf']} ({st['equivalent']})"
        if st.get("earning"):
            value += f" — {st['earning']}"
        items.append({"label": f"Step {i}", "value": value})
    items.append({"label": "Degree route", "value": "B.Voc degree = NSQF Level 7 (graduate level); entry rules vary by institution"})
    source = conn.execute("SELECT source, as_of FROM evidence WHERE district = ? AND trade = ? LIMIT 1",
                          (district, trade)).fetchone()
    return _card("roadmap", f"Pragati Path — {trade}, {district}", items, source["source"], source["as_of"],
                 steps=steps, question="Is there a future after this course?", note=NSQF_NOTE)


def _placement(conn, district: str, trade: str) -> dict | None:
    s = surveys.summary(conn, district, trade)
    if not s:
        return None
    n = s["responses"]
    items = [
        {"label": "Past trainees surveyed (90-second IVR call)", "value": f"{n} responses"},
        {"label": "Working in this trade", "value": f"{s['in_trade']} of {n}"},
        {"label": "Doing other work", "value": f"{s['other_work']} of {n}"},
    ]
    if s["median_band_label"]:
        items.append({"label": "Typical take-home pay (median band)", "value": f"{s['median_band_label']} / month"})
    if s["retention_pct"] is not None:
        items.append({"label": "Still working in their home district", "value": f"{s['retention_pct']}%"})
    items += [
        {"label": "Would recommend the course to a younger relative", "value": f"{s['recommend']} of {n}"},
        {"label": "Note", "value": "Self-reported by past trainees; not a placement guarantee"},
    ]
    return _card("placement", f"Reported outcomes — {trade}, {district}", items, SOURCE["C"], "Rolling (demo)",
                 feeds=["C"], survey=s)


def _job_radar(conn, district: str, trade: str) -> dict | None:
    jobs = conn.execute(
        "SELECT employer, role, distance_km, source, as_of FROM jobs"
        " WHERE district = ? AND trade = ? AND distance_km <= ? ORDER BY distance_km",
        (district, trade, JOB_RADIUS_KM),
    ).fetchall()
    if not jobs:
        return None
    roles: dict[str, int] = {}
    for j in jobs:
        roles[j["role"]] = roles.get(j["role"], 0) + 1
    top_roles = ", ".join(r for r, _ in sorted(roles.items(), key=lambda kv: -kv[1])[:3])
    items = [
        {"label": f"Active opportunities within {JOB_RADIUS_KM} km", "value": str(len(jobs))},
        {"label": "Most common roles", "value": top_roles},
    ]
    course = conn.execute(
        "SELECT course_name, nsqf_level FROM training_centres WHERE district = ? AND trade = ? LIMIT 1",
        (district, trade),
    ).fetchone()
    if course:
        items.append({"label": "Course", "value": f"{course['course_name']} — NSQF Level {course['nsqf_level']}"})
    employers = [{"name": j["employer"], "role": j["role"], "distance_km": j["distance_km"]} for j in jobs]
    return _card("job_radar", f"Neighbourhood Job Radar — {trade}, {district}", items, jobs[0]["source"],
                 jobs[0]["as_of"], feeds=["J"], radius_km=JOB_RADIUS_KM, total=len(jobs), employers=employers)


def _centre(conn, district: str, trade: str):
    return conn.execute(
        "SELECT * FROM training_centres WHERE district = ? AND trade = ? ORDER BY distance_km LIMIT 1",
        (district, trade),
    ).fetchone()


def _safety(conn, district: str, trade: str, gender: str) -> dict | None:
    c = _centre(conn, district, trade)
    if not c:
        return None
    items = [
        {"label": "Centre", "value": f"{c['name']} ({c['distance_km']} km)"},
        {"label": "Female staff", "value": c["female_staff"]},
        {"label": "CCTV", "value": c["cctv"]},
        {"label": "Transport", "value": c["transport"]},
        {"label": "Training hours", "value": c["training_hours"]},
        {"label": "Emergency contact", "value": c["emergency_contact"]},
        {"label": "Verification", "value": c["verification"]},
    ] + _centre_record(c)
    title = f"Beti Suraksha — {c['name']}" if gender == "female" else f"Centre safety — {c['name']}"
    return _card("safety", title, items, f"{c['source']}; {SOURCE['A']}", c["as_of"], feeds=["A"])


def _centre_record(c) -> list[dict]:
    """Feed A rows: what the certification / audit record says about this centre (simulated)."""
    if not c["assessed_last_batch"]:
        return []
    return [
        {"label": "Certified last batch", "value": f"{c['certified_last_batch']} of {c['assessed_last_batch']} assessed"},
        {"label": "Average attendance (biometric log)", "value": f"{c['attendance_pct']}%"},
        {"label": "Training-partner audit", "value": f"Grade {c['audit_grade']} ({c['audit_period']})"},
    ]


def _distance(conn, district: str, trade: str) -> dict | None:
    c = _centre(conn, district, trade)
    if not c:
        return None
    items = [
        {"label": "Nearest centre", "value": c["name"]},
        {"label": "Distance", "value": f"{c['distance_km']} km"},
        {"label": "Transport", "value": c["transport"]},
        {"label": "Training hours", "value": c["training_hours"]},
    ] + _centre_record(c)
    return _card("distance", f"Nearby training centre — {district}", items, f"{c['source']}; {SOURCE['A']}",
                 c["as_of"], feeds=["A"])


def retrieve(objection: str, district: str, trade: str, gender: str = "female") -> list[dict]:
    """Returns proof cards for an objection. Empty list = no evidence in the dataset."""
    with connect() as conn:
        if objection == "employment":
            # "Career viability" = jobs + wages (implementation plan, decision 4).
            cards = [_job_radar(conn, district, trade), _paisa_map(conn, district, trade)]
        elif objection == "income":
            cards = [_paisa_map(conn, district, trade)]
        elif objection == "safety":
            cards = [_safety(conn, district, trade, gender)]
        elif objection == "placement":
            cards = [_placement(conn, district, trade)]
        elif objection == "social_status":
            cards = [_roadmap(conn, district, trade)]
        elif objection == "distance":
            cards = [_distance(conn, district, trade)]
        else:
            cards = []
    return [c for c in cards if c]
