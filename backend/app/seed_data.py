"""Demonstration dataset (simulated). NOT live government data.

Covers 4 districts × 5 trades. Values are generated from a few base tables so they stay
internally consistent (same trade → same wage ladder, scaled per district).
Employer names are deliberately generic so nothing reads as a real organisation.
"""
import random

DEMO_SOURCE = "ParivaarSaathi demo labour-market dataset (simulated)"
DEMO_AS_OF = "2026-Q3 (demo)"

DISTRICTS = ["Sikar", "Pune", "Nashik", "Jaipur"]
TRADES = ["Electrician", "Solar Technician", "Welder", "CNC Operator", "Healthcare Assistant"]

# Approximate district-headquarters coordinates (real places). Opportunity and centre positions around them
# are ILLUSTRATIVE: placed at their dataset distance from the HQ at a deterministic bearing, not real addresses.
DISTRICT_COORDS = {
    "Sikar": {"lng": 75.14, "lat": 27.61, "state": "Rajasthan"},
    "Jaipur": {"lng": 75.79, "lat": 26.91, "state": "Rajasthan"},
    "Nashik": {"lng": 73.79, "lat": 19.99, "state": "Maharashtra"},
    "Pune": {"lng": 73.86, "lat": 18.52, "state": "Maharashtra"},
}

# Per-trade shift mix for demo jobs (probability of a rotational shift).
ROTATIONAL_SHARE = {"Electrician": 0.2, "Solar Technician": 0.1, "Welder": 0.3, "CNC Operator": 0.5, "Healthcare Assistant": 0.6}

# Local wage level relative to Sikar (demo assumption).
DISTRICT_WAGE_FACTOR = {"Sikar": 1.0, "Jaipur": 1.12, "Nashik": 1.15, "Pune": 1.3}

# Monthly ₹ ranges for Sikar; other districts scale by DISTRICT_WAGE_FACTOR.
# (stage label, min, max, open_ended)
WAGE_LADDER = {
    "Electrician": [
        ("Entry-level (0–1 yr)", 11000, 14000, False),
        ("Experienced (3–5 yrs)", 18000, 25000, False),
        ("Supervisor", 25000, 32000, False),
        ("Self-employed / contractor", 30000, None, True),
    ],
    "Solar Technician": [
        ("Entry-level (0–1 yr)", 12000, 15000, False),
        ("Experienced (3–5 yrs)", 19000, 26000, False),
        ("Site supervisor", 26000, 34000, False),
        ("Own installation business", 32000, None, True),
    ],
    "Welder": [
        ("Entry-level (0–1 yr)", 12000, 15000, False),
        ("Experienced (3–5 yrs)", 18000, 24000, False),
        ("Fabrication supervisor", 24000, 30000, False),
        ("Own fabrication shop", 28000, None, True),
    ],
    "CNC Operator": [
        ("Entry-level (0–1 yr)", 13000, 16000, False),
        ("Experienced (3–5 yrs)", 20000, 27000, False),
        ("Setter / programmer", 27000, 35000, False),
        ("Own job-work unit", 35000, None, True),
    ],
    "Healthcare Assistant": [
        ("Entry-level (0–1 yr)", 10000, 13000, False),
        ("Experienced (3–5 yrs)", 15000, 20000, False),
        ("Ward supervisor", 20000, 26000, False),
        ("Home-care services", 20000, None, True),
    ],
}

COURSES = {
    "Electrician": ("Assistant Electrician", 3, "About 3 months"),
    "Solar Technician": ("Solar PV Installer", 4, "About 3 months"),
    "Welder": ("Assistant Welder", 3, "About 3 months"),
    "CNC Operator": ("CNC Operator – Turning", 4, "About 4 months"),
    "Healthcare Assistant": ("General Duty Assistant", 4, "About 6 months incl. internship"),
}

ROADMAPS = {
    "Electrician": ["NSQF Level 3 course", "Apprenticeship", "Junior Technician", "Experienced Technician",
                    "Supervisor", "Self-employment / Licensed contractor"],
    "Solar Technician": ["NSQF Level 4 course", "Installer helper", "Solar PV Installer", "O&M technician lead",
                         "Site supervisor", "Own installation business"],
    "Welder": ["NSQF Level 3 course", "Apprentice welder", "Certified welder", "Specialised welder",
               "Fabrication supervisor", "Own fabrication shop"],
    "CNC Operator": ["NSQF Level 4 course", "Trainee operator", "CNC Operator", "CNC Setter / Programmer",
                     "Shift supervisor", "Own job-work unit"],
    "Healthcare Assistant": ["NSQF Level 4 course", "Hospital internship", "General Duty Assistant",
                             "Senior assistant", "Ward supervisor", "Home-care services / further nursing study"],
}

