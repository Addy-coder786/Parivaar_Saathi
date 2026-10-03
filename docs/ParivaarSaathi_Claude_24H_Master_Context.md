# PARIVAARSAATHI — Claude Master Execution Context
## SIH26241 | 24-Hour Prototype Plan | Bit Flare

> **Purpose of this file:** This is the master context for Claude Code. Use it as the source of truth for understanding the problem, product positioning, research-backed differentiation, MVP scope, architecture, and 24-hour execution plan.
>
> **Primary goal:** Build a convincing, working prototype in 24 hours. Prioritize the core innovation and live demo over production completeness.

---

# 1. PROJECT IDENTITY

**Project:** ParivaarSaathi (परिवार साथी)  
**Team:** Bit Flare  
**Hackathon:** Smart India Hackathon (SIH)  
**Problem Statement:** SIH26241  
**Title:** AI-enabled counselling platform engaging learners AND parents jointly, with verified outcome data, human escalation, and an administrator resistance dashboard.  
**Domain:** Smart Education / Skilling & Vocational Training  
**Stakeholder:** Ministry of Skill Development and Entrepreneurship (MSDE) / National Skill Development Corporation (NSDC)

## One-line product

> **ParivaarSaathi doesn't just recommend careers — it helps families trust them.**

## Product positioning

Do NOT position this as just an:
- AI career counsellor
- career recommendation chatbot
- multilingual chatbot
- WhatsApp career bot
- parent dashboard

Those capabilities already exist individually.

Position ParivaarSaathi as:

> **An AI Family Career Decision & Skilling Platform that brings learner and parent into the same counselling session, resolves parental objections using source-grounded local evidence, and converts aggregated resistance into actionable intelligence for administrators.**

---

# 2. THE CORE PROBLEM

India already has substantial skilling and career infrastructure. The problem is not simply lack of courses or lack of job information.

The deeper problem is:

> **A learner may want a skill/vocational pathway, but the family may block or delay the decision because they do not trust the pathway, income, safety, social status, placement claims, or local employment prospects.**

Parents are active participants in career decisions.

Research cited during project validation includes an NCERT study of 218 parents in which:
- 72.5% had not heard of government vocational courses.
- 68.8% were willing to enroll their children after receiving proper information.

The uploaded project context also identifies family influence and distrust around outcomes as major adoption barriers.

Government outcome data and audits also show that employment/placement outcomes require careful interpretation. Do NOT make simplistic claims such as "all skill programmes have poor placement." Different datasets use different programme scopes and denominators.

### Important framing

The problem is:

**Student interest**
+
**Parent resistance**
+
**Evidence/trust gap**
+
**Local labour-market uncertainty**
+
**Government cannot easily see WHY families resist**

Therefore:

> **ParivaarSaathi treats career adoption as a family decision problem, not just a recommendation problem.**

---

# 3. EXISTING ECOSYSTEM / COMPETITIVE RESEARCH

## 3.1 Skill India Assistant

MSDE/NSDC/Meta's Skill India Assistant already provides AI-enabled conversational access through WhatsApp, course discovery, nearby training centres, jobs, quizzes and related guidance.

Therefore:

### DO NOT CLAIM:
"ParivaarSaathi is the first AI WhatsApp career assistant."

### DIFFERENCE:
Skill India Assistant is primarily a citizen-facing service/discovery layer.

ParivaarSaathi focuses on:

**Learner + Parent joint dialogue**
→
**Parent objection detection**
→
**Evidence retrieval**
→
**Family decision**
→
**Resistance analytics**

---

## 3.2 National Career Service (NCS)

NCS already provides career counselling, vocational guidance, jobs, apprenticeships, career centres and counsellors.

Therefore:

### DO NOT CLAIM:
"Government has no career counselling."

### DIFFERENCE:
ParivaarSaathi can act as a family-level trust/conversion layer over existing skilling and career infrastructure.

When the AI cannot resolve a high-resistance case:

