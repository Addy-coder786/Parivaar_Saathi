"""SQLite access (stdlib sqlite3): schema creation and demo-data seeding."""
import sqlite3
from contextlib import contextmanager

from app.config import DATABASE_PATH

SCHEMA_VERSION = 5
TABLES = ["sessions", "messages", "objections", "evidence", "jobs", "training_centres", "resistance_events",
          "escalations", "counsellors", "outcome_surveys", "channel_links"]

SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    district TEXT NOT NULL,
    trade TEXT NOT NULL,
    learner_gender TEXT NOT NULL,
    parent_relation TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'hinglish',
    status TEXT NOT NULL DEFAULT 'active',
    resistance_score INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    is_demo_history INTEGER NOT NULL DEFAULT 0,
    use_llm INTEGER NOT NULL DEFAULT 1   -- 0 = deterministic Demo Scenario Mode for this session
);
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    persona TEXT NOT NULL,          -- learner | parent | assistant
    text TEXT NOT NULL,
    intent TEXT,
    objection TEXT,
    timestamp TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'web'   -- web | whatsapp
);
CREATE TABLE IF NOT EXISTS objections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    persona TEXT NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    refusal INTEGER NOT NULL DEFAULT 0,
    evidence_shown INTEGER NOT NULL DEFAULT 0,
    resolved INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,         -- income | course | placement | social_status
    district TEXT NOT NULL,
    trade TEXT NOT NULL,
    title TEXT NOT NULL,
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL,
    source_url TEXT,
    as_of TEXT NOT NULL,
    confidence TEXT NOT NULL DEFAULT 'demo'
);
CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    district TEXT NOT NULL,
    trade TEXT NOT NULL,
    employer TEXT NOT NULL,
    role TEXT NOT NULL,
    distance_km REAL NOT NULL,
    openings INTEGER NOT NULL DEFAULT 1,
    shift TEXT NOT NULL DEFAULT 'Day shift',
    employment_type TEXT NOT NULL DEFAULT 'Full-time',
    source TEXT NOT NULL,
    as_of TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS training_centres (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    district TEXT NOT NULL,
    trade TEXT NOT NULL,
    name TEXT NOT NULL,
    course_name TEXT NOT NULL,
    nsqf_level INTEGER NOT NULL,
    duration TEXT NOT NULL,
    distance_km REAL NOT NULL,
    female_staff TEXT NOT NULL,
    cctv TEXT NOT NULL,
    transport TEXT NOT NULL,
    training_hours TEXT NOT NULL,
    emergency_contact TEXT NOT NULL,
    verification TEXT NOT NULL,
    source TEXT NOT NULL,
    as_of TEXT NOT NULL,
    -- Feed A (simulated certification / training-partner audit record)
    assessed_last_batch INTEGER NOT NULL DEFAULT 0,
    certified_last_batch INTEGER NOT NULL DEFAULT 0,
    attendance_pct INTEGER NOT NULL DEFAULT 0,
    audit_grade TEXT NOT NULL DEFAULT '',
    audit_period TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS resistance_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    district TEXT NOT NULL,
    trade TEXT NOT NULL,
    objection TEXT NOT NULL,
    gender TEXT NOT NULL,
    severity TEXT NOT NULL,
    before_score INTEGER NOT NULL,
    after_score INTEGER NOT NULL,
    timestamp TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS escalations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    priority TEXT NOT NULL,
    reason TEXT NOT NULL,
    summary TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL,
    counsellor_code TEXT,
    routing TEXT
);
CREATE TABLE IF NOT EXISTS counsellors (
    code TEXT PRIMARY KEY,
    cluster TEXT NOT NULL,
    districts TEXT NOT NULL,        -- comma-separated
    languages TEXT NOT NULL,        -- comma-separated
    female INTEGER NOT NULL DEFAULT 0
);
-- Feed C: answers to the 90-second IVR micro-survey of past trainees
CREATE TABLE IF NOT EXISTS outcome_surveys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    district TEXT NOT NULL,
    trade TEXT NOT NULL,
    gender TEXT NOT NULL,
    months_since INTEGER NOT NULL,
    working TEXT NOT NULL,          -- trade | other | none
    pay_band INTEGER,               -- 1..5, see seed_data.PAY_BANDS; NULL when not working
    same_district INTEGER NOT NULL,
    recommend INTEGER NOT NULL,
    channel TEXT NOT NULL,          -- ivr (seeded) | ivr_sim (answered in the IVR simulator)
    language TEXT NOT NULL,
    created_at TEXT NOT NULL,
    is_seed INTEGER NOT NULL DEFAULT 0
);
-- Phones linked to a family session from a messaging channel. Only a salted hash of the number is stored.
CREATE TABLE IF NOT EXISTS channel_links (
    phone_hash TEXT PRIMARY KEY,
    channel TEXT NOT NULL,
    session_id TEXT NOT NULL,
    persona TEXT NOT NULL DEFAULT 'parent',
    created_at TEXT NOT NULL
);
"""


@contextmanager
def connect():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db(reset: bool = False) -> None:
    """Creates the schema and seeds demo data. Rebuilds everything if the schema version changed or reset=True."""
    from app.seed_data import seed
    from app.seed_history import seed_history

    with connect() as conn:
        if reset or conn.execute("PRAGMA user_version").fetchone()[0] != SCHEMA_VERSION:
            for t in TABLES:
                conn.execute(f"DROP TABLE IF EXISTS {t}")
            conn.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")
        conn.executescript(SCHEMA)
        if conn.execute("SELECT COUNT(*) FROM evidence").fetchone()[0] == 0:
            seed(conn)
        needs_history = conn.execute("SELECT COUNT(*) FROM sessions").fetchone()[0] == 0
    if needs_history:
        seed_history()


def check_db() -> bool:
    try:
        with connect() as conn:
            conn.execute("SELECT 1").fetchone()
        return True
    except sqlite3.Error:
        return False
