import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from urllib.parse import parse_qsl

from fastapi import FastAPI, HTTPException, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app import config
from app.db import check_db, connect, init_db
from app.realtime import hub
from app.schemas import (ChannelSimulate, EscalationCreate, EscalationUpdate, MessageCreate, SessionCreate,
                         SurveyResponse, SurveyRound, TtsRequest)
from app.seed_data import DISTRICTS, TRADES
from app.services import (analytics, channels, escalation, evidence_engine, feeds, geo, llm_service, pipeline, resistance,
                          surveys, voice_service)


# Show the app's own INFO lines (LLM fallbacks, fact-guard discards) next to uvicorn's access log.
logging.getLogger("parivaarsaathi").setLevel(logging.INFO)
if not logging.getLogger("parivaarsaathi").handlers:
    _h = logging.StreamHandler()
    _h.setFormatter(logging.Formatter("%(levelname)s:     [%(name)s] %(message)s"))
    logging.getLogger("parivaarsaathi").addHandler(_h)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="ParivaarSaathi API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _get_session(session_id: str) -> dict:
    with connect() as conn:
        row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Session not found")
    return dict(row)


def _languages() -> list[str]:
    # Hindi (Devanagari) replies need the LLM; templates exist for Hinglish and English.
    return ["hinglish", "english", "hindi"] if llm_service.is_enabled() else ["hinglish", "english"]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/dependencies")
def health_dependencies():
    with connect() as conn:
        evidence_rows = conn.execute("SELECT COUNT(*) FROM evidence").fetchone()[0]
    return {
        "database": "ok" if check_db() else "error",
        "llm": "configured" if llm_service.is_configured() else "not configured",
        "mode": llm_service.mode(),
        **llm_service.describe(),
        "websocket": "ok",
        "websocket_clients": hub.client_count,
        "evidence_engine": "ok" if evidence_rows else "no data",
        "voice": voice_service.status(),
        "channels": _channels_meta(),
    }


@app.get("/health/llm")
def health_llm():
    """Makes one tiny real LLM call and reports ok/error + latency. Use it to verify a new API key."""
    return llm_service.ping()


def _channels_meta() -> dict:
    return {
        "whatsapp_simulator": True,
        "twilio": {"signature_check": bool(config.TWILIO_AUTH_TOKEN), "number": config.TWILIO_WHATSAPP_NUMBER or None,
                   "webhook_path": "/channels/whatsapp/twilio"},
    }


@app.get("/meta")
def meta():
    return {
        "districts": DISTRICTS,
        "trades": TRADES,
        "languages": _languages(),
        "mode": llm_service.mode(),
        **llm_service.describe(),
        "voice": voice_service.status(),
        "channels": _channels_meta(),
    }


