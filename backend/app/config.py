"""Central settings, loaded from backend/.env. Never log secret values."""
import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

# ---------------------------------------------------------------------------
# LLM provider. All model access goes through app/services/llm_service.py.
#   anthropic          Claude via the Anthropic SDK (ANTHROPIC_API_KEY)
#   groq               Groq's free-tier hosted open models via its OpenAI-compatible API (GROQ_API_KEY)
#   openai_compatible  any other OpenAI-compatible endpoint, e.g. Ollama locally (LLM_BASE_URL, LLM_API_KEY)
# ---------------------------------------------------------------------------
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "anthropic").strip().lower()

_PROVIDER_DEFAULTS = {
    #               default model                 default base URL
    "anthropic": ("claude-opus-5-5", None),
    "groq": ("openai/gpt-oss-120b", "https://api.groq.com/openai/v1"),
    "openai_compatible": ("llama3.1:8b", "http://127.0.0.1:11434/v1"),  # 127.0.0.1: avoids Windows' slow IPv6-first localhost
}
if LLM_PROVIDER not in _PROVIDER_DEFAULTS:
    LLM_PROVIDER = "anthropic"
_DEFAULT_MODEL, _DEFAULT_BASE_URL = _PROVIDER_DEFAULTS[LLM_PROVIDER]

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
LLM_API_KEY = {
    "anthropic": ANTHROPIC_API_KEY,
    "groq": GROQ_API_KEY or os.getenv("LLM_API_KEY", "").strip(),
    "openai_compatible": os.getenv("LLM_API_KEY", "").strip(),
}[LLM_PROVIDER]

LLM_MODEL = os.getenv("LLM_MODEL", "").strip() or _DEFAULT_MODEL
# A Claude model id left over in .env would be rejected by a non-Anthropic provider — use that provider's default.
if LLM_PROVIDER != "anthropic" and LLM_MODEL.startswith("claude-"):
    LLM_MODEL = _DEFAULT_MODEL
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "").strip() or _DEFAULT_BASE_URL

# Seconds before an LLM call is abandoned and the deterministic path takes over.
LLM_TIMEOUT = float(os.getenv("LLM_TIMEOUT", "25"))

# "demo" forces the deterministic Demo Scenario Mode even when a key is present.
APP_MODE = os.getenv("APP_MODE", "auto").lower()  # auto | demo

DATABASE_PATH = Path(os.getenv("DATABASE_PATH", BACKEND_DIR / "parivaarsaathi.db"))

# Built frontend served by FastAPI in production (single-service deploy). Absent in development.
FRONTEND_DIST = Path(os.getenv("FRONTEND_DIST", BACKEND_DIR.parent / "frontend" / "dist"))

CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]

# ---------------------------------------------------------------------------
# Messaging channels (app/services/channels.py). The in-app WhatsApp simulator needs none of these.
# A real WhatsApp number via the Twilio WhatsApp Sandbox needs a public HTTPS URL (e.g. a cloudflared tunnel).
# ---------------------------------------------------------------------------
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "").strip()          # enables webhook signature checks
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER", "").strip()  # e.g. the sandbox number, for wa.me links
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "").strip().rstrip("/")   # the tunnel URL Twilio calls
# Phone numbers are stored only as salted hashes. Set your own value outside a demo.
CHANNEL_HASH_SALT = os.getenv("CHANNEL_HASH_SALT", "parivaarsaathi-demo-salt")

# ---------------------------------------------------------------------------
# BHASHINI speech (app/services/voice_service.py). Without these the browser's speech engine is used.
# Credentials come from https://bhashini.gov.in/ulca (profile → API key).
# ---------------------------------------------------------------------------
BHASHINI_USER_ID = os.getenv("BHASHINI_USER_ID", "").strip()
BHASHINI_API_KEY = os.getenv("BHASHINI_API_KEY", "").strip()
BHASHINI_PIPELINE_ID = os.getenv("BHASHINI_PIPELINE_ID", "64392f96daac500b55c543cd").strip()
