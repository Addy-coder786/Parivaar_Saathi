"""Feed C — the 90-second IVR micro-survey of past trainees (take-home pay band, district retention).

The IVR itself is simulated in the browser (keypad + browser/BHASHINI speech); answers land in
`outcome_surveys` and immediately change the "Reported outcomes" evidence card for that district × trade.
"""
import random
from datetime import datetime, timezone

from app.db import connect
from app.seed_data import DISTRICT_WAGE_FACTOR, DISTRICTS, PAY_BANDS, PLACEMENT_RATE, TRADES, WAGE_LADDER

BAND_LABEL = {b: label for b, label, _, _ in PAY_BANDS}

# Keypad survey. Every prompt is short so the whole call stays around 90 seconds.
SCRIPT = {
    "en": {
        "greeting": "Namaste. This is ParivaarSaathi calling past trainees. Your answers help future families decide. "
                    "This takes about 90 seconds. Your name is not recorded.",
        "questions": [
            {"key": "consent", "prompt": "Press 1 to answer, or 2 to end the call.",
             "options": {"1": "Yes, continue", "2": "End call"}},
            {"key": "working", "prompt": "Are you working now? Press 1 if you work in the trade you trained for, "
                                         "2 if you do other work, 3 if you are not working.",
             "options": {"1": "Working in this trade", "2": "Other work", "3": "Not working"}},
            {"key": "pay_band", "prompt": "What is your monthly take-home pay? Press 1 for below 8,000 rupees, "
                                          "2 for 8 to 12 thousand, 3 for 12 to 16 thousand, 4 for 16 to 20 thousand, "
                                          "5 for above 20 thousand.",
             "options": {str(b): label for b, label, _, _ in PAY_BANDS}, "skip_if": {"working": "3"}},
            {"key": "same_district", "prompt": "Do you work in your home district? Press 1 for yes, 2 if you moved.",
             "options": {"1": "Home district", "2": "Moved elsewhere"}, "skip_if": {"working": "3"}},
            {"key": "recommend", "prompt": "Would you recommend this course to a younger relative? Press 1 for yes, 2 for no.",
             "options": {"1": "Yes", "2": "No"}},
        ],
        "thanks": "Thank you. Your answer will help another family. Goodbye.",
    },
    "hi": {
        "greeting": "नमस्ते। यह परिवार साथी की ओर से पुराने प्रशिक्षुओं के लिए कॉल है। आपके जवाब से दूसरे परिवारों को "
                    "फ़ैसला लेने में मदद मिलेगी। इसमें लगभग 90 सेकंड लगेंगे। आपका नाम दर्ज नहीं होगा।",
        "questions": [
            {"key": "consent", "prompt": "जवाब देने के लिए 1 दबाएँ, कॉल समाप्त करने के लिए 2 दबाएँ।",
             "options": {"1": "हाँ, आगे बढ़ें", "2": "कॉल समाप्त"}},
            {"key": "working", "prompt": "क्या आप अभी काम कर रहे हैं? जिस ट्रेड की ट्रेनिंग ली उसी में काम कर रहे हैं तो 1, "
                                         "कोई और काम कर रहे हैं तो 2, काम नहीं कर रहे तो 3 दबाएँ।",
             "options": {"1": "इसी ट्रेड में काम", "2": "दूसरा काम", "3": "काम नहीं"}},
            {"key": "pay_band", "prompt": "आपकी महीने की हाथ में आने वाली कमाई कितनी है? 8 हज़ार से कम के लिए 1, "
                                          "8 से 12 हज़ार के लिए 2, 12 से 16 हज़ार के लिए 3, 16 से 20 हज़ार के लिए 4, "
                                          "20 हज़ार से ज़्यादा के लिए 5 दबाएँ।",
             "options": {str(b): label for b, label, _, _ in PAY_BANDS}, "skip_if": {"working": "3"}},
            {"key": "same_district", "prompt": "क्या आप अपने ही ज़िले में काम करते हैं? हाँ के लिए 1, बाहर गए हैं तो 2 दबाएँ।",
             "options": {"1": "अपना ज़िला", "2": "बाहर गए"}, "skip_if": {"working": "3"}},
            {"key": "recommend", "prompt": "क्या आप यह कोर्स अपने किसी छोटे रिश्तेदार को सुझाएँगे? हाँ के लिए 1, ना के लिए 2 दबाएँ।",
             "options": {"1": "हाँ", "2": "ना"}},
        ],
        "thanks": "धन्यवाद। आपका जवाब किसी और परिवार के काम आएगा। नमस्ते।",
    },
}