# Opportunities within 15 km (demo). Sikar × Electrician = 17 to match the scripted demo.
JOB_COUNTS = {
    "Sikar": {"Electrician": 17, "Solar Technician": 14, "Welder": 9, "CNC Operator": 4, "Healthcare Assistant": 11},
    "Jaipur": {"Electrician": 34, "Solar Technician": 22, "Welder": 19, "CNC Operator": 15, "Healthcare Assistant": 28},
    "Pune": {"Electrician": 46, "Solar Technician": 25, "Welder": 31, "CNC Operator": 38, "Healthcare Assistant": 41},
    "Nashik": {"Electrician": 29, "Solar Technician": 18, "Welder": 24, "CNC Operator": 27, "Healthcare Assistant": 22},
}

# (employer type, role) pools per trade.
EMPLOYER_TYPES = {
    "Electrician": [("electrical contractor", "Wireman"), ("solar installer", "Solar installation helper"),
                    ("hospital facilities", "Maintenance electrician"), ("housing builder", "Site electrician"),
                    ("appliance service centre", "Service technician"), ("textile unit", "Plant electrician")],
    "Solar Technician": [("solar installer", "Solar PV installer"), ("rooftop solar dealer", "Installation technician"),
                         ("solar park O&M contractor", "O&M technician"), ("electrical contractor", "Solar helper")],
    "Welder": [("fabrication workshop", "Welder"), ("auto component unit", "MIG welder"),
               ("construction contractor", "Structural welder"), ("tank & boiler maker", "Arc welder")],
    "CNC Operator": [("auto component unit", "CNC operator"), ("precision engineering unit", "CNC turner"),
                     ("tool room", "VMC operator"), ("job-work shop", "CNC operator")],
    "Healthcare Assistant": [("district hospital (private wing)", "General duty assistant"),
                             ("nursing home", "Patient care assistant"), ("diagnostic centre", "Lab assistant helper"),
                             ("home-care agency", "Home-care attendant")],
}

CENTRE_PROFILES = {
    # district: (distance_km, female_staff, transport)
    "Sikar": (4.2, "Yes — 3 female trainers, female warden", "Centre van from 2 pick-up points"),
    "Jaipur": (6.5, "Yes — 4 female trainers", "City bus stop 200 m away; centre van on 1 route"),
    "Pune": (5.8, "Yes — 5 female trainers, women's help desk", "PMPML bus stop 300 m away"),
    "Nashik": (7.1, "Yes — 2 female trainers", "Centre van from 3 pick-up points"),
}

PLACEMENT_RATE = {"Sikar": 0.69, "Jaipur": 0.72, "Nashik": 0.74, "Pune": 0.78}  # demo

# --- Pragati Path: NSQF levels in familiar words -------------------------------------------------
# NSQF levels 1–4 align with vocational Classes 9–12; the B.Voc diploma / advanced diploma / degree sit at
# Levels 5–7. Shown as an approximate explanation for parents, not as an official equivalence certificate.
NSQF_EQUIVALENT = {
    3: "about Class 11 level",
    4: "about Class 12 level",
    5: "about 1st year of college (B.Voc diploma level)",
    6: "about 2nd year of college (B.Voc advanced diploma level)",
    7: "graduate level (B.Voc degree)",
}
NSQF_NOTE = ("Approximate equivalence for explanation: NSQF Levels 1–4 align with vocational Classes 9–12, "
             "and the B.Voc diploma, advanced diploma and degree are Levels 5–7. Not an official equivalence certificate.")

# --- Feed A: certification and training-partner records (simulated; production: SIDH / NSDC TP audits) ----
CENTRE_RECORDS = {
    # district: (certified share of assessed, average biometric attendance %, audit grade, audit period)
    "Sikar": (0.9, 91, "A", "2026-Q2"),
    "Jaipur": (0.87, 88, "A", "2026-Q1"),
    "Pune": (0.92, 93, "A", "2026-Q2"),
    "Nashik": (0.85, 86, "B+", "2026-Q1"),
}

# --- Feed B: PLFS-style district wage quintiles by industry code (simulated) --------------------
# NIC-2008 classes most trainees of each trade work in.
TRADE_NIC = {
    "Electrician": ("4321", "Electrical installation"),
    "Solar Technician": ("4321", "Electrical installation"),
    "Welder": ("2511", "Structural metal products"),
    "CNC Operator": ("2592", "Machining and metal treatment"),
    "Healthcare Assistant": ("8610", "Hospital activities"),
}

