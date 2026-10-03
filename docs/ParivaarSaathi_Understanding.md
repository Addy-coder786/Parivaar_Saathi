# ParivaarSaathi — Claude's Understanding (Pre-Build)

> Written on 2026-10-04 before any implementation. Derived only from
> `docs/ParivaarSaathi_Claude_24H_Master_Context.md` (the source of truth). If this file and the
> master file ever disagree, the master file wins.
>
> Legend: **[CORE]** = must exist in the 24h prototype · **[OPTIONAL]** = P1/P2, only if time
> remains · **[FUTURE]** = production vision, not to be built in 24h.

---

## 1. Problem

**Real-world problem.** A learner wants a skill/vocational pathway (e.g. electrician), but the
family blocks or delays the decision because they do not trust the pathway: income, employment,
safety (especially for girls), social status ("degree nahi toh izzat nahi"), distance, placement
claims and local job prospects. The barrier is not missing courses or missing job portals — India
already has Skill India, NCS, etc. The barrier is **family trust**.

**Users / stakeholders.**
- Learner (student) — wants the pathway.
- Parent (mother/father) — the decision-blocker whose concerns must be answered.
- Human counsellor — receives cases the AI cannot resolve.
- Administrator / government — MSDE / NSDC; needs to know *why* families resist, by district/trade/gender.

**Why it exists.** Five compounding factors (master §2):
student interest + parent resistance + evidence/trust gap + local labour-market uncertainty +
government cannot see why families resist. Evidence cited: NCERT study of 218 parents — 72.5% had
not heard of government vocational courses; 68.8% would enrol after proper information. Outcome
data is mixed and denominator-dependent, so we must never claim "all skill programmes have poor
placement".

---

## 2. Solution

**What it is.** An AI *Family Career Decision & Skilling Platform*: learner and parent share one
counselling session; the system detects the parent's specific objection, answers it with
source-grounded local evidence (not persuasion), escalates unresolved cases to a human counsellor,
and turns every objection into anonymised resistance intelligence for administrators. It is a
trust/conversion layer **over** existing infrastructure, not a replacement for it.

**End-to-end journey.**
1. **Learner** states a goal → learner context: goal = Electrician, interest = Technical.
2. **Parent** raises a concern → parent context: concern = career viability / income.
3. **AI** classifies persona + objection category + severity (structured output).
4. **Evidence engine** queries the dataset by (objection, district, trade) → wage / jobs / course /
   centre / safety records.
5. **Proof card** shown — evidence rendered separately from the generated explanation, each claim
   with a source chip; demo data visibly labelled.
6. **Decision / resistance change** — Prototype Resistance Index moves (e.g. High → Medium /
   "Open to counselling").
7. If still resistant → **warm-handoff brief** into the counsellor queue.
8. **Administrator** dashboard receives a resistance event over WebSocket live (district, trade,
   gender, objection, before→after).

---

## 3. Core Innovation — Family-Level Career Decision Intelligence

Traditional: `Student → Career recommendation`.
ParivaarSaathi: `Student + Parent → Joint conversation → Objection detection → Evidence retrieval
→ Parent-specific explanation → Family decision → Outcome/resistance telemetry → Government
intervention`.

Key idea: **every disagreement becomes a query for evidence rather than an argument.** A normal AI
counsellor answers "what should the student choose?" for one user. ParivaarSaathi answers "what
happens when the student wants it but the family doesn't trust it?" — it models two personas with
conflicting goals in one session, resolves the *conflict* with proof, and feeds the conflict data
upward to policy. Recommendation is not the product; the family decision barrier is.

---

## 4. Three Core USPs

