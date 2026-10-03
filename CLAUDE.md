# ParivaarSaathi — SIH26241 (Team Bit Flare)

Source of truth: `docs/ParivaarSaathi_Claude_24H_Master_Context.md`. Read it fully before any work.

- Goal: 24-hour working prototype. A narrow working vertical slice beats a big unfinished platform.
- Build the core loop first: learner goal → parent objection → objection detection → evidence retrieval →
  proof card → resistance change → live admin dashboard → human escalation.
- Stack: React 18 + Vite + Tailwind + Recharts (frontend); Python 3.11 + FastAPI + WebSocket + Pydantic + SQLite (backend).
- All LLM calls go through one `llm_service.py`. The LLM never supplies facts — evidence comes from the dataset.
- Demo data must be visibly labelled as demo data. Never use "100% verified", "zero hallucination",
  "world's first", "guaranteed".
- Always keep a deterministic Demo Scenario Mode that works without the LLM.