# --- Feed C: 90-second IVR micro-survey of past trainees ------------------------------------------
# Take-home pay is asked in bands, never as an exact figure.
PAY_BANDS = [
    (1, "below ₹8,000", 0, 8000),
    (2, "₹8,000–12,000", 8000, 12000),
    (3, "₹12,000–16,000", 12000, 16000),
    (4, "₹16,000–20,000", 16000, 20000),
    (5, "above ₹20,000", 20000, None),
]

# --- Counsellor pool for escalation routing (simulated; production: NCS counsellor network) ----------
COUNSELLORS = [
    # code, cluster, districts, languages, female
    ("C-01", "Rajasthan cluster", ["Sikar", "Jaipur"], ["Hindi", "Rajasthani"], True),
    ("C-02", "Rajasthan cluster", ["Sikar", "Jaipur"], ["Hindi", "English"], False),
    ("C-03", "Maharashtra cluster", ["Pune", "Nashik"], ["Marathi", "Hindi"], True),
    ("C-04", "Maharashtra cluster", ["Pune", "Nashik"], ["Marathi", "Hindi", "English"], False),
    ("C-05", "State helpdesk", DISTRICTS, ["Hindi", "English"], True),
]


def _r500(x: float) -> int:
    return int(round(x / 500.0) * 500)


def _rupees(n: int) -> str:
    return f"₹{n:,}"


def wage_rows(district: str, trade: str) -> list[tuple[str, str]]:
    f = DISTRICT_WAGE_FACTOR[district]
    rows = []
    for label, lo, hi, open_ended in WAGE_LADDER[trade]:
        lo_s = _rupees(_r500(lo * f))
        value = f"{lo_s}+ / month (varies with work)" if open_ended else f"{lo_s}–{_rupees(_r500(hi * f))[1:]} / month"
        rows.append((label, value))
    return rows


def ladder_values(district: str, trade: str) -> list[str]:
    """Wage ladder values (entry, experienced, supervisor, self-employed) as display strings."""
    return [v for _, v in wage_rows(district, trade)]


def wage_quintiles(district: str, trade: str) -> dict:
    """PLFS-style P20/P40/P60/P80 monthly earnings for the trade's industry in the district (simulated)."""
    f = DISTRICT_WAGE_FACTOR[district]
    (_, e_lo, e_hi, _), (_, x_lo, x_hi, _) = WAGE_LADDER[trade][:2]
    nic, nic_label = TRADE_NIC[trade]
    return {
        "nic": nic, "nic_label": nic_label,
        "p20": _r500(e_lo * f * 0.95), "p40": _r500(e_hi * f), "p60": _r500(x_lo * f), "p80": _r500(x_hi * f),
    }


def pragati_path(district: str, trade: str) -> list[dict]:
    """Career staircase with NSQF levels in familiar words and the local wage at each working step."""
    course, nsqf, duration = COURSES[trade]
    steps = ROADMAPS[trade]
    wages = ladder_values(district, trade)
    next_level = min(nsqf + 1, 5)
    return [
        {"title": f"{course} course", "nsqf": nsqf, "equivalent": NSQF_EQUIVALENT[nsqf], "when": duration},
        {"title": steps[1], "when": "6–12 months, learning on the job"},
        {"title": steps[2], "earning": wages[0], "when": "Year 1"},
        {"title": steps[3], "earning": wages[1], "nsqf": next_level, "equivalent": NSQF_EQUIVALENT[next_level],
         "when": "Years 3–5", "how": "next-level certification while working"},
        {"title": steps[4], "earning": wages[2], "when": "Years 5+"},
        {"title": steps[5], "earning": wages[3], "when": "When ready"},
    ]


def _pay_band_for(amount: float) -> int:
    for band, _, lo, hi in PAY_BANDS:
        if hi is None or amount < hi:
            return band
    return PAY_BANDS[-1][0]


