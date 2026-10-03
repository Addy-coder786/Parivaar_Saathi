"""Messaging channels into the SAME family session (Layer 1 — omnichannel family session engine).

WhatsApp is the first channel. Two transports share this module:
  * the in-app WhatsApp simulator   POST /channels/whatsapp/simulate   (offline, used in the demo)
  * a Twilio WhatsApp Sandbox hook  POST /channels/whatsapp/twilio     (real WhatsApp once configured)

A phone joins a session by sending "JOIN PS-<session id>" (shown in the web chat). After that its
messages enter the normal pipeline as Parent turns, the web chat and dashboard update live, and the
reply goes back as WhatsApp text with each evidence card summarised. Only a salted SHA-256 of the
phone number is stored — never the number itself.
"""
import base64
import hashlib
import hmac
import re
from datetime import datetime, timezone

from app import config
from app.db import connect
from app.services import escalation, pipeline

JOIN_RE = re.compile(r"\bjoin\s+ps-?([0-9a-z]{6,12})\b", re.I)
MAX_MESSAGE = 1500  # Twilio's WhatsApp body limit is 1600 characters

# Number replies map to the same parent questions as the web quick-ask chips.
QUICK_ASKS = {
    "1": "Isme salary kitni milegi?",
    "2": "Ladki ke liye safe hai?",
    "3": "Yahan naukri milegi kya?",
    "4": "Degree ke bina izzat milegi?",
}
QUICK_LABELS = {"1": "Salary", "2": "Safety", "3": "Jobs nearby", "4": "Career growth", "0": "Counsellor"}

TEXT = {
    "hinglish": {
        "menu": "Number bhejiye: *1* Salary · *2* Suraksha · *3* Paas mein naukri · *4* Aage ka raasta · *0* Counsellor se baat",
        "joined": "Namaste! 🙏 Aap ParivaarSaathi family session *#{sid}* se jud gaye hain ({district} · {trade}). "
                  "Aapke bachche ka goal: {trade}. Apni koi bhi chinta yahan likhiye ya bolkar bhejiye — hum local data ke saath jawab denge.",
        "help": "Namaste! ParivaarSaathi se judne ke liye apne bachche ki screen par dikh raha code bhejiye, jaise: *JOIN PS-1A2B3C4D*",
        "unknown_session": "Yeh code kisi chalu session se match nahi hua. Bachche ki screen par dikh raha code dobara bhejiye.",
        "left": "Aap session se hat gaye hain. Dobara judne ke liye JOIN code bhejiye.",
        "voice": "Voice note mila. Abhi ke prototype mein kripya likhkar bhejiye (voice ke liye BHASHINI adapter jud sakta hai).",
    },
    "english": {
        "menu": "Reply with a number: *1* Salary · *2* Safety · *3* Jobs nearby · *4* Career growth · *0* Talk to a counsellor",
        "joined": "Namaste! 🙏 You have joined ParivaarSaathi family session *#{sid}* ({district} · {trade}). "
                  "Your child's goal: {trade}. Write any concern here — we answer with local data.",
        "help": "Namaste! To join ParivaarSaathi, send the code shown on your child's screen, e.g. *JOIN PS-1A2B3C4D*",
        "unknown_session": "That code does not match an active session. Please send the code shown on your child's screen again.",
        "left": "You have left the session. Send the JOIN code to join again.",
        "voice": "Voice note received. In this prototype please type your message (a BHASHINI adapter can add voice).",
    },
}
DEMO_FOOTER = "_Demo data — simulated dataset, not live government data._"


def _t(lang: str) -> dict:
    return TEXT.get(lang, TEXT["hinglish"])


def phone_hash(sender: str) -> str:
    number = re.sub(r"[^\d+]", "", sender.replace("whatsapp:", ""))
    return hashlib.sha256(f"{config.CHANNEL_HASH_SALT}:{number}".encode()).hexdigest()[:24]


def join_code(session_id: str) -> str:
    return f"PS-{session_id.upper()}"


def card_text(card: dict) -> str:
    """One evidence card as WhatsApp text (bold title, bullet rows, source line)."""
    lines = [f"*{card['title']}*"]
    for item in card["items"][:7]:
        if item["label"] == "Note":
            continue
        lines.append(f"• {item['label']}: {item['value']}")
    if card.get("note"):
        lines.append(f"_{card['note']}_")
    lines.append(f"_Source: {card['source']}_")
    return "\n".join(lines)


def _split(text: str) -> list[str]:
    if len(text) <= MAX_MESSAGE:
        return [text]
    parts, cur = [], ""
    for line in text.split("\n"):
        if len(cur) + len(line) + 1 > MAX_MESSAGE:
            parts.append(cur)
            cur = ""
        cur += ("\n" if cur else "") + line
    return parts + [cur] if cur else parts


