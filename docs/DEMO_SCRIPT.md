# ParivaarSaathi — Demo Script (judges)

Target: a judge understands the innovation within 60 seconds and sees the whole loop in under 4 minutes.

## Before you start (2 minutes)

1. Start backend and frontend (see README). Confirm the nav badge says **Demo mode · no LLM** (or **AI mode**).
2. Open two browser windows side by side:
   - Left: `http://localhost:5173` (family session)
   - Right: `http://localhost:5173/#dashboard` (administrator dashboard) — it should show **● Live**.
3. Optional reset for a clean run: `curl -X POST http://localhost:8000/demo/reset` (or `Invoke-RestMethod -Method Post http://localhost:8000/demo/reset`).

## 30-second opener (say this)

> "Most career AI systems answer one question: *what career should the student choose?* ParivaarSaathi solves
> a different problem: *what happens when the student wants a career but the family doesn't trust it?* We put the
> learner and the parent into the same AI counselling session, detect the parent's actual objection, and answer it
> with local evidence on wages, jobs, safety and outcomes. If the family still resists, we escalate to a human
> counsellor. And every objection becomes anonymised policy intelligence for administrators. So we don't just
> recommend careers — we help families trust them."

While the story plays, point at the **right-hand column**: the Resistance Index gauge moves, the Family Dialogue State shows the learner as *Positive* and the parent go *Uncertain → With counsellor*, and Evidence Highlights fill with the cards actually shown (each tagged "Shown · demo data").

## The scripted story (click ▶ Run demo scenario, then ▶ Next step four times)

| Step | On the left (chat) | Say | On the right (dashboard) |
|---|---|---|---|
| 1 | Learner: "Mujhe electrician course karna hai." | "The learner states her goal. Note the **family dialogue state** panel — learner and parent are tracked separately in one session." | — |
| 2 | Mother: "Electrician mein future nahi hai." | "The system identifies **persona = Parent, objection = Career viability**. It doesn't argue — it retrieves evidence: 17 local opportunities within 15 km on the **Job Radar**, and the **Paisa-Map** wage progression. Every card has a source chip and is labelled demo data." | A new row appears in the live feed, and with **Follow live events** on, the map **flies to Sikar** and shows the same 17 Electrician opportunities on the 15 km radius. Hover one: key factors (distance, commute, openings, shift, starting pay, course). |
| 3 | Mother: "Ladki ke liye safe hai?" | "The objection changes to **Safety**. The **Beti Suraksha** card shows female staff, CCTV, transport, daytime hours — only fields in the dataset; nothing is invented. Resistance drops to *Medium — open to counselling*." | Second live row; the Sikar safety cell in the heat table ticks up. |
| 4 | Mother: "Phir bhi, degree nahi toh izzat nahi." | "A **social-status** concern *and* a refusal after evidence. Resistance goes back to High, so the AI does what an AI should: it hands over. A **warm-handoff brief** appears — concerns, evidence already shown, remaining concern, suggested counsellor action." | *ESCALATED · HIGH · Case #N* appears in the feed and at the top of the **counsellor queue**. Click **View case** → the same brief. Click **Take case**. |

**Optional 60-second bonus: the parent on WhatsApp.** In the right column, click **Open parent's WhatsApp (simulator)**.
The phone joins the same session. Tap **2 · Safety** on the phone: the parent's message appears in the learner's chat
tagged *via WhatsApp*, the evidence comes back to the phone as text, and the dashboard feed updates. Say: "Same engine,
the channel parents already use. Shown in a simulator; a Twilio WhatsApp Sandbox webhook runs the same code."

**Optional 45 seconds: where the outcome numbers come from.** Open **Trainee Survey (IVR)**, place the call and press
1 · 1 · 3 · 1 · 1. Say: "Past trainees answer a 90-second call: working or not, take-home pay as a band, still in the
district, would they recommend it. The outcomes card a parent sees changes immediately. This is Feed C, simulated."
Then open **Career Explorer** and point at **Pragati Path**: "NSQF Level 4 is about Class 12; a B.Voc degree is Level 7.
That answers *degree nahi toh izzat* in terms a parent understands."

Then scroll the dashboard once: "Aggregated across sessions, this is **resistance intelligence** — which concerns block which trades in which districts, split by learner gender. On the map, each district's circle grows with sessions and darkens with average resistance; hover Sikar — top concern safety; Pune — income. That's the question government cannot see today."

## If asked

- **"Is this data real?"** — No. It is a clearly labelled demonstration dataset with generic employer names. The architecture has a single evidence engine that production would point at authorised interfaces (SIDH/NSDC, PLFS, NCS, centre registries).
- **"Is this integrated with SIDH / PLFS / e-Shram / NCS?"**: Not live. Each is a simulated feed with an adapter
  boundary, labelled on every card (Feed A/B/C). The *Data & Integrations* view lists what is working, simulated,
  adapter-ready or deliberately not built (Aadhaar, all 22 languages). See `docs/CLAIMS_AND_INTEGRATIONS.md`.
- **"What does the LLM do?"** — Two narrow jobs: classify the message into a structured intent, and phrase the reply around the evidence it is handed. It never supplies facts. A reply containing a number that isn't in the evidence is discarded automatically. Without a key, deterministic rules and templates do both jobs — that is what you just saw. The model is pluggable (Groq-hosted Llama on the free tier, Claude, or a local Ollama) behind one service module.
- **"Isn't this just a chatbot / WhatsApp bot / parent dashboard?"** — Each piece exists (Skill India Assistant, NCS, Xello, Unifrog). The differentiating combination is concurrent learner-parent counselling + objection-specific evidence + local outcome proof + human escalation + resistance telemetry.
- **"How is the resistance score computed?"** — A simple, transparent rule set we call the *Prototype Resistance Index* (start 60; objection +15; refusal +20; evidence −15; acceptance −20). It is deliberately not presented as a validated psychological measure.
- **"What about voice / languages?"** — Mic button uses browser speech recognition now; the ASR/TTS adapter boundary is where BHASHINI plugs in. Replies are Hinglish or English today; Hindi (Devanagari) when the LLM is enabled.

## Free-form session (if there is time)

Start a session for **Pune · CNC Operator · male learner · father**, type as the parent:
"Isme salary kitni milegi?" → Paisa-Map for Pune; then "Theek hai, samajh gaye." → *Family open to enrolment* event, session resolved.
