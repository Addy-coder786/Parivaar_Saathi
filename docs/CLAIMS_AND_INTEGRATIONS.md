# Claims vs prototype — what to say to judges

Each claim in our solution text is listed here with its status in the 24-hour prototype. Judges at SIH regularly ask
"is this live?". Say what is built, call simulated parts simulated, and describe the rest as the production design.
This follows the master context (§6 Layer 3: *"Do not pretend demo data is live government data"*; §8 P3 and §21:
no Aadhaar, no real government integrations, no full IVR, not every language).

Status key: **Working** = real code path, works now · **Simulated** = works end-to-end on simulated data or a simulated
channel · **Adapter ready** = code boundary written, needs credentials · **Not built** = deliberately out of scope.

## Solution components

| Claim | Status | Where to see it | Safe wording |
|---|---|---|---|
| Joint learner + parent interface, dual-persona state tracking | **Working** | Family Session: participant cards, Family Dialogue State | "Learner and parent in one session, tracked separately." |
| WhatsApp Business API (simulated via Twilio/React) | **Simulated** + Twilio webhook **ready** | *WhatsApp (Parent)* view; "Parent on WhatsApp" card; `POST /channels/whatsapp/twilio` | "The parent joins the same session from WhatsApp. Shown in a simulator; the Twilio Sandbox webhook runs the same code." |
| IVR bridge using Bhashini ASR/TTS | **Simulated** IVR, BHASHINI **adapter ready** | *Trainee Survey (IVR)* view; `voice_service.py` | "IVR flow simulated in the browser with browser speech; the BHASHINI adapter switches on with credentials." |
| Verified Outcome Data Engine (VODE), strict RAG over SIDH 2.0, PLFS, e-Shram | **Simulated** feeds, structured retrieval **working** | *Data & Integrations* view; feed chips on every card | "Outcome Data Engine: structured retrieval from source tables, no generated facts. Feeds are simulated here; production connects SIDH, PLFS, e-Shram." Avoid "verified" for demo data. |
| Low-jargon NSQF mapping (Pragati Path) | **Working** | Pragati Path card (Career Explorer, chat on a "degree/izzat" concern) | "NSQF 4 ≈ Class 12 level; B.Voc degree = NSQF 7", labelled an approximate explanation. |
| Human escalation to counsellors | **Working**, routing **simulated** | Counsellor queue; "Routed to" row in the brief | "Warm-handoff brief, routed by district, language and caseload (simulated pool; production: NCS counsellors)." |

## Digital Public Infrastructure

| Claim in our text | Reality in prototype | Suggested rewording |
|---|---|---|
| "integrates directly into live DPI" | No live integration. Every feed is simulated. | "**Designed to integrate** with India's DPI through adapter boundaries; the prototype runs on a labelled demo dataset." |
| SIDH 2.0: Aadhaar enrolment, biometric attendance, verifiable credentials | Feed A shows certified / assessed, attendance % and audit grade (simulated). **No Aadhaar** (master doc P3). | "Feed A models SIDH certification and attendance records; Aadhaar-based identity is a production step needing legal approval." |
| Bhashini & VoicERA: 22 languages on sovereign compute | Hinglish, English, Hindi today. BHASHINI adapter written, not tested live. VoicERA not used. | "Hinglish, English and Hindi today; more languages through BHASHINI in production." |
| NCS: 20M+ job seekers, 5M employers, 2,000 counsellors | The prototype uses none of these. **These numbers need a cited source** before going on a slide. | Cite the official NCS source and date, or drop the numbers. In the app: "simulated counsellor pool; production: NCS counsellor network". |
| e-Shram & PLFS district wage indices | Feed B: simulated P20–P80 quintiles by district × NIC code. PLFS publishes mostly at state level, so district quintiles would need extra data. | "Feed B models district wage quintiles by industry (simulated); production would combine PLFS and e-Shram data." |

## Data feeds

| Feed | Status | What happens in the demo |
|---|---|---|
| Feed A: SIDH certification records, NSDC TP audits | **Simulated** | Shown on the Beti Suraksha / centre and nearest-centre cards |
| Feed B: PLFS wage quintiles by district and industry | **Simulated** | Earnings-spread bar on the Paisa-Map card |
| Feed C: 90-second IVR micro-surveys of past trainees | **Simulated, live-updating** | Complete a call in *Trainee Survey (IVR)* and the "Reported outcomes" card changes at once |

## Words to keep off slides and out of the app

"100% verified", "zero hallucination", "world's first", "guaranteed placement/salary", "verified data" (for the demo
dataset), "integrated with live government systems".