def _session_for(conn, ph: str) -> dict | None:
    row = conn.execute(
        "SELECT s.* FROM channel_links l JOIN sessions s ON s.id = l.session_id WHERE l.phone_hash = ?", (ph,)
    ).fetchone()
    return dict(row) if row else None


def linked_count(session_id: str) -> int:
    with connect() as conn:
        return conn.execute("SELECT COUNT(*) FROM channel_links WHERE session_id = ?", (session_id,)).fetchone()[0]


def handle_inbound(channel: str, sender: str, text: str, has_media: bool = False) -> dict:
    """Processes one inbound message. Returns {replies, events, session_id, quick_replies}."""
    ph = phone_hash(sender)
    text = (text or "").strip()
    now = datetime.now(timezone.utc).isoformat()
    with connect() as conn:
        session = _session_for(conn, ph)
        m = JOIN_RE.search(text)
        if m:
            target = conn.execute("SELECT * FROM sessions WHERE id = ? AND is_demo_history = 0",
                                  (m.group(1).lower(),)).fetchone()
            if not target:
                return {"replies": [_t(session["language"] if session else "hinglish")["unknown_session"]],
                        "events": [], "session_id": None, "quick_replies": []}
            target = dict(target)
            conn.execute(
                "INSERT INTO channel_links (phone_hash, channel, session_id, persona, created_at) VALUES (?, ?, ?, 'parent', ?)"
                " ON CONFLICT(phone_hash) DO UPDATE SET session_id = excluded.session_id, channel = excluded.channel,"
                " created_at = excluded.created_at",
                (ph, channel, target["id"], now),
            )
            t = _t(target["language"])
            return {
                "replies": [t["joined"].format(sid=target["id"], district=target["district"], trade=target["trade"]),
                            t["menu"]],
                "events": [{"type": "channel_joined", "session_id": target["id"], "channel": channel, "timestamp": now}],
                "session_id": target["id"], "quick_replies": list(QUICK_LABELS.items()),
            }
        if text.upper() in ("STOP", "EXIT", "LEAVE") and session:
            conn.execute("DELETE FROM channel_links WHERE phone_hash = ?", (ph,))
            return {"replies": [_t(session["language"])["left"]],
                    "events": [{"type": "channel_left", "session_id": session["id"], "channel": channel, "timestamp": now}],
                    "session_id": None, "quick_replies": []}

    if not session:
        return {"replies": [_t("hinglish")["help"]], "events": [], "session_id": None, "quick_replies": []}

    t = _t(session["language"])
    if has_media and not text:
        return {"replies": [t["voice"]], "events": [], "session_id": session["id"], "quick_replies": list(QUICK_LABELS.items())}
    if not text:
        return {"replies": [t["menu"]], "events": [], "session_id": session["id"], "quick_replies": list(QUICK_LABELS.items())}

    if text == "0":
        esc, reply, events = escalation.request_manual(session, "Parent asked for a counsellor on WhatsApp", channel)
        events.append({"type": "session_escalation", "session_id": session["id"], "channel": channel,
                       "escalation": esc, "reply": reply, "timestamp": now})
        return {"replies": [reply], "events": events, "session_id": session["id"], "quick_replies": []}

    body = QUICK_ASKS.get(text, text)[:1000]
    response, events = pipeline.handle_message(session["id"], "parent", body, channel=channel)
    events.append({"type": "session_turn", "session_id": session["id"], "channel": channel, "persona": "parent",
                   "text": body, "response": response, "timestamp": now})
    reply = response["reply"]
    message = reply["text"]
    for card in reply["cards"]:
        message += "\n\n" + card_text(card)
    if reply["cards"]:
        message += "\n\n" + DEMO_FOOTER
    replies = _split(message)
    if not response.get("escalation"):
        replies.append(t["menu"])
    return {"replies": replies, "events": events, "session_id": session["id"],
            "quick_replies": [] if response.get("escalation") else list(QUICK_LABELS.items())}


# --- Twilio transport ------------------------------------------------------------------------

def twilio_signature_ok(url: str, params: dict[str, str], signature: str) -> bool:
    """Twilio's documented scheme: base64(HMAC-SHA1(auth token, URL + sorted key/value pairs))."""
    payload = url + "".join(k + params[k] for k in sorted(params))
    digest = hmac.new(config.TWILIO_AUTH_TOKEN.encode(), payload.encode(), hashlib.sha1).digest()
    return hmac.compare_digest(base64.b64encode(digest).decode(), signature or "")


def twiml(replies: list[str]) -> str:
    from xml.sax.saxutils import escape
    body = "".join(f"<Message>{escape(r)}</Message>" for r in replies)
    return f'<?xml version="1.0" encoding="UTF-8"?><Response>{body}</Response>'
