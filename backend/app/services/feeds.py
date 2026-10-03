"""Outcome Data Engine (the VODE layer of the architecture): the feeds behind every evidence card.

Every feed in this prototype is SIMULATED and labelled so. Each entry names the authorised source the
production design would connect instead; nothing here calls a government system.
"""
from app.db import connect

FEEDS = {
    "A": {
        "name": "Certification & training-partner records",
        "production": "Skill India Digital Hub (SIDH) certification records; NSDC training-partner audits",
        "fields": "assessed and certified per batch, biometric attendance, audit grade",
        "used_in": ["Beti Suraksha / centre safety", "Nearest centre"],
    },
    "B": {
        "name": "District wage quintiles by industry",
        "production": "PLFS earnings data; e-Shram occupation and wage records",
        "fields": "P20 / P40 / P60 / P80 monthly earnings by district and NIC industry code",
        "used_in": ["Paisa-Map"],
    },
    "C": {
        "name": "Trainee outcome micro-surveys (IVR)",
        "production": "90-second automated IVR calls to past trainees (BHASHINI speech in the caller's language)",
        "fields": "working in trade, take-home pay band, still in home district, would recommend",
        "used_in": ["Reported outcomes"],
    },
    "J": {
        "name": "Local job listings",
        "production": "National Career Service (NCS) and apprenticeship portal listings",
        "fields": "employer type, role, distance, openings, shift, job type",
        "used_in": ["Neighbourhood Job Radar", "Job Opportunities map"],
    },
}

SOURCE = {
    "A": "Feed A · certification & training-partner records (simulated)",
    "B": "Feed B · PLFS-style district wage quintiles (simulated)",
    "C": "Feed C · past-trainee IVR micro-survey (simulated)",
    "J": "Local job listings (simulated)",
}


def status() -> list[dict]:
    with connect() as conn:
        counts = {
            "A": conn.execute("SELECT COUNT(*) FROM training_centres").fetchone()[0],
            "B": conn.execute("SELECT COUNT(DISTINCT district || trade) FROM evidence WHERE category = 'income'").fetchone()[0],
            "C": conn.execute("SELECT COUNT(*) FROM outcome_surveys").fetchone()[0],
            "J": conn.execute("SELECT COUNT(*) FROM jobs").fetchone()[0],
        }
        live_c = conn.execute("SELECT COUNT(*) FROM outcome_surveys WHERE is_seed = 0").fetchone()[0]
        last_c = conn.execute("SELECT MAX(created_at) FROM outcome_surveys").fetchone()[0]
    units = {"A": "centre records", "B": "district × trade wage tables", "C": "survey responses", "J": "job listings"}
    return [
        {"id": k, **f, "records": counts[k], "unit": units[k], "status": "simulated",
         **({"live_records": live_c, "last_update": last_c} if k == "C" else {})}
        for k, f in FEEDS.items()
    ]