def seed_surveys(conn, rng: random.Random) -> None:
    """Feed C seed: simulated answers from past trainees to the 90-second IVR micro-survey."""
    for district in DISTRICTS:
        for ti, trade in enumerate(TRADES):
            n = rng.randint(24, 40)
            in_trade = PLACEMENT_RATE[district] - 0.03 * (ti % 3)
            entry_lo, entry_hi = (x * DISTRICT_WAGE_FACTOR[district] for x in WAGE_LADDER[trade][0][1:3])
            for _ in range(n):
                roll = rng.random()
                working = "trade" if roll < in_trade else "other" if roll < in_trade + 0.1 else "none"
                pay_band = _pay_band_for(rng.uniform(entry_lo * 0.85, entry_hi * 1.25)) if working == "trade" else (
                    _pay_band_for(rng.uniform(6000, 13000)) if working == "other" else None)
                conn.execute(
                    "INSERT INTO outcome_surveys (district, trade, gender, months_since, working, pay_band,"
                    " same_district, recommend, channel, language, created_at, is_seed)"
                    " VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ivr', 'hi', ?, 1)",
                    (district, trade, rng.choice(["female", "male"]), rng.randint(6, 18), working, pay_band,
                     int(rng.random() < 0.78), int(rng.random() < (0.86 if working == "trade" else 0.55)),
                     f"2026-0{rng.randint(6, 9)}-{rng.randint(10, 28)}T10:00:00+00:00"),
                )


def seed(conn) -> None:
    rng = random.Random(2026)
    job_rng = random.Random(7)
    for code, cluster, districts, languages, female in COUNSELLORS:
        conn.execute(
            "INSERT INTO counsellors (code, cluster, districts, languages, female) VALUES (?, ?, ?, ?, ?)",
            (code, cluster, ",".join(districts), ",".join(languages), int(female)),
        )
    seed_surveys(conn, random.Random(90))
    for district in DISTRICTS:
        for ti, trade in enumerate(TRADES):
            ev = []
            for label, value in wage_rows(district, trade):
                ev.append(("income", "Local wage range", label, value))
            course, nsqf, duration = COURSES[trade]
            ev += [("course", "Course", "Course", course), ("course", "Course", "NSQF level", f"Level {nsqf}"),
                   ("course", "Course", "Duration", duration)]
            # Outcomes come from Feed C (outcome_surveys) and the career path from pragati_path().
            batch = 90 if district in ("Sikar", "Nashik") else 120
            for i, (category, title, label, value) in enumerate(ev):
                conn.execute(
                    "INSERT INTO evidence (category, district, trade, title, label, value, sort_order, source, as_of)"
                    " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (category, district, trade, title, label, value, i, DEMO_SOURCE, DEMO_AS_OF),
                )

            # Jobs: N within 15 km + 3 beyond, so the radius filter is visible.
            n = JOB_COUNTS[district][trade]
            types = EMPLOYER_TYPES[trade]
            distances = sorted(round(rng.uniform(1.5, 14.9), 1) for _ in range(n))
            distances += [round(rng.uniform(16, 30), 1) for _ in range(3)]
            for i, km in enumerate(distances, start=1):
                etype, role = types[(i - 1) % len(types)]
                # Separate RNG so adding these fields never shifts the distances above.
                openings = job_rng.choices([1, 2, 3, 4], weights=[50, 28, 15, 7])[0]
                shift = "Rotational shift" if job_rng.random() < ROTATIONAL_SHARE[trade] else "Day shift"
                employment_type = job_rng.choices(["Full-time", "Apprenticeship", "Contract"], weights=[55, 30, 15])[0]
                conn.execute(
                    "INSERT INTO jobs (district, trade, employer, role, distance_km, openings, shift, employment_type,"
                    " source, as_of) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (district, trade, f"Demo Employer {i:02d} — {etype}", role, km, openings, shift, employment_type,
                     DEMO_SOURCE, DEMO_AS_OF),
                )

            km, female_staff, transport = CENTRE_PROFILES[district]
            cert_share, attendance, grade, audit_period = CENTRE_RECORDS[district]
            certified = int(round(batch * (cert_share - 0.02 * (ti % 3))))
            conn.execute(
                "INSERT INTO training_centres (district, trade, name, course_name, nsqf_level, duration,"
                " distance_km, female_staff, cctv, transport, training_hours, emergency_contact,"
                " verification, source, as_of, assessed_last_batch, certified_last_batch, attendance_pct,"
                " audit_grade, audit_period) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    district, trade, f"Demo Skill Centre, {district}", course, nsqf, duration, km, female_staff,
                    "Yes — classrooms, workshop and entrance", transport,
                    "9:30 AM – 4:00 PM (daytime only)", "Centre helpline + women's grievance officer",
                    "Demo centre data — not an inspected record", DEMO_SOURCE, DEMO_AS_OF,
                    batch, certified, attendance - (ti % 2) * 2, grade, audit_period,
                ),
            )