### USP 1 — Dual-Persona Family AI
One session, two perspectives. The system keeps **separate concurrent state** for learner (goal,
interest) and parent (list of concerns, severity, resolved/unresolved). Not just two accounts — the
point is a single *family dialogue state* where the AI knows the two parties may disagree and
tailors responses to the persona (parent gets proof for their concern; learner's goal stays tracked).

### USP 2 — Proof-Driven Objection Resolution
"We don't ask AI to convince parents. We ask it to prove the answer." Parent utterances map to
structured intents (income, employment, safety, social_status, distance, placement, course_quality,
gender). Each category maps to a deterministic retriever (wage data, local jobs, centre safety,
verified outcomes, career progression, nearby centres). Output = Proof Card with source/proof chip
on every important factual claim. No unsupported claims.

Named cards: **Paisa-Map** (wage progression training → entry → experienced → supervisor →
self-employed, labelled with source/geography/occupation/period), **Beti Suraksha** (female staff,
CCTV, transport, distance, centre verification, hours, emergency contact — never invented),
**Neighbourhood Job Radar** (N opportunities within X km + employer list), **Career Roadmap**
(NSQF L3 → course → apprenticeship → junior → experienced → supervisor → contractor).

### USP 3 — Resistance-to-Policy Intelligence
Every interaction emits a structured event: district, trade, gender, objection, severity,
before-state, after-state, evidence shown, outcome. Aggregated on an admin dashboard (objection
distribution, district/trade/gender breakdown, funnel, unresolved cases, live feed, escalation
queue). This converts the product from "chatbot" into **citizen counselling + policy diagnostics**.
Long-term moat = this interaction dataset (which objections block which trades in which districts,
and which evidence resolves them), not the LLM.

---

## 5. Competitive Understanding

| Existing | What it already does | So we must NOT claim |
|---|---|---|
| Skill India Assistant (MSDE/NSDC/Meta) | WhatsApp AI, course discovery, nearby centres, jobs, quizzes | "first AI WhatsApp career assistant" |
| NCS | Counselling, vocational guidance, jobs, apprenticeships, career centres, counsellors | "government has no career counselling" |
| BHASHINI | Indian-language ASR/TTS/translation infrastructure | that multilingual is our differentiator (BHASHINI = language infra; we = family decision infra) |
| Xello | Career exploration, planning, parent participation, educator dashboards | parent participation or dashboards are unique |
| Unifrog | Students, educators, counsellors, parents | parent involvement is unique |
| Indian platforms (Dheya, Xcellify, CareerGrid, CounselNest, Future Path…) | AI + psychometrics + parents + roadmaps + counselling + multilingual | any of those individual capabilities are unique |
| Academic research (IEEE etc.) | AI/ML/RIASEC/hybrid career recommendation, conversational & multilingual counselling | "AI career recommendation is new" |

**Where we are differentiated** — the *combination*, not any single feature:
concurrent learner-parent counselling + objection-specific evidence retrieval + local outcome proof
+ human escalation + resistance telemetry + government policy intelligence. Phrase as "potentially
differentiated" against the "publicly reviewed competitor landscape". We position as a layer that
can sit on top of Skill India / NCS (escalation hands off to NCS-style human counsellors).

---

## 6. Technical Architecture (5 layers)

1. **Family Session Engine** — React WhatsApp-like family chat [CORE]; persona tracking, message
   history, language mode, session state [CORE]. Twilio WhatsApp sandbox, voice-note sim, IVR
   [OPTIONAL/FUTURE].
2. **AI Orchestration** — FastAPI: intent/persona classifier → evidence retriever → LLM response
   builder; guardrails; conversation state [CORE]. All LLM calls via one `llm_service.py`.
   Deterministic Demo Scenario Mode that works without the LLM [CORE].
3. **Verified Outcome Data Engine (VODE)** — production vision: SIDH/NSDC, PLFS, e-Shram, local
   jobs, training centres, alumni micro-surveys [FUTURE]. Prototype: normalized, internally
   consistent demo dataset in SQLite, visibly labelled "Demonstration dataset — production version
   connects authorised government/data-provider interfaces" [CORE].
4. **Human Escalation Fabric** — threshold check → warm-handoff brief (learner, parent, district,
   trade, top concerns, evidence shown, remaining concern, suggested counsellor action) →
   counsellor queue [CORE for demo, as a simple queue]. Real NCS integration [FUTURE].
5. **Resistance Intelligence Dashboard** — React + Tailwind + Recharts, WebSocket: KPIs (active
   sessions, high resistance, resolved objections, escalations), objection distribution, district
   view, live event feed, escalation queue [CORE]. MapLibre geo map [OPTIONAL].

Backend endpoints: `POST /session`, `POST /message`, `POST /objection`, `GET /evidence`,
`POST /resistance`, `POST /escalation`, `WS /events`.
Tables: sessions, messages, objections, evidence, jobs, training_centres, resistance_events,
escalations (+ users).

---

## 7. Killer Demo

Setup: district Sikar, trade Electrician, learner female.
1. Student: "Mujhe electrician course karna hai." → learner goal captured.
2. Parent: "Electrician mein future nahi hai." → AI tags persona=Parent, objection=career viability
   (employment/income), district=Sikar, trade=Electrician.
3. Proof card: local employment (e.g. 17 active opportunities), local wage range entry/experienced,
   course NSQF level, [View Source] — numbers from demo dataset, labelled.
4. Parent: "Ladki ke liye safe hai?" → objection switches to SAFETY (female).
5. Beti Suraksha card: female staff, CCTV, centre info, transport, safety evidence, [Proof].
6. Resistance: BEFORE High → AFTER Open to counselling / Medium.
7. Admin dashboard updates **live**: SIKAR · Electrician · Female · new objection Safety ·
   Resistance High → Medium. ← the "wow moment".
8. Escalation case appears in counsellor queue with warm-handoff brief.

Must be repeatable with no dead buttons and no random AI responses.

---

## 8. 24-Hour MVP

**MUST (P0):** family chat UI; learner/parent persona state; objection detection; evidence
retrieval; proof cards; resistance event creation; admin dashboard; live chat→dashboard update;
deterministic Demo Scenario Mode; human escalation trigger (required by Definition of Done #8).

**SHOULD (P1):** voice-note simulation, Hindi/Hinglish responses, stylised local job map,
escalation queue polish, analytics charts.

**ONLY IF TIME (P2):** real BHASHINI, Twilio sandbox, MapLibre, real-time STT, advanced RAG, Redis,
Celery, real government API adapters.

**DO NOT BUILD (P3):** Aadhaar auth, approval-gated government integrations, full IVR, production
WhatsApp Business, production security/audit, national-scale DB, ML training, microservices.

---

## 9. Data & AI

**Data needed.** Districts: Sikar, Pune, Nashik, Jaipur. Trades: Electrician, Solar Technician,
Welder, CNC Operator, Healthcare Assistant. Per (district, trade): wage (progression), jobs/
employers with distance, course (NSQF level), centre, centre safety fields, source, date. Internally
consistent, all labelled demo.

**Objection detection.** Message → structured output
`{persona, intent, objection, severity, needs_evidence}`. LLM path: LLM returns this JSON via
`llm_service.py`. Deterministic path: keyword/rule matching on Hinglish phrases (salary/paisa →
income; job milegi → employment; safe/ladki → safety; izzat/degree → social_status; paas/door →
distance; placement → placement).

**Evidence retrieval.** Deterministic mapping objection → retriever → SQL query on
(district, trade). No vector RAG required for the MVP.

**LLM role.** Classification and *phrasing* only — formats a parent-friendly explanation (in the
family's language) around evidence records it is handed. The LLM never supplies facts.

**Avoiding unsupported claims.** Evidence rendered in the UI from DB records, separate from the
generated text; every claim carries a source chip; LLM prompted only with retrieved records; if no
record exists, say so / escalate rather than generate; demo data labelled; banned wording ("100%
verified", "zero hallucination", "world's first", "guaranteed placement/salary", "AI replaces
counsellors"); resistance score called **Prototype Resistance Index** (HIGH 70–100, MEDIUM 40–69,
LOW 0–39), not a validated psychological measure.

---

## 10. Unclear / Unsupported Points in the Master File (to resolve before or during build)

1. **Escalation vs. demo flow conflict.** Escalation triggers on `score >= threshold AND multiple
   unresolved objections`, but the demo ends with resistance *dropping* to Medium. Definition of
   Done #8 still requires triggering an escalation. Need a decision: e.g. a residual concern (social
   status) stays unresolved, a manual "Escalate to counsellor" button, or a second seeded scenario.
2. **Resistance labels inconsistent.** §7 Step 6 says "High → Open to counselling"; Step 7 says
   "High → Medium". Need one mapping (e.g. Medium band displayed as "Open to counselling").
3. **Score formula undefined.** Bands are given but signal weights (repeated objection, refusal,
   sentiment, evidence shown) are not. Must define a simple deterministic rule.
4. **Objection taxonomy inconsistent.** Demo uses "Career Viability" and "Female Safety"; schema
   categories are income/employment/safety/social_status/distance/placement/course_quality/gender.
   Need explicit mapping (career viability → employment+income; female safety → safety with gender
   flag).
5. **Persona detection source.** Layer 2 says "persona classification", but the chat UI has
   persona labels. Unclear whether persona comes from who is typing (UI toggle) or is inferred from
   text. Safest: explicit persona selector, classifier only as fallback.
6. **District/gender origin.** Demo shows district Sikar and learner Female, but no step captures
   them — implies a session-setup step.
7. **Schema gaps.** `users`, `jobs`, `training_centres` are listed as tables but not specified in §10.
8. **WS event shape vs. scores.** §9 event has `severity`; resistance_events has
   before_score/after_score. Event payload needs both.
9. **NCERT statistic** has no citation in the file — verify source before putting it on a slide.
10. **"Verified" in VODE name** sits awkwardly next to demo data; keep claims to "source-grounded"
    in the UI.
11. **LLM provider** is not specified ("use an available LLM API").

---

## MY UNDERSTANDING OF PARIVAARSAATHI

- **One-sentence problem:** Learners who want a vocational pathway are often blocked by parents who
  don't trust its income, jobs, safety or status, and the government can't see why families resist.
- **One-sentence solution:** A shared AI counselling session for learner and parent that detects the
  parent's specific objection, answers it with labelled local evidence, escalates unresolved cases
  to a human counsellor, and streams every objection to an administrator dashboard.
- **One-sentence innovation:** It treats career adoption as a *family decision* problem, turning
  each disagreement into an evidence query and each objection into policy intelligence.
- **Three USPs:** (1) Dual-Persona Family AI — concurrent learner/parent dialogue state;
  (2) Proof-Driven Objection Resolution — objection → structured evidence → proof card, LLM never
  supplies facts; (3) Resistance-to-Policy Intelligence — district/trade/gender resistance telemetry
  for MSDE/NSDC.
- **Architecture flow:** React family chat → FastAPI `/message` → persona+objection classifier
  (`llm_service.py` or deterministic rules) → evidence retriever (SQLite demo dataset by
  objection/district/trade) → response builder (LLM phrasing around records) → proof card in chat
  → Prototype Resistance Index update → resistance_event saved → WebSocket broadcast → admin
  dashboard; if threshold + unresolved → warm-handoff brief → counsellor queue.
- **Demo flow:** Sikar, female learner → "Mujhe electrician course karna hai" → parent "Electrician
  mein future nahi hai" → detected Parent/career-viability → jobs + wage + NSQF proof card →
  "Ladki ke liye safe hai?" → Safety → Beti Suraksha card → resistance High → Medium → dashboard
  live event → escalation case in counsellor queue.
- **Build principle:** narrow working vertical slice of that loop first; everything else secondary.

---

## Appendix — Kickoff prompt used to produce this file

The user asked Claude to read the master file fully, not code yet, and explain back: problem,
solution/journey, core innovation, three USPs, competitive landscape and differentiation, 5-layer
architecture, killer demo, 24h MVP must/must-not, data & AI (data, objection detection, evidence
retrieval, LLM use, hallucination avoidance), and a final summary — without inventing features,
without generic advice, distinguishing core vs. future/optional, flagging anything unclear, ending
with a "MY UNDERSTANDING OF PARIVAARSAATHI" section. Next step after user verification: an
implementation prompt.