WORKING = {"1": "trade", "2": "other", "3": "none"}


def script(language: str) -> dict:
    return {"language": language if language in SCRIPT else "en", **SCRIPT.get(language, SCRIPT["en"]),
            "target_seconds": 90, "simulated": True}


def record(district: str, trade: str, gender: str, language: str, answers: dict, channel: str = "ivr_sim",
           months_since: int = 6) -> dict:
    """Stores one completed survey. `answers` holds the keypad digits keyed by question."""
    working = WORKING[answers["working"]]
    pay_band = int(answers["pay_band"]) if working != "none" and answers.get("pay_band") else None
    row = {
        "district": district, "trade": trade, "gender": gender, "months_since": months_since,
        "working": working, "pay_band": pay_band,
        "same_district": int(answers.get("same_district", "1") == "1") if working != "none" else 1,
        "recommend": int(answers["recommend"] == "1"), "channel": channel, "language": language,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    with connect() as conn:
        cur = conn.execute(
            "INSERT INTO outcome_surveys (district, trade, gender, months_since, working, pay_band, same_district,"
            " recommend, channel, language, created_at, is_seed) VALUES (:district, :trade, :gender, :months_since,"
            " :working, :pay_band, :same_district, :recommend, :channel, :language, :created_at, 0)",
            row,
        )
    return {"id": cur.lastrowid, **row}


def summary(conn, district: str, trade: str) -> dict | None:
    rows = conn.execute(
        "SELECT working, pay_band, same_district, recommend, is_seed FROM outcome_surveys"
        " WHERE district = ? AND trade = ?", (district, trade),
    ).fetchall()
    if not rows:
        return None
    n = len(rows)
    working = [r for r in rows if r["working"] != "none"]
    bands = sorted(r["pay_band"] for r in rows if r["working"] == "trade" and r["pay_band"])
    median_band = bands[len(bands) // 2] if bands else None
    return {
        "responses": n,
        "live_responses": sum(1 for r in rows if not r["is_seed"]),
        "in_trade": sum(1 for r in rows if r["working"] == "trade"),
        "other_work": sum(1 for r in rows if r["working"] == "other"),
        "median_band": median_band,
        "median_band_label": BAND_LABEL.get(median_band),
        "band_counts": {str(b): bands.count(b) for b in BAND_LABEL},
        "retention_pct": round(100 * sum(r["same_district"] for r in working) / len(working)) if working else None,
        "recommend": sum(r["recommend"] for r in rows),
    }


def simulate_round(n: int = 12, district: str | None = None, trade: str | None = None) -> list[dict]:
    """An automated survey round: n simulated past trainees answer the IVR (for demos of Feed C growing)."""
    rng = random.Random()
    out = []
    for _ in range(max(1, min(n, 50))):
        d = district or rng.choice(DISTRICTS)
        t = trade or rng.choice(TRADES)
        in_trade = PLACEMENT_RATE[d]
        roll = rng.random()
        working = "1" if roll < in_trade else "2" if roll < in_trade + 0.1 else "3"
        lo, hi = (x * DISTRICT_WAGE_FACTOR[d] for x in WAGE_LADDER[t][0][1:3])
        amount = rng.uniform(lo * 0.85, hi * 1.25) if working == "1" else rng.uniform(6000, 13000)
        band = next(b for b, _, _, top in PAY_BANDS if top is None or amount < top)
        answers = {"consent": "1", "working": working, "pay_band": str(band),
                   "same_district": "1" if rng.random() < 0.78 else "2",
                   "recommend": "1" if rng.random() < (0.86 if working == "1" else 0.55) else "2"}
        out.append(record(d, t, rng.choice(["female", "male"]), "hi", answers, channel="ivr_auto",
                          months_since=rng.randint(6, 18)))
    return out
