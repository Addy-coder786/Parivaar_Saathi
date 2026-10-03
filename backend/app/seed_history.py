"""Simulated historical sessions so the dashboard isn't empty at the start of the demo.

Every history session is flagged `is_demo_history = 1` and runs through the SAME pipeline as live
messages, so scores, objections, events and escalations stay consistent with the real rules.
District objection mixes are demo assumptions, not findings.
"""
import random
import uuid
from datetime import datetime, timedelta, timezone

from app.db import connect
from app.seed_data import DISTRICTS, TRADES
from app.services import pipeline, resistance

HISTORY_SESSIONS = 72

LINES = {
    "income": ["Isme salary kitni milegi?", "Itne kam paise mein kaise chalega?", "Kamai kitni hogi shuru mein?"],
    "employment": ["Is kaam mein future hai kya?", "Course ke baad naukri milegi?", "Iska scope kya hai?"],
    "safety": ["Ladki ke liye safe hai?", "Beti akeli kaise jayegi, surakshit hai?", "Raat ko der ho gayi toh?"],
    "social_status": ["Degree nahi toh izzat nahi.", "Log kya kahenge?", "Rishta kaise hoga, chhota kaam hai."],
    "distance": ["Centre bahut door hai.", "Roz aana jaana kaise hoga?", "Paas mein koi centre hai?"],
    "placement": ["Placement ki guarantee hai?", "Certificate ke baad pakki naukri milegi?"],
}

# Demo assumption: which concerns dominate in each district.
DISTRICT_MIX = {
    "Sikar": {"safety": 30, "social_status": 25, "income": 20, "employment": 15, "distance": 10, "placement": 5},
    "Jaipur": {"income": 28, "social_status": 24, "safety": 18, "employment": 15, "placement": 10, "distance": 5},
    "Pune": {"income": 32, "placement": 24, "distance": 18, "employment": 12, "safety": 9, "social_status": 5},
    "Nashik": {"employment": 30, "income": 24, "distance": 20, "safety": 12, "placement": 9, "social_status": 5},
}
DISTRICT_WEIGHT = {"Sikar": 30, "Jaipur": 26, "Pune": 24, "Nashik": 20}
TRADE_WEIGHT = {"Electrician": 30, "Solar Technician": 20, "Welder": 15, "CNC Operator": 15, "Healthcare Assistant": 20}


def _pick(rng: random.Random, weights: dict[str, int]) -> str:
    return rng.choices(list(weights), weights=list(weights.values()))[0]


def seed_history() -> None:
    rng = random.Random(42)
    start = datetime.now(timezone.utc) - timedelta(days=7)
    for _ in range(HISTORY_SESSIONS):
        district = _pick(rng, DISTRICT_WEIGHT)
        trade = _pick(rng, TRADE_WEIGHT)
        gender = "female" if rng.random() < (0.6 if trade == "Healthcare Assistant" else 0.4) else "male"
        relation = rng.choice(["mother", "father", "father", "guardian"])
        t = start + timedelta(minutes=rng.randint(0, 7 * 24 * 60 - 60))
        sid = "h" + uuid.UUID(int=rng.getrandbits(128)).hex[:7]

        with connect() as conn:
            conn.execute(
                "INSERT INTO sessions (id, district, trade, learner_gender, parent_relation, language, status,"
                " resistance_score, created_at, is_demo_history) VALUES (?, ?, ?, ?, ?, 'hinglish', 'active', ?, ?, 1)",
                (sid, district, trade, gender, relation, resistance.START_SCORE, t.isoformat()),
            )

        mix = dict(DISTRICT_MIX[district])
        if gender == "female":
            mix["safety"] = mix["safety"] * 2
        n_objections = rng.choices([1, 2, 3], weights=[35, 45, 20])[0]
        script = [("learner", f"Mujhe {trade.lower()} course karna hai.")]
        for i in range(n_objections):
            category = _pick(rng, mix)
            line = rng.choice(LINES[category])
            if i == n_objections - 1 and rng.random() < 0.18:
                line += " Phir bhi nahi chahiye."
            script.append(("parent", line))

        for persona, text in script:
            t += timedelta(minutes=rng.randint(1, 4))
            pipeline.handle_message(sid, persona, text, now=t.isoformat(), use_llm=False)

        with connect() as conn:
            status = conn.execute("SELECT status FROM sessions WHERE id = ?", (sid,)).fetchone()["status"]
        if status == "active" and rng.random() < 0.45:
            t += timedelta(minutes=rng.randint(1, 4))
            pipeline.handle_message(sid, "parent", "Theek hai, samajh gaye.", now=t.isoformat(), use_llm=False)

    with connect() as conn:
        # History sessions that never reached a decision are closed, so "Active sessions" counts live ones only.
        conn.execute("UPDATE sessions SET status = 'closed' WHERE is_demo_history = 1 AND status = 'active'")
        # Some older cases have already been picked up by counsellors.
        conn.execute(
            "UPDATE escalations SET status = 'in_progress' WHERE id IN"
            " (SELECT id FROM escalations ORDER BY created_at LIMIT 3)"
        )