**AI → structured warm-handoff brief → human counsellor**

---

## 3.3 BHASHINI

BHASHINI is language infrastructure, not the product differentiation.

Use it for:
- Indian-language speech recognition
- speech synthesis
- multilingual accessibility
- low-literacy/voice-first interaction

Position:

> **BHASHINI = language infrastructure**
>
> **ParivaarSaathi = family decision infrastructure**

For the 24-hour prototype, actual BHASHINI integration may be mocked or simplified if API setup becomes a time sink. The architecture must still leave a clean integration boundary.

---

## 3.4 Xello

Xello provides career exploration, planning, student self-discovery, parent/family participation and educator dashboards.

It proves that:
- career planning is established
- parent participation is established
- dashboards are established

ParivaarSaathi differentiates through:
- real-time joint parent/student counselling
- objection-specific evidence
- local outcome verification
- resistance telemetry for administrators

---

## 3.5 Unifrog

Unifrog supports students, educators, counsellors, institutions and parents.

Again:

**Parent involvement is not unique.**

The differentiator is the **objection → evidence → decision → telemetry** workflow.

---

## 3.6 Indian career-counselling platforms

Products/platforms such as Dheya, Xcellify, CareerGrid, CounselNest, Future Path Counselling and similar systems demonstrate that combinations of:
- AI
- psychometric assessment
- parents
- career roadmaps
- counselling
- multilingual support

already exist.

Therefore do not claim those individual capabilities as unique.

---

## 3.7 Academic research

Research indexed through IEEE and publicly indexed academic literature already covers:
- AI career recommendation
- conversational career counselling
- multilingual GenAI counselling
- machine-learning career prediction
- RIASEC-based career recommendation
- hybrid career recommendation systems
- objective/behavioural career assessment

Therefore:

### DO NOT CLAIM:
"AI career recommendation is new."

### Research gap to pursue:
The publicly reviewed systems did not show the exact end-to-end combination at the centre of this project:

> **Concurrent learner-parent counselling + objection-to-evidence resolution + local outcome proof + human escalation + government resistance intelligence.**

This is the defensible differentiation statement.

---

# 4. UNIQUE VALUE PROPOSITION

## Core innovation

### Family-Level Career Decision Intelligence

Traditional:

```text
Student
   ↓
Career Recommendation
```

ParivaarSaathi:

```text
Student + Parent
        ↓
Joint Conversation
        ↓
Objection Detection
        ↓
Evidence Retrieval
        ↓
Parent-Specific Explanation
        ↓
Family Decision
        ↓
Outcome / Resistance Telemetry
        ↓
Government Intervention
```

The key concept:

> **Every disagreement becomes a query for evidence rather than an argument.**

The AI should not "convince" the parent through generic persuasion.

It should provide grounded evidence.

---

# 5. THE 3 MAIN USPs

## USP 1 — Dual-Persona Family AI

**One counselling session, two perspectives.**

The system maintains separate contexts for:
- Learner
- Parent

Example:

```text
Student:
"Mujhe electrician course karna hai."

Parent:
"Electrician mein future nahi hai."

System state:

LEARNER
Goal = Electrician
Interest = Technical

PARENT
Concern = Career viability
Concern = Income
```

The AI should understand that these are different personas with potentially conflicting goals.

This is more than having two separate accounts.

The core concept is:

> **Concurrent family dialogue state.**

---

## USP 2 — Proof-Driven Objection Resolution

> **We don't ask AI to convince parents. We ask it to prove the answer.**

Parent objections should be converted into structured intents:

```text
"Isme salary kitni hai?"
→ OBJECTION: INCOME

"Job milegi?"
→ OBJECTION: EMPLOYMENT

"Ladki ke liye safe hai?"
→ OBJECTION: SAFETY

"Degree nahi toh izzat nahi."
→ OBJECTION: SOCIAL_STATUS

"Centre paas mein hai?"
→ OBJECTION: DISTANCE
```

