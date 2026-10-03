# ParivaarSaathi — backend

FastAPI + WebSocket + Pydantic + SQLite (stdlib `sqlite3`). Python 3.11+ (tested on 3.14).

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env          # optional: add an LLM key for AI mode
.\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

- With no key the app runs in deterministic **Demo Scenario Mode**. All settings are documented in `.env.example`.
  **Never commit `.env`**; it is git-ignored.
- The SQLite database (`parivaarsaathi.db`) is created and seeded automatically, and rebuilt when the schema version
  changes. `POST /demo/reset` rebuilds it on demand.
- Health checks: `GET /health`, `GET /health/dependencies`, `GET /health/llm` (makes one real LLM call).

## Layout

```
app/
  main.py               REST + WebSocket endpoints
  config.py             settings from .env (secrets never logged)
  db.py                 schema + seeding
  seed_data.py          simulated demo dataset (4 districts × 5 trades, feeds A/B/C, Pragati Path, counsellors)
  seed_history.py       72 simulated history sessions run through the real pipeline
  realtime.py           WebSocket hub
  schemas.py            request models
  services/
    pipeline.py         persona → classify → evidence → reply → resistance → escalation → events
    llm_service.py      the ONLY module that calls an LLM (Groq / Anthropic / OpenAI-compatible) + fact and language guards
    classifier.py       deterministic Hinglish/English rules
    evidence_engine.py  objection → dataset rows → proof cards
    feeds.py            Outcome Data Engine feed registry
    surveys.py          Feed C: IVR micro-survey
    channels.py         WhatsApp channel (simulator + Twilio Sandbox webhook)
    escalation.py       trigger rule, warm-handoff brief, counsellor routing
    resistance.py       Prototype Resistance Index
    responses.py        reply templates
    analytics.py        dashboard aggregates
    geo.py              map opportunities
    voice_service.py    browser speech / BHASHINI adapter
```
