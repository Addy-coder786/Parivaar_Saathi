# ParivaarSaathi — 3-Phase Implementation Plan

> **Status (2026-10-04): all three phases delivered.** See `README.md` for how to run and
> `docs/DEMO_SCRIPT.md` for the judge-facing walkthrough. Deviations from the plan below:
> the MapLibre district map was added after the first delivery (dashboard, HTML markers over an OpenFreeMap
> vector basemap, with a plain-background fallback so it degrades gracefully offline); the LLM provider is Groq
> (free tier) rather than Anthropic; voice uses the
> browser's Web Speech API behind the ASR/TTS adapter boundary rather than BHASHINI; the Demo Scenario
> button always runs the deterministic path even when AI mode is on. The "open questions" defaults
> at the bottom are what was implemented.

> Principle (master §21): a working narrow vertical slice beats a big unfinished platform.
> Each phase ends in a **demo-able state**. If time runs out after any phase, we still have
> something to show.

---

## Phase 1 — Thin End-to-End Loop (deterministic, no LLM)

**Goal:** the full loop works once, end to end, in Demo Scenario Mode:
learner goal → parent objection → detection → evidence → proof card → resistance change →
event shows up live on the dashboard.

### Backend
- SQLite schema: `sessions`, `messages`, `objections`, `evidence`, `jobs`, `training_centres`,
  `resistance_events`, `escalations`.
- Seed script with **Sikar × Electrician** only (enough for the demo), every record labelled
  "Demo dataset".
- `classifier.py`: rule-based Hinglish keyword → `{persona, intent, objection, severity, needs_evidence}`.
- `evidence_engine.py`: objection → retriever → records for (district, trade).
- `resistance.py`: Prototype Resistance Index (simple deterministic rules, bands High/Medium/Low).
- Endpoints: `POST /session`, `POST /message` (runs the whole pipeline), `GET /evidence`.
- On every parent objection: write a `resistance_event` and broadcast it on `WS /events`.

### Frontend
- Session setup: district, trade, learner gender, parent relation.
- Family chat: persona selector (Learner / Parent), message bubbles with persona labels.
- Detection chip (persona + objection) under each parent message.
- Generic proof card (evidence rows + source chip + "Demo data" badge).
- Resistance meter (before → after).
- Dashboard page (bare): live event feed only.
- Simple view switch between Chat and Dashboard (no router needed).

### Exit criteria
Steps 1–7 of the killer demo (§7) work by typing the exact scripted lines; the dashboard feed
updates live in a second tab.

---

## Phase 2 — Full Demo Depth (escalation, dashboard, evidence cards)

**Goal:** everything in the Definition of Done, including escalation, with a dashboard that looks
like real intelligence.

### Backend
- Expand the dataset: 4 districts (Sikar, Pune, Nashik, Jaipur) × 5 trades, internally consistent.
- Seed historical `resistance_events` so the dashboard isn't empty at the start of the demo.
- All objection categories mapped to retrievers: income, employment, safety, social_status,
  distance, placement.
- Escalation rule + warm-handoff brief generator; `POST /escalation`, `GET /escalations`.
- Aggregate endpoints for the dashboard: KPIs, objections by category/district/trade/gender.

### Frontend — specialised cards
- **Paisa-Map** (wage progression), **Job Radar** (opportunities within X km + employer list),
  **Beti Suraksha** (safety fields), **Career Roadmap** (NSQF → supervisor → contractor).

### Frontend — dashboard
- KPI cards (active sessions, high resistance, resolved objections, escalations).
- Objection distribution chart, district/trade/gender breakdown (Recharts).
- Live event feed, escalation queue with "View case" → warm-handoff brief.
- Counsellor queue view.

### Demo Scenario Mode
- "Run demo" button that plays the scripted conversation step by step (no typing needed),
  fully deterministic.

### Exit criteria
A judge can do all 9 Definition-of-Done steps; the demo runs 10 times in a row without failure.

---

## Phase 3 — AI, Language, Polish & Hardening

**Goal:** add the LLM layer *on top of* the working deterministic system, then polish.

### AI
- Wire `llm_service.py` into the pipeline:
  - LLM classifier with structured JSON output; falls back to rules on error or low confidence.
  - LLM phrasing of the answer around the retrieved evidence records only (prompted never to add
    facts); evidence is still rendered from the DB, separate from the text.
- Hindi/Hinglish responses matching the family's language.
- Template fallback when the LLM is off, so Demo Mode is unchanged.

### P1 features (only if time remains)
- Voice-note simulation (UI + mock ASR adapter; browser speech as an optional extra).
- Stylised local job map (MapLibre only if it's quick; otherwise a district heat table).

### Hardening & polish
- Loading/error states, animations, mobile layout.
- Remove `/dev/ping-event` and the env-check page.
- Wording audit against banned claims ("100% verified", "guaranteed", etc.).
- Health check shows evidence engine status.
- README with run commands; final rehearsal runs.

### Exit criteria
Works with an API key (LLM mode) and without one (Demo mode), and passes the
"can a judge understand it in 60 seconds" check.

---

## Decisions on the open questions (defaults; change if needed)

| # | Question | Default decision |
|---|---|---|
| 1 | Escalation vs. resistance dropping | Escalation fires when the index ≥ 70 **and** (≥ 2 unresolved objections **or** an explicit refusal after evidence was shown), **plus** a manual "Talk to a counsellor" button. In the demo: after the safety card brings resistance to Medium, the parent says something like "Phir bhi, degree nahi toh izzat nahi" (social status + refusal) → index back to High → warm-handoff brief appears in the counsellor queue. |
| 2 | "Open to counselling" vs. "Medium" | The Medium band is *displayed* as "Medium — open to counselling". |
| 3 | Score formula | Index starts at 60 when the session opens. Parent objection +15 (repeat of the same category +10, explicit refusal +20); evidence shown for that objection −15; clamp 0–100. Demo trace: 60 → objection 75 (High) → proof 60 (Medium) → safety 75 → safety card 60 → social status + refusal 95 → escalate. An objection counts as resolved once its evidence has been shown and the parent doesn't raise it again. |
| 4 | Objection taxonomy | "Career viability" → employment (+ income card); "Female safety" → safety with `gender=female`. |
| 5 | Persona source | Explicit Learner/Parent selector in the UI; the classifier only validates it. |
| 6 | District / gender | Captured on the session setup screen. |
| 8 | WS event shape | `{type, session_id, district, trade, gender, objection, severity, before_score, after_score, before_band, after_band, timestamp}`. |