Then retrieve structured evidence:

```text
Objection
   ↓
Evidence Engine / RAG
   ↓
Local wage data
Local jobs
Course data
Centre information
Safety information
Placement/outcome evidence
   ↓
Proof Card
```

Every important factual claim should have a visible source/proof indicator.

Do NOT make unsupported claims.

---

## USP 3 — Resistance-to-Policy Intelligence

The system does not stop after counselling.

Every interaction can produce structured telemetry:

```text
District
Trade
Gender
Objection
Severity
Before-state
After-state
Evidence shown
Outcome
```

Example:

```text
District: Sikar
Trade: Electrician
Objection: Safety
Learner gender: Female
Resistance: High → Medium
```

Government/admin dashboard can show:

```text
DISTRICT RESISTANCE

Salary          ████████
Safety          ██████
Social Status   █████
Distance        ███

Top concern:
"Low salary perception"
```

This changes the product from:

> "AI chatbot"

to:

> **Citizen counselling + policy diagnostics.**

---

# 6. CURRENT MASTER ARCHITECTURE

The original blueprint defines five layers.

## Layer 1 — Omnichannel / Family Session Engine

Prototype channels:
- React WhatsApp-like interface
- Optional Twilio WhatsApp Sandbox
- Optional voice simulation
- Future IVR

Responsibilities:
- parent/student persona tracking
- message history
- language mode
- session state

---

## Layer 2 — AI Orchestration

Responsibilities:
- intent detection
- persona classification
- objection classification
- response generation
- evidence retrieval
- guardrails
- conversation state

Suggested implementation:

```text
FastAPI
  ↓
Intent / Persona Classifier
  ↓
Evidence Retriever
  ↓
LLM Response Builder
```

---

## Layer 3 — Verified Outcome Data Engine (VODE)

The original blueprint proposes data from:
- Skill India Digital Hub / NSDC
- PLFS
- e-Shram
- local job information
- training-centre information
- alumni micro-surveys

For the prototype, use a normalized demo dataset.

### Important:
Do not pretend demo data is live government data.

Clearly label prototype data where necessary:

> "Demonstration dataset — production version connects authorised government/data-provider interfaces."

---

## Layer 4 — Human Escalation Fabric

If the AI detects unresolved/high resistance:

```text
AI
 ↓
Escalation threshold
 ↓
Generate Warm-Handoff Brief
 ↓
Counsellor Queue
```

Warm-handoff example:

```text
Learner:
Electrician

Parent:
Mother

District:
Sikar

Primary concerns:
1. Safety
2. Salary
3. Social status

Evidence already shown:
- Local wage card
- Job card

Status:
Still resistant

Recommended counsellor action:
Explain local employer + safety pathway
```

For the prototype, this can simply appear as a counsellor queue.

Do not spend time building a real NCS integration.

---

## Layer 5 — Resistance Intelligence Dashboard

Tech:
- React
- Tailwind
- MapLibre if time allows
- Recharts
- WebSocket or polling

Dashboard:
- district resistance map
- objection breakdown
- trade breakdown
- gender breakdown
- sentiment/resistance funnel
- unresolved cases
- live event stream

---

# 7. CORE DEMO — THE MOST IMPORTANT PART

The judges must see one complete story.

## Scenario

A student wants to join an electrician course.

Parent objects.

### Step 1

Student:

> "Mujhe electrician course karna hai."

### Step 2

Parent:

> "Electrician mein future nahi hai."

### Step 3 — AI detects

```text
Persona:
Parent

Objection:
Career Viability

District:
Sikar

Trade:
Electrician
```

### Step 4 — Evidence

Show:

```text
LOCAL EMPLOYMENT

17 active opportunities

LOCAL WAGE RANGE

Entry-level: ₹XX
Experienced: ₹XX

COURSE

NSQF Level: X

[View Source]
```

Numbers should come from your demo dataset and be clearly labelled if simulated.

### Step 5

