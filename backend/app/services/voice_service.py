"""ASR/TTS adapter boundary.

Voice input -> transcribe() -> conversation engine
Response    -> synthesize() -> voice output

Without credentials the browser's Web Speech API does both jobs (frontend/src/lib/speech.js) and these
adapters report "browser". With BHASHINI_USER_ID + BHASHINI_API_KEY set, BhashiniAdapter uses BHASHINI's
pipeline API (ULCA config call → Dhruva inference call). That adapter follows BHASHINI's published
pipeline API but has NOT been exercised against the live service in this prototype — verify it with
GET /voice/status → POST /voice/tts once you have a key. Any failure falls back to the browser.
"""
import json
import logging
import urllib.request

from app import config

log = logging.getLogger("parivaarsaathi.voice")

CONFIG_URL = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
LANG_CODES = {"hinglish": "hi", "hindi": "hi", "english": "en", "hi": "hi", "en": "en", "mr": "mr"}


class BrowserSpeech:
    """Placeholder: speech runs in the browser; the backend has nothing to do."""
    name = "browser"

    def transcribe(self, audio_b64: str, language: str = "hi") -> str:
        raise NotImplementedError("Speech recognition runs in the browser in this configuration")

    def synthesize(self, text: str, language: str = "hi") -> dict | None:
        return None


class BhashiniAdapter:
    name = "bhashini"

    def __init__(self) -> None:
        self._endpoints: dict[tuple[str, str], tuple[str, str, str, str]] = {}

    def _post(self, url: str, body: dict, headers: dict) -> dict:
        req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST",
                                     headers={"Content-Type": "application/json", "User-Agent": "ParivaarSaathi/1.0",
                                              **headers})
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read().decode())

    def _endpoint(self, task: str, lang: str) -> tuple[str, str, str, str]:
        """(callback URL, auth header name, auth header value, serviceId), cached per task+language."""
        key = (task, lang)
        if key not in self._endpoints:
            cfg = self._post(CONFIG_URL, {
                "pipelineTasks": [{"taskType": task, "config": {"language": {"sourceLanguage": lang}}}],
                "pipelineRequestConfig": {"pipelineId": config.BHASHINI_PIPELINE_ID},
            }, {"userID": config.BHASHINI_USER_ID, "ulcaApiKey": config.BHASHINI_API_KEY})
            ep = cfg["pipelineInferenceAPIEndPoint"]
            service_id = cfg["pipelineResponseConfig"][0]["config"][0]["serviceId"]
            self._endpoints[key] = (ep["callbackUrl"], ep["inferenceApiKey"]["name"], ep["inferenceApiKey"]["value"],
                                    service_id)
        return self._endpoints[key]

    def synthesize(self, text: str, language: str = "hi") -> dict | None:
        lang = LANG_CODES.get(language, "hi")
        url, h_name, h_value, service_id = self._endpoint("tts", lang)
        out = self._post(url, {
            "pipelineTasks": [{"taskType": "tts", "config": {"language": {"sourceLanguage": lang},
                                                             "serviceId": service_id, "gender": "female"}}],
            "inputData": {"input": [{"source": text}]},
        }, {h_name: h_value})
        task = out["pipelineResponse"][0]
        return {"audio_base64": task["audio"][0]["audioContent"],
                "format": task.get("config", {}).get("audioFormat", "wav")}

    def transcribe(self, audio_b64: str, language: str = "hi") -> str:
        """`audio_b64`: base64 WAV, 16 kHz mono."""
        lang = LANG_CODES.get(language, "hi")
        url, h_name, h_value, service_id = self._endpoint("asr", lang)
        out = self._post(url, {
            "pipelineTasks": [{"taskType": "asr", "config": {"language": {"sourceLanguage": lang},
                                                             "serviceId": service_id, "audioFormat": "wav",
                                                             "samplingRate": 16000}}],
            "inputData": {"audio": [{"audioContent": audio_b64}]},
        }, {h_name: h_value})
        return out["pipelineResponse"][0]["output"][0]["source"]


def _make():
    if config.BHASHINI_USER_ID and config.BHASHINI_API_KEY:
        return BhashiniAdapter()
    return BrowserSpeech()


asr = tts = _make()


def status() -> dict:
    return {
        "asr": asr.name, "tts": tts.name,
        "bhashini_configured": isinstance(tts, BhashiniAdapter),
        "note": "Browser speech (Web Speech API) is used unless BHASHINI credentials are configured.",
    }


def synthesize(text: str, language: str) -> dict | None:
    """Returns {"audio_base64", "format"} from BHASHINI, or None → the browser speaks instead."""
    if not isinstance(tts, BhashiniAdapter):
        return None
    try:
        return tts.synthesize(text, language)
    except Exception as e:  # network, auth or a changed response shape — never break the conversation
        log.info("BHASHINI TTS failed, browser speech will be used: %s", str(e)[:200])
        return None
