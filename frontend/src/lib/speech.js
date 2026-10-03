// Browser-side voice adapters. These sit at the ASR/TTS boundary described in the architecture:
//   voice input → ASR adapter → conversation engine · response → TTS adapter → voice output
// Production would swap these for BHASHINI; here the browser's Web Speech API is the adapter,
// with a visibly-labelled simulated voice note when the browser has no speech recognition.

const RECOGNITION_LANG = { hinglish: 'en-IN', hindi: 'hi-IN', english: 'en-IN' }
const SYNTHESIS_LANG = { hinglish: 'hi-IN', hindi: 'hi-IN', english: 'en-IN' }

function Recognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function recognitionSupported() {
  return Boolean(Recognition())
}

export function synthesisSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** Starts listening once. Returns a stop() function. */
export function listen(language, { onInterim, onFinal, onEnd, onError }) {
  const SR = Recognition()
  if (!SR) throw new Error('Speech recognition not supported')
  const rec = new SR()
  rec.lang = RECOGNITION_LANG[language] ?? 'en-IN'
  rec.interimResults = true
  rec.continuous = false
  rec.maxAlternatives = 1
  let finalText = ''
  rec.onresult = (e) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript
      if (e.results[i].isFinal) finalText += t
      else interim += t
    }
    onInterim?.(finalText + interim)
  }
  rec.onerror = (e) => onError?.(e.error)
  rec.onend = () => {
    if (finalText.trim()) onFinal?.(finalText.trim())
    onEnd?.()
  }
  rec.start()
  return () => rec.stop()
}

// When the backend has BHASHINI credentials, replies are spoken with BHASHINI TTS (POST /api/voice/tts);
// any failure falls back to the browser voice below.
let serverSpeech = false
let currentAudio = null
export function setServerSpeech(enabled) {
  serverSpeech = Boolean(enabled)
}

async function speakOnServer(text, language) {
  const res = await fetch('/api/voice/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language }),
  })
  if (!res.ok) throw new Error(String(res.status))
  const { audio_base64: audio, format } = await res.json()
  currentAudio?.pause()
  currentAudio = new Audio(`data:audio/${format || 'wav'};base64,${audio}`)
  await currentAudio.play()
}

/** Speaks text: BHASHINI when configured, else a matching Indian-language browser voice. */
export function speak(text, language) {
  if (serverSpeech) {
    speakOnServer(text, language).catch(() => speakInBrowser(text, language))
    return
  }
  speakInBrowser(text, language)
}

function speakInBrowser(text, language) {
  if (!synthesisSupported()) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const lang = SYNTHESIS_LANG[language] ?? 'hi-IN'
  u.lang = lang
  const voice = synth.getVoices().find((v) => v.lang.replace('_', '-') === lang)
  if (voice) u.voice = voice
  u.rate = 0.95
  synth.speak(u)
}

export function stopSpeaking() {
  currentAudio?.pause()
  if (synthesisSupported()) window.speechSynthesis.cancel()
}