Parent:

> "Ladki ke liye safe hai?"

AI changes objection:

```text
OBJECTION:
FEMALE SAFETY
```

Show:

```text
✓ Female staff
✓ CCTV
✓ Centre information
✓ Transport information
✓ Safety evidence

[Proof]
```

### Step 6

Parent status:

```text
BEFORE:
HIGH RESISTANCE

AFTER:
OPEN TO COUNSELLING
```

### Step 7 — Live admin dashboard

Immediately show:

```text
SIKAR
Electrician
Female

New objection:
Safety

Resistance:
High → Medium
```

This live event propagation is the "wow moment".

---

# 8. 24-HOUR BUILD PRIORITY

## Priority hierarchy

### P0 — MUST WORK

1. Family chat UI
2. Parent/learner persona state
3. Objection detection
4. Evidence retrieval
5. Proof cards
6. Resistance event creation
7. Admin dashboard
8. Live update between chat and dashboard

### P1 — SHOULD WORK

9. Voice-note simulation
10. Hindi/Hinglish response
11. Local job map
12. Human escalation queue
13. Analytics charts

### P2 — ONLY IF TIME REMAINS

14. Actual Bhashini API
15. Twilio WhatsApp Sandbox
16. MapLibre geographic map
17. real-time speech-to-text
18. advanced RAG
19. Redis
20. Celery
21. real government API adapters

### P3 — DO NOT BUILD IN 24 HOURS

- production Aadhaar authentication
- real government integrations requiring approval
- full IVR infrastructure
- production WhatsApp Business approval
- production-grade security/audit system
- complete national-scale database
- complex ML training
- complicated microservice architecture

---

# 9. RECOMMENDED 24-HOUR TECH STACK

## Frontend

- React 18
- Vite
- Tailwind CSS
- Recharts
- MapLibre only if time permits

## Backend

- Python 3.11
- FastAPI
- WebSocket
- Pydantic

## Database

For speed:

**SQLite or PostgreSQL**

Recommended:

- SQLite for fastest initial implementation
- PostgreSQL if already configured

Tables:

```text
users
sessions
messages
objections
evidence
jobs
training_centres
resistance_events
escalations
```

## AI

Use an available LLM API.

Keep model access behind one service:

```text
llm_service.py
```

Never scatter API calls throughout the codebase.

## Voice

Prototype first with:
- text
- simulated voice-note UI

If time remains:
- Bhashini ASR/TTS
- browser speech APIs

## Realtime

FastAPI WebSocket.

Event:

```json
{
  "type": "resistance_update",
  "district": "Sikar",
  "trade": "Electrician",
  "objection": "Safety",
  "severity": "high"
}
```

---

# 10. DATABASE DESIGN

Minimum schema.

## sessions

```text
id
student_id
parent_id
district
trade
language
status
created_at
```

## messages

```text
id
session_id
persona
text
intent
timestamp
```

## objections

```text
id
session_id
persona
category
severity
resolved
```

Categories:

```text
income
employment
safety
social_status
distance
placement
course_quality
gender
```

## evidence

```text
id
category
district
trade
title
value
source
source_url
confidence
```

## resistance_events

```text
id
session_id
district
trade
objection
gender
before_score
after_score
timestamp
```

## escalations

```text
id
session_id
priority
reason
summary
status
created_at
```

---

# 11. EVIDENCE ENGINE

The system should never simply let the LLM invent factual claims.

Use structured retrieval.

Example:

```text
User objection:
"Electrician mein job milegi?"

↓ classify

employment

↓ retrieve

district = Sikar
trade = electrician

↓

evidence records

↓
LLM formats response

↓
Proof Card
```

Example response object:

```json
{
  "answer": "Aapke district mein electrician-related opportunities available hain.",
  "evidence": [
    {
      "label": "Active opportunities",
      "value": "17",
      "source": "Demo labour-market dataset"
    }
  ]
}
```

The UI should display the evidence separately from the generated explanation.