@app.post("/session")
def create_session(body: SessionCreate):
    session = {
        "id": uuid.uuid4().hex[:8],
        **body.model_dump(),
        "use_llm": int(body.use_llm),
        "status": "active",
        "resistance_score": resistance.START_SCORE,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    with connect() as conn:
        conn.execute(
            "INSERT INTO sessions (id, district, trade, learner_gender, parent_relation, language, status,"
            " resistance_score, created_at, use_llm) VALUES (:id, :district, :trade, :learner_gender,"
            " :parent_relation, :language, :status, :resistance_score, :created_at, :use_llm)",
            session,
        )
    return {**session, "resistance_band": resistance.band(session["resistance_score"]),
            "mode": "llm" if body.use_llm and llm_service.is_enabled() else "demo"}


@app.get("/session/{session_id}")
def get_session(session_id: str):
    session = _get_session(session_id)
    return {**session, "resistance_band": resistance.band(session["resistance_score"])}


@app.post("/message")
async def post_message(body: MessageCreate):
    _get_session(body.session_id)
    response, events = pipeline.handle_message(body.session_id, body.persona, body.text.strip())
    for event in events:
        await hub.broadcast(event)
    return response


@app.post("/escalation")
async def create_escalation(body: EscalationCreate):
    """Manual "Talk to a counsellor" request — allowed at any resistance level."""
    session = _get_session(body.session_id)
    esc, reply, events = escalation.request_manual(session, body.reason)
    for event in events:
        await hub.broadcast(event)
    return {"escalation": esc, "reply": reply}


@app.get("/escalations")
def list_escalations(status: str | None = None):
    return {"escalations": analytics.escalations(status)}


@app.patch("/escalations/{escalation_id}")
async def update_escalation(escalation_id: int, body: EscalationUpdate):
    with connect() as conn:
        cur = conn.execute("UPDATE escalations SET status = ? WHERE id = ?", (body.status, escalation_id))
    if cur.rowcount == 0:
        raise HTTPException(404, "Escalation not found")
    await hub.broadcast({"type": "escalation_updated", "escalation_id": escalation_id, "status": body.status,
                         "timestamp": datetime.now(timezone.utc).isoformat()})
    return {"id": escalation_id, "status": body.status}


@app.get("/dashboard/summary")
def dashboard_summary():
    return analytics.summary()


@app.get("/map/opportunities")
def map_opportunities(district: str, trade: str | None = None):
    """Nearby opportunities + training centre around a district for the dashboard map (illustrative positions)."""
    data = geo.opportunities(district, trade)
    if data is None:
        raise HTTPException(404, "Unknown district")
    return data


@app.get("/counsellors")
def list_counsellors():
    """Simulated counsellor pool used for escalation routing (production: NCS counsellor network)."""
    with connect() as conn:
        rows = conn.execute(
            "SELECT c.*, (SELECT COUNT(*) FROM escalations e WHERE e.counsellor_code = c.code AND e.status != 'closed')"
            " AS open_cases FROM counsellors c ORDER BY c.code"
        ).fetchall()
    return {"counsellors": [{**dict(r), "districts": r["districts"].split(","), "languages": r["languages"].split(","),
                             "female": bool(r["female"])} for r in rows], "simulated": True}


# --- Outcome Data Engine feeds + Feed C (IVR micro-survey) ------------------------------------

@app.get("/data/feeds")
def data_feeds():
    return {"feeds": feeds.status()}


@app.get("/ivr/script")
def ivr_script(language: str = "hi"):
    return surveys.script(language)


@app.post("/ivr/responses")
async def ivr_response(body: SurveyResponse):
    if body.district not in DISTRICTS or body.trade not in TRADES:
        raise HTTPException(400, "Unknown district or trade")
    a = body.answers
    if a.get("working") not in ("1", "2", "3") or a.get("recommend") not in ("1", "2") or             (a["working"] != "3" and not a.get("pay_band")):
        raise HTTPException(400, "Incomplete survey answers")
    row = surveys.record(body.district, body.trade, body.gender, body.language, body.answers)
    with connect() as conn:
        summary = surveys.summary(conn, body.district, body.trade)
    await hub.broadcast({"type": "survey_response", "district": body.district, "trade": body.trade,
                         "gender": body.gender, "working": row["working"], "count": 1,
                         "responses": summary["responses"], "timestamp": row["created_at"]})
    cards = evidence_engine.retrieve("placement", body.district, body.trade, body.gender)
    return {"saved": row, "summary": summary, "card": cards[0] if cards else None}


@app.post("/ivr/simulate-round")
async def ivr_simulate_round(body: SurveyRound):
    rows = surveys.simulate_round(body.n, body.district, body.trade)
    await hub.broadcast({"type": "survey_response", "district": body.district or "Several districts",
                         "trade": body.trade or "several trades", "count": len(rows), "automated": True,
                         "timestamp": rows[-1]["created_at"]})
    return {"saved": len(rows)}


@app.get("/ivr/summary")
def ivr_summary(district: str, trade: str):
    with connect() as conn:
        s = surveys.summary(conn, district, trade)
    if not s:
        raise HTTPException(404, "No survey data")
    return s


# --- Voice (BHASHINI adapter, browser fallback) -----------------------------------------------

@app.get("/voice/status")
def voice_status():
    return voice_service.status()


@app.post("/voice/tts")
def voice_tts(body: TtsRequest):
    audio = voice_service.synthesize(body.text, body.language)
    if not audio:
        raise HTTPException(503, "Server-side speech unavailable — use browser speech")
    return audio


# --- Messaging channels (WhatsApp) -------------------------------------------------------------

@app.get("/session/{session_id}/channels")
def session_channels(session_id: str):
    _get_session(session_id)
    return {"join_code": channels.join_code(session_id), "linked": channels.linked_count(session_id),
            **_channels_meta()}


@app.post("/channels/whatsapp/simulate")
async def whatsapp_simulate(body: ChannelSimulate):
    """The in-app WhatsApp simulator — same code path as a real WhatsApp webhook."""
    result = channels.handle_inbound("whatsapp", body.sender, body.text)
    for event in result["events"]:
        await hub.broadcast(event)
    return {k: v for k, v in result.items() if k != "events"}


@app.post("/channels/whatsapp/twilio")
async def whatsapp_twilio(request: Request):
    """Twilio WhatsApp Sandbox webhook (form-encoded). Replies synchronously with TwiML."""
    params = dict(parse_qsl((await request.body()).decode()))
    if config.TWILIO_AUTH_TOKEN:
        url = (config.PUBLIC_BASE_URL + request.url.path) if config.PUBLIC_BASE_URL else str(request.url)
        if not channels.twilio_signature_ok(url, params, request.headers.get("X-Twilio-Signature", "")):
            raise HTTPException(403, "Invalid Twilio signature")
    result = channels.handle_inbound("whatsapp", params.get("From", ""), params.get("Body", ""),
                                     has_media=int(params.get("NumMedia", "0") or 0) > 0)
    for event in result["events"]:
        await hub.broadcast(event)
    return Response(channels.twiml(result["replies"]), media_type="application/xml")


@app.post("/demo/reset")
async def reset_demo():
    """Rebuilds the demo dataset and simulated history — for rehearsals."""
    init_db(reset=True)
    await hub.broadcast({"type": "reset", "timestamp": datetime.now(timezone.utc).isoformat()})
    return {"status": "reset"}


@app.get("/evidence")
def get_evidence(objection: str, district: str, trade: str, gender: str = "female"):
    return {"cards": evidence_engine.retrieve(objection, district, trade, gender)}


@app.get("/events/recent")
def recent_events(limit: int = 20):
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM resistance_events ORDER BY id DESC LIMIT ?", (min(limit, 100),)
        ).fetchall()
    return {
        "events": [
            {
                "type": "resistance_update",
                **dict(r),
                "before_band": resistance.band(r["before_score"]),
                "after_band": resistance.band(r["after_score"]),
            }
            for r in rows
        ]
    }


@app.websocket("/events")
async def events(ws: WebSocket):
    await hub.connect(ws)
    try:
        while True:
            await ws.receive_text()  # keep-alive; clients don't need to send anything
    except WebSocketDisconnect:
        hub.disconnect(ws)
