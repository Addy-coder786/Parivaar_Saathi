import { Bot, Phone, PhoneCall, PhoneOff, Timer } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ProofCard from '../components/ProofCard'
import { apiGet, apiPost } from '../lib/api'
import { speak, stopSpeaking, synthesisSupported } from '../lib/speech'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']
const SPEECH_LANG = { hi: 'hindi', en: 'english' }

/** Next question index after `i`, honouring skip rules such as "no pay question if not working". */
function nextIndex(questions, i, answers) {
  let j = i + 1
  while (j < questions.length) {
    const skip = questions[j].skip_if
    if (!skip || !Object.entries(skip).some(([k, v]) => answers[k] === v)) return j
    j++
  }
  return -1
}

export default function IvrSurvey({ meta, defaults }) {
  const [district, setDistrict] = useState(defaults?.district ?? 'Sikar')
  const [trade, setTrade] = useState(defaults?.trade ?? 'Electrician')
  const [gender, setGender] = useState('female')
  const [language, setLanguage] = useState('hi')
  const [script, setScript] = useState(null)
  const [phase, setPhase] = useState('idle') // idle | calling | done | ended
  const [q, setQ] = useState(-1) // -1 = greeting
  const [answers, setAnswers] = useState({})
  const [transcript, setTranscript] = useState([])
  const [seconds, setSeconds] = useState(0)
  const [result, setResult] = useState(null)
  const [round, setRound] = useState(null)
  const [error, setError] = useState(null)
  const [voiceOn, setVoiceOn] = useState(true)
  const timer = useRef(null)

  useEffect(() => {
    apiGet(`/ivr/script?language=${language}`).then(setScript).catch((e) => setError(`Could not load the survey (${e.message})`))
  }, [language])

  useEffect(() => () => { clearInterval(timer.current); stopSpeaking() }, [])

  const say = (who, text) => {
    setTranscript((t) => [...t, { who, text }])
    if (who === 'ivr' && voiceOn) speak(text, SPEECH_LANG[language])
  }

  function startCall() {
    if (!script) return
    setError(null)
    setResult(null)
    setAnswers({})
    setTranscript([])
    setSeconds(0)
    setPhase('calling')
    setQ(0)
    clearInterval(timer.current)
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    say('ivr', `${script.greeting} ${script.questions[0].prompt}`)
  }

  function hangUp(final = 'ended') {
    clearInterval(timer.current)
    stopSpeaking()
    setPhase(final)
  }

  async function press(key) {
    if (phase !== 'calling' || q < 0) return
    const question = script.questions[q]
    if (!question.options[key]) {
      say('ivr', language === 'hi' ? 'कृपया दिए गए नंबरों में से चुनें।' : 'Please choose one of the numbers given.')
      return
    }
    say('caller', `${key} — ${question.options[key]}`)
    const next = { ...answers, [question.key]: key }
    setAnswers(next)
    if (question.key === 'consent' && key === '2') {
      say('ivr', script.thanks)
      hangUp('ended')
      return
    }
    const j = nextIndex(script.questions, q, next)
    if (j >= 0) {
      setQ(j)
      say('ivr', script.questions[j].prompt)
      return
    }
    say('ivr', script.thanks)
    hangUp('done')
    try {
      const r = await apiPost('/ivr/responses', { district, trade, gender, language, answers: next })
      setResult(r)
    } catch (e) {
      setError(`Answer not saved (${e.message})`)
    }
  }

  async function runRound() {
    setRound({ busy: true })
    try {
      const r = await apiPost('/ivr/simulate-round', { n: 12, district, trade })
      setRound({ saved: r.saved })
      const cards = await apiGet(`/evidence?${new URLSearchParams({ objection: 'placement', district, trade, gender })}`)
      setResult((prev) => ({ ...(prev ?? {}), card: cards.cards[0], automated: true }))
    } catch (e) {
      setRound(null)
      setError(`Survey round failed (${e.message})`)
    }
  }

  const select = 'rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100 disabled:opacity-60'
  const calling = phase === 'calling'
  const current = calling && q >= 0 ? script.questions[q] : null

  return (
    <div className="mx-auto max-w-6xl space-y-5" data-view="survey">
      <div className="card flex flex-col gap-4 p-5 lg:flex-row lg:items-end">
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-ink"><PhoneCall size={24} className="text-brand-600" /> Trainee Survey (IVR) — Feed C</h1>
          <p className="mt-1 max-w-3xl text-sm text-ink/60">
            A 90-second automated call to <b>past trainees</b>: are they working, what do they take home (asked in bands),
            did they stay in their district, would they recommend the course. Each answer updates the
            <b> Reported outcomes</b> card that parents see. <span className="whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">Simulated call</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select aria-label="District" className={select} value={district} disabled={calling} onChange={(e) => setDistrict(e.target.value)}>
            {(meta?.districts ?? [district]).map((d) => <option key={d}>{d}</option>)}
          </select>
          <select aria-label="Trade" className={select} value={trade} disabled={calling} onChange={(e) => setTrade(e.target.value)}>
            {(meta?.trades ?? [trade]).map((t) => <option key={t}>{t}</option>)}
          </select>
          <select aria-label="Trainee" className={select} value={gender} disabled={calling} onChange={(e) => setGender(e.target.value)}>
            <option value="female">Female trainee</option>
            <option value="male">Male trainee</option>
          </select>
          <select aria-label="Call language" className={select} value={language} disabled={calling} onChange={(e) => setLanguage(e.target.value)}>
            <option value="hi">हिन्दी</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr]">
        {/* handset */}
        <div className="card mx-auto w-full max-w-[340px] p-5">
          <div className="flex items-center justify-between text-xs text-ink/55">
            <span className="font-semibold">{calling ? 'Call in progress' : phase === 'done' ? 'Call completed' : phase === 'ended' ? 'Call ended' : 'Ready to call'}</span>
            <span className={`inline-flex items-center gap-1 tabular-nums ${seconds > 90 ? 'text-amber-700' : ''}`}><Timer size={13} /> {seconds}s / 90s</span>
          </div>
          <div className="mt-3 min-h-[92px] rounded-xl bg-ink px-3 py-2.5 text-[13px] leading-snug text-white/90" aria-live="polite">
            {current ? current.prompt : phase === 'idle' ? 'Press the green button to place the survey call.' : (script?.thanks ?? '')}
          </div>
          {current && (
            <ul className="mt-2 space-y-0.5 text-[11.5px] text-ink/60">
              {Object.entries(current.options).map(([k, v]) => <li key={k}><b className="text-ink">{k}</b> · {v}</li>)}
            </ul>
          )}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {KEYS.map((k) => (
              <button key={k} type="button" onClick={() => press(k)} disabled={!calling} aria-label={`Key ${k}`}
                className="h-12 rounded-full bg-slate-100 text-lg font-semibold text-ink transition hover:bg-brand-100 active:scale-95 disabled:opacity-40">
                {k}
              </button>
            ))}
          </div>
          <div className="mt-4 flex justify-center gap-4">
            {calling ? (
              <button type="button" onClick={() => hangUp('ended')} aria-label="Hang up" className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600"><PhoneOff size={24} /></button>
            ) : (
              <button type="button" onClick={startCall} disabled={!script} aria-label="Place survey call" className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 hover:bg-brand-700 disabled:opacity-50"><Phone size={24} /></button>
            )}
          </div>
          {synthesisSupported() && (
            <label className="mt-3 flex items-center justify-center gap-2 text-xs text-ink/60">
              <input type="checkbox" checked={voiceOn} onChange={(e) => { setVoiceOn(e.target.checked); if (!e.target.checked) stopSpeaking() }} />
              Speak prompts ({meta?.voice?.tts === 'bhashini' ? 'BHASHINI' : 'browser voice'})
            </label>
          )}
        </div>

        {/* transcript + effect */}
        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="text-[15px] font-bold text-ink">Call transcript</h2>
            {transcript.length === 0 ? (
              <p className="mt-2 text-sm text-ink/45">The IVR prompts and the trainee's keypad answers appear here. No name or number is recorded.</p>
            ) : (
              <ul className="mt-2 space-y-1.5 text-sm">
                {transcript.map((t, i) => (
                  <li key={i} className={`flex gap-2 ${t.who === 'caller' ? 'justify-end' : ''}`}>
                    {t.who === 'ivr' && <Bot size={16} className="mt-0.5 shrink-0 text-brand-600" />}
                    <span className={`rounded-xl px-3 py-1.5 ${t.who === 'ivr' ? 'bg-slate-100 text-ink/80' : 'bg-brand-600 text-white'}`}>{t.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {result?.card && (
            <div className="card p-4">
              <p className="text-sm font-semibold text-brand-800">
                {result.automated ? `Automated round: ${round?.saved ?? 0} simulated calls added.` : 'Answer saved to Feed C.'} The card parents see for {trade}, {district} is now:
              </p>
              <ProofCard card={result.card} />
            </div>
          )}

          <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="flex-1 text-sm text-ink/65">
              <b className="text-ink">Automated survey round.</b> In production the system calls every past trainee at 6 and 12 months.
              Simulate 12 calls for {trade}, {district}.
            </div>
            <button type="button" onClick={runRound} disabled={round?.busy || calling}
              className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              {round?.busy ? 'Calling…' : 'Run 12 simulated calls'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