---

# 12. RESISTANCE SCORE

Do not overcomplicate this.

For the prototype, use a simple deterministic score.

Example:

```text
HIGH = 70–100
MEDIUM = 40–69
LOW = 0–39
```

Possible signals:

```text
negative objection
repeated objection
explicit refusal
sentiment
unresolved questions
```

Do not claim this is a scientifically validated psychological score.

Call it:

> **Prototype Resistance Index**

not a clinical or validated psychological measurement.

---

# 13. OBJECTION RESOLUTION LOGIC

Example:

```python
if objection == "income":
    retrieve_wage_data()

elif objection == "employment":
    retrieve_local_jobs()

elif objection == "safety":
    retrieve_centre_safety_data()

elif objection == "placement":
    retrieve_verified_outcomes()

elif objection == "social_status":
    retrieve_career_progression()

elif objection == "distance":
    retrieve_nearby_centres()
```

Then:

```text
Evidence
+
Parent language preference
+
Persona
+
Conversation context
        ↓
Response
```

---

# 14. CAREER ROADMAP

Keep it simple.

Example:

```text
NSQF Level 3
     ↓
Electrician Course
     ↓
Apprenticeship
     ↓
Junior Technician
     ↓
Experienced Technician
     ↓
Supervisor
     ↓
Self-employment / Contractor
```

The point is not to produce a generic career roadmap.

The point is to answer:

> "Is there a future after this course?"

---

# 15. "PAISA-MAP"

This can be one of the strongest UI cards.

Example:

```text
CAREER PROGRESSION

Training
₹X

Entry-level
₹X

Experienced
₹X

Supervisor
₹X

Self-employed
₹X+
```

Clearly label:
- source
- geography
- occupation
- time period

Never compare salaries without matching geography/time/occupation appropriately.

---

# 16. "BETI SURAKSHA" CARD

The original blueprint proposes a female-safety evidence card.

Keep it evidence-based.

Possible fields:

```text
Female staff
CCTV
Transport
Centre distance
Centre verification
Training hours
Emergency contact
```

Do NOT invent centre safety information.

If prototype data is simulated:

> "Demo centre data"

must be visible.

---

# 17. "NEIGHBOURHOOD JOB RADAR"

The original concept:

> Show parents how many local employers are hiring for the selected skill within a radius.

Prototype:

```text
17 opportunities
within 15 km

Employer A
Employer B
Employer C
...
```

If using simulated data, clearly label it.

Map can be a simple stylized map if actual geospatial integration takes too long.

---

# 18. HUMAN ESCALATION

Trigger when:

```text
resistance_score >= threshold
AND
multiple objections remain unresolved
```

Generate:

```text
WARM HANDOFF BRIEF

Learner:
...

Parent:
...

District:
...

Trade:
...

Top concerns:
...

Evidence already shown:
...

Remaining concern:
...

Suggested counsellor action:
...
```

This demonstrates human-in-the-loop AI rather than AI replacing counsellors.

---

# 19. ADMIN DASHBOARD

Minimum dashboard sections:

### Header

```text
PARIVAARSAATHI
Resistance Intelligence
```

### KPI cards

```text
Active Sessions
High Resistance
Resolved Objections
Escalations
```

### Objection distribution

```text
Salary
Safety
Employment
Social Status
Distance
```

### District view

```text
Sikar
Pune
Nashik
Jaipur
...
```

### Live event feed

```text
23:41
Sikar
Electrician
Safety objection

23:42
Sikar
Resistance High → Medium
```

### Escalation queue

```text
Case #102
Female learner
Safety objection
High resistance
[View Case]
```

---

# 20. 24-HOUR EXECUTION PLAN

## Hour 0–1 — Freeze scope

Do not code everything.

Decide:

**One demo journey**
- Electrician
- Parent objection
- Evidence
- Resolution
- Dashboard telemetry

Set up:
- Git repo
- React
- FastAPI
- environment variables
- database

---

## Hour 1–3 — Frontend shell

Build:

1. Family chat
2. Parent/learner message bubbles
3. Persona labels
4. Evidence cards
5. Proof chip
6. Resistance indicator

Goal:

> UI looks convincing even before backend is complete.

---

## Hour 3–5 — Backend

Build:

```text
POST /session
POST /message
POST /objection
GET /evidence
POST /resistance
POST /escalation
WS /events
```

---

## Hour 5–7 — Database

Create:
- sessions
- messages
- objections
- evidence
- resistance_events
- escalations

Seed demo data.

---

## Hour 7–10 — AI layer

Implement:

```text
message
 ↓
persona
 ↓
intent
 ↓
objection
 ↓
evidence retrieval
 ↓
response
```

Use structured output.

Example:

```json
{
  "persona": "parent",
  "intent": "career_viability",
  "objection": "employment",
  "severity": "high",
  "needs_evidence": true
}
```

---

## Hour 10–12 — Evidence cards

Implement:
- wage card
- job radar card
- safety card
- career progression card
- proof chip

This is a major demo feature.

---

## Hour 12–15 — Dashboard

Build:
- KPIs
- objection chart
- district chart/map
- live resistance event
- escalation queue

---

## Hour 15–17 — WebSocket integration

When a parent objection occurs:

```text
Chat
 ↓
Backend
 ↓
Resistance event
 ↓
WebSocket
 ↓
Dashboard updates LIVE
```

This must work.

---

## Hour 17–19 — Polish

Add:
- Hindi/Hinglish
- animations
- loading states
- source chips
- error states
- mobile-friendly UI
- realistic demo data

---

## Hour 19–21 — Demo hardening

Test exactly one path repeatedly:

```text
Student chooses electrician
↓
Parent objects
↓
Income evidence
↓
Safety objection
↓
Safety card
↓
Resistance decreases
↓
Dashboard updates
↓
Escalation if necessary
```

No broken links.

No dead buttons.

No random AI responses.

---

## Hour 21–22 — Backup mode

Create deterministic demo fallback.

If LLM/API fails:

```text
Demo Scenario Mode
```

should still execute.

This is essential for hackathon reliability.

---

## Hour 22–23 — Pitch assets

Prepare:
- architecture diagram
- problem slide
- competitor/differentiation slide
- USP slide
- impact slide
- demo flow
- future deployment slide

---

## Hour 23–24 — Final rehearsal

Run the demo 5–10 times.

Measure:

> Can a judge understand the innovation within 60 seconds?

If not, simplify.

---

# 21. WHAT CLAUDE MUST NOT DO

Do NOT:

1. Build unnecessary microservices.
2. Spend hours integrating APIs that require approval.
3. Build production authentication.
4. Build actual Aadhaar verification.
5. Train a custom ML model.
6. Build a full IVR system.
7. Build a complete national labour database.
8. Build every Indian language.
9. Build every dashboard feature.
10. Replace the working demo with theoretical architecture.

### Most important rule:

> **A working narrow vertical slice is better than a huge unfinished platform.**

---

# 22. DEMO DATA STRATEGY

Use a small dataset covering:

### Districts
- Sikar
- Pune
- Nashik
- Jaipur

### Trades
- Electrician
- Solar Technician
- Welder
- CNC Operator
- Healthcare Assistant

### Objections
- Income
- Employment
- Safety
- Social Status
- Distance
- Placement

Each record should include:

```text
district
trade
wage
jobs
course
centre
safety fields
source
date
```

Keep the data internally consistent.

---

# 23. RESEARCH / CLAIM DISCIPLINE

When building UI or presentation:

### Safe wording

"Source-grounded"

"Evidence-backed"

"Prototype dataset"

"Designed for integration with authorised government data"

"Publicly reviewed competitor landscape"

"Potentially differentiated"

### Avoid

"100% verified"

"Zero hallucination"

"World's first"

"No competitor exists"

"Guaranteed placement"

"Guaranteed salary"

"Absolute trust"

"AI replaces counsellors"

---

# 24. VALIDATED COMPETITIVE POSITION

The research indicates:

### Existing

- AI career recommendation
- conversational career counselling
- multilingual counselling
- WhatsApp career assistance
- parent dashboards
- career roadmaps
- job discovery
- labour-market information
- government career counselling

### Differentiating combination

```text
Concurrent family counselling
+
Objection-specific evidence retrieval
+
Local outcome proof
+
Human escalation
+
Resistance telemetry
+
Government policy intelligence
```

This exact combination is the product's main differentiation claim.

---

# 25. THE PRODUCT MOAT

The LLM is NOT the moat.

The potential moat is the structured dataset generated by interactions:

```text
Family
 ↓
Objection
 ↓
Trade
 ↓
District
 ↓
Demographic
 ↓
Evidence shown
 ↓
Resistance change
 ↓
Outcome
```

Over time this could answer:

> Which objections prevent skilling adoption in which districts and trades, and what evidence is most effective at resolving them?

That creates a feedback loop:

```text
More conversations
      ↓
More objection data
      ↓
Better evidence mapping
      ↓
Better counselling
      ↓
More adoption
      ↓
More outcome data
```

---

# 26. RECOMMENDED FINAL PITCH

## Problem

> Families often influence whether learners pursue vocational pathways, but information about careers, wages, safety and employment is fragmented and difficult to trust.

## Solution

> ParivaarSaathi creates a shared AI counselling session for learners and parents. It detects parental concerns, retrieves relevant local evidence, explains the pathway in the family's language, and escalates unresolved cases to human counsellors.

## Innovation

> Instead of only recommending a career, ParivaarSaathi addresses the family decision barrier.

## Government value

> Aggregated objections become district-level resistance intelligence, helping administrators understand why families hesitate to adopt specific skilling pathways.

---

# 27. 30-SECOND JUDGE EXPLANATION

Use this:

> **"Most career AI systems answer one question: What career should the student choose? ParivaarSaathi solves a different problem: What happens when the student wants a career but the family doesn't trust it? We put the learner and parent into the same AI counselling session, detect the parent's actual objection, and answer it using local evidence on wages, jobs, safety and outcomes. If the family still resists, we escalate to a human counsellor. At the same time, every unresolved objection becomes anonymised policy intelligence for administrators. So we don't just recommend careers — we help families trust them."**

---

# 28. FINAL BUILD PRINCIPLE

Claude, optimize every implementation decision around this loop:

```text
                ┌─────────────────────┐
                │ Student wants skill │
                └──────────┬──────────┘
                           ↓
                ┌─────────────────────┐
                │ Parent has concern  │
                └──────────┬──────────┘
                           ↓
                ┌─────────────────────┐
                │ Detect objection    │
                └──────────┬──────────┘
                           ↓
                ┌─────────────────────┐
                │ Retrieve evidence   │
                └──────────┬──────────┘
                           ↓
                ┌─────────────────────┐
                │ Explain with proof  │
                └──────────┬──────────┘
                           ↓
                ┌─────────────────────┐
                │ Family decision     │
                └──────────┬──────────┘
                           ↓
                  ┌────────┴────────┐
                  ↓                 ↓
             Resolved           Resistant
                  ↓                 ↓
               Outcome       Human escalation
                                    ↓
                           Resistance telemetry
                                    ↓
                           Admin intelligence
```

## Definition of Done for the 24-hour MVP

The prototype is successful if a judge can:

1. Enter a learner goal.
2. Enter a parent objection.
3. See the system identify the parent persona and objection.
4. See evidence retrieved for that objection.
5. See a source/proof card.
6. See resistance change.
7. See the event appear live on the administrator dashboard.
8. Trigger a human escalation case.
9. Understand the entire value proposition without reading the source code.

**Build this loop first. Everything else is secondary.**
