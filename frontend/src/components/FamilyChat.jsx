import { AudioLines, CheckCircle2, MapPin, MessageCircle, Mic, Play, RotateCcw, SendHorizontal, ShieldCheck, Sparkles, TrendingUp, Wallet } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { apiPost, openEventSocket } from '../lib/api'
import { DEMO_STEPS } from '../lib/demoScript'
import { LANGUAGE_LABELS, OBJECTION_LABELS, PERSONA_LABELS, capitalize, learnerVariant } from '../lib/labels'
import { listen, recognitionSupported, speak, stopSpeaking, synthesisSupported } from '../lib/speech'
import HandoffBrief from './HandoffBrief'
import InsightsColumn from './insights/InsightsColumn'
import ProofCard from './ProofCard'
import Avatar from './shell/Avatar'
import { LogoMark } from './shell/Logo'

const SIMULATED_VOICE = {
  learner: (trade) => `Mujhe ${trade.toLowerCase()} course karna hai.`,
  parent: () => 'Isme salary kitni milegi?',
}

// One-tap parent questions; each maps to a real objection category in the classifier.
const QUICK_ASKS = [
  { label: 'Career info', Icon: Wallet, text: 'Isme salary kitni milegi?', cls: 'bg-sky-50 text-sky-800 hover:bg-sky-100' },
  { label: 'Safety details', Icon: ShieldCheck, text: 'Ladki ke liye safe hai?', cls: 'bg-brand-50 text-brand-800 hover:bg-brand-100' },
  { label: 'Jobs nearby', Icon: MapPin, text: 'Yahan naukri milegi kya?', cls: 'bg-amber-50 text-amber-800 hover:bg-amber-100' },
  { label: 'Career growth', Icon: TrendingUp, text: 'Degree ke bina izzat milegi?', cls: 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100' },
]

const stamp = () => new Date() // message timestamps are taken in event handlers, never during render
const clock = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

function DetectionChip({ detection }) {
  if (!detection.objection && detection.intent !== 'acceptance') return null
  return (
    <div className="mt-1.5 flex flex-wrap gap-1 text-[11px]">
      <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-medium text-indigo-800">Persona: Parent</span>
      {detection.objection && <span className="rounded-full bg-rose-100 px-2 py-0.5 font-medium text-rose-800">Objection: {detection.objection_label}</span>}
      {detection.intent === 'acceptance' && <span className="rounded-full bg-brand-100 px-2 py-0.5 font-medium text-brand-800">Open to enrolment</span>}
      {detection.refusal && <span className="rounded-full bg-red-600 px-2 py-0.5 font-medium text-white">Refusal</span>}
      <span className="rounded-full bg-white px-2 py-0.5 text-ink/60 ring-1 ring-ink/10">{detection.district} · {detection.trade}</span>
      {detection.source === 'llm' && <span className="rounded-full bg-white px-2 py-0.5 text-ink/50 ring-1 ring-ink/10">classified by AI</span>}
    </div>
  )
}

function ReplySourceChip({ reply }) {
  if (!reply || reply.mode !== 'llm') return null
  return reply.source === 'llm' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700" title="The LLM wrote the wording; every fact and number is checked against the evidence cards.">
      <Sparkles size={11} /> AI-phrased · facts from dataset
    </span>
  ) : (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600" title="The AI reply was unavailable or failed the evidence check, so the deterministic template was used.">
      Template reply
    </span>
  )
}

function Bubble({ msg, session }) {
  if (msg.role === 'system') {
    return (
      <p className="fade-up inline-flex items-center gap-1.5 self-center rounded-full bg-white px-3 py-1 text-xs font-medium text-ink/60 shadow-sm ring-1 ring-ink/5">
        <MessageCircle size={13} className="text-[#008069]" /> {msg.text}
      </p>
    )
  }
  if (msg.role === 'assistant') {
    return (
      <div className="fade-up flex max-w-[94%] gap-3 sm:max-w-[85%]">
        <Avatar variant="assistant" size={40} />
        <div className="min-w-0 flex-1">
          <div className="card rounded-tl-md p-3.5">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-brand-700">{PERSONA_LABELS.assistant}</span>
              <ReplySourceChip reply={msg.reply} />
              {msg.channel === 'whatsapp' && <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f7f1] px-2 py-0.5 text-[10px] font-semibold text-[#008069]"><MessageCircle size={11} /> also sent on WhatsApp</span>}
              <span className="ml-auto text-[10.5px] text-ink/40">{msg.at && clock(msg.at)}</span>
            </div>
            <p className="text-[14px] leading-relaxed text-ink/85">{msg.text}</p>
            {msg.cards?.map((c, i) => <ProofCard key={i} card={c} />)}
            {msg.escalation && <div className="mt-2"><HandoffBrief escalation={msg.escalation} compact /></div>}
          </div>
        </div>
      </div>
    )
  }
  const isLearner = msg.role === 'learner'
  const variant = isLearner ? learnerVariant(session.learner_gender) : session.parent_relation
  return (
    <div className={`fade-up flex max-w-[90%] gap-3 sm:max-w-[75%] ${isLearner ? '' : 'sm:ml-8'}`}>
      <Avatar variant={variant} size={40} />
      <div className="min-w-0">
        <div className={`rounded-2xl rounded-tl-md border px-3.5 py-2.5 shadow-sm ${isLearner ? 'border-brand-100 bg-brand-50' : 'border-rose-100 bg-rose-50'}`}>
          <div className={`mb-0.5 flex items-center gap-2 text-xs font-bold ${isLearner ? 'text-brand-700' : 'text-rose-700'}`}>
            {PERSONA_LABELS[msg.role]}
            {msg.voice && <span className="inline-flex items-center gap-1 font-normal text-ink/50"><Mic size={11} />{msg.voice === 'simulated' ? 'simulated voice note' : 'voice note'}</span>}
            {msg.channel === 'whatsapp' && <span className="inline-flex items-center gap-1 font-semibold text-[#008069]"><MessageCircle size={11} /> via WhatsApp</span>}
          </div>
          <p className="text-[14px] leading-relaxed text-ink/90">{msg.text}</p>
          <div className="mt-0.5 text-right text-[10.5px] text-ink/40">{msg.at && clock(msg.at)}</div>
        </div>
        {msg.detection && <DetectionChip detection={msg.detection} />}
      </div>
    </div>
  )
}

function Typing() {
  return (
    <div className="flex items-center gap-3" aria-live="polite">
      <Avatar variant="assistant" size={40} />
      <div className="card flex items-center gap-2 rounded-tl-md px-4 py-3 text-xs text-ink/55">
        <span className="flex gap-1">
          {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500" style={{ animationDelay: `${i * 120}ms` }} />)}
        </span>
        ParivaarSaathi is checking the evidence…
      </div>
    </div>
  )
}

function Participant({ role, session, active, detail, onSelect }) {
  const variant = role === 'learner' ? learnerVariant(session.learner_gender) : session.parent_relation
  return (
    <button type="button" role="radio" aria-checked={active} aria-label={PERSONA_LABELS[role]} onClick={onSelect}
      className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all ${active ? (role === 'learner' ? 'border-brand-300 bg-brand-50 shadow-sm' : 'border-rose-300 bg-rose-50 shadow-sm') : 'border-transparent hover:bg-ink/[0.03]'}`}>
      <Avatar variant={variant} size={46} online={active} ring />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-[15px] font-bold text-ink">
          {active && <span className={`h-2 w-2 rounded-full ${role === 'learner' ? 'bg-brand-500' : 'bg-rose-500'}`} />}
          {PERSONA_LABELS[role]}
          <span className="text-xs font-normal text-ink/45">{role === 'parent' ? `· ${capitalize(session.parent_relation)}` : ''}</span>
        </span>
        <span className="block truncate text-xs text-ink/55">{detail}</span>
      </span>
      {active && <span className="ml-auto hidden shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-ink/60 ring-1 ring-ink/10 sm:inline">Speaking</span>}
    </button>
  )
}

export default function FamilyChat({ session, demo = false, onEnd }) {
  const [messages, setMessages] = useState([])
  const [persona, setPersona] = useState('learner')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [score, setScore] = useState(session.resistance_score)
  const [learnerGoal, setLearnerGoal] = useState(null)
  const [concerns, setConcerns] = useState([])
  const [accepted, setAccepted] = useState(false)
  const [escalation, setEscalation] = useState(null)
  const [shownEvidence, setShownEvidence] = useState([])
  const [demoStep, setDemoStep] = useState(0)
  const [listening, setListening] = useState(false)
  const [readAloud, setReadAloud] = useState(false)
  const [voiceTag, setVoiceTag] = useState(null)
  const [parentChannel, setParentChannel] = useState(null) // 'whatsapp' once the parent joins from their phone
  const stopRef = useRef(null)
  const readAloudRef = useRef(readAloud) // read inside socket callbacks
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy])

  useEffect(() => () => { stopRef.current?.(); stopSpeaking() }, [])

  useEffect(() => { readAloudRef.current = readAloud }, [readAloud])

  /** Applies one pipeline response (from this tab or from another channel) to the chat and the insights. */
  function applyTurn(who, pending, r, replace) {
    const esc = r.escalation?.is_new ? r.escalation : null
    const turn = [{ ...pending, detection: r.detection },
      // Learner turns are always templated by design, so the AI/template chip is only meaningful on parent turns.
      { role: 'assistant', text: r.reply.text, cards: r.reply.cards, reply: who === 'parent' ? r.reply : null, escalation: esc, channel: pending.channel, at: stamp() }]
    setMessages((m) => (replace ? [...m.slice(0, -1), ...turn] : [...m, ...turn]))
    setScore(r.resistance.after)
    if (r.detection.intent === 'learner_goal') setLearnerGoal(r.detection.trade || session.trade)
    if (r.detection.objection) {
      setConcerns((c) => [
        ...c.filter((x) => x.category !== r.detection.objection),
        { category: r.detection.objection, severity: r.detection.severity, evidence: r.reply.cards.length > 0, refusal: r.detection.refusal },
      ])
    }
    if (r.reply.cards.length) {
      setShownEvidence((prev) => [...r.reply.cards, ...prev.filter((p) => !r.reply.cards.some((c) => c.type === p.type))])
    }
    if (r.detection.intent === 'acceptance') {
      setAccepted(true)
      setConcerns((c) => c.map((x) => ({ ...x, resolved: true })))
    }
    if (r.escalation) setEscalation(r.escalation)
    if (readAloudRef.current) speak(r.reply.text, session.language)
  }

  // Turns that arrive from the parent's WhatsApp land in this chat live.
  useEffect(() => {
    const ws = openEventSocket((ev) => {
      if (ev.session_id !== session.id) return
      if (ev.type === 'channel_joined') {
        setParentChannel(ev.channel)
        setMessages((m) => [...m, { role: 'system', text: 'Parent joined from WhatsApp', at: stamp() }])
      } else if (ev.type === 'channel_left') {
        setParentChannel(null)
        setMessages((m) => [...m, { role: 'system', text: 'Parent left the WhatsApp session', at: stamp() }])
      } else if (ev.type === 'session_turn') {
        setPersona('parent')
        applyTurn('parent', { role: 'parent', text: ev.text, channel: ev.channel, at: stamp() }, ev.response, false)
      } else if (ev.type === 'session_escalation') {
        setEscalation(ev.escalation)
        setMessages((m) => [...m, { role: 'assistant', text: ev.reply, escalation: ev.escalation.is_new ? ev.escalation : null, channel: ev.channel, at: stamp() }])
      }
    })
    return () => ws.close()
    // applyTurn only uses state setters and refs, so the socket is opened once per session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id])

  async function sendMessage(who, body, voice = null) {
    setError(null)
    setBusy(true)
    const pending = { role: who, text: body, voice, at: stamp() }
    setMessages((m) => [...m, pending])
    try {
      const r = await apiPost('/message', { session_id: session.id, persona: who, text: body })
      applyTurn(who, pending, r, true)
      return true
    } catch (err) {
      setMessages((m) => m.slice(0, -1))
      setError(`Message failed (${err.message})`)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function send(e) {
    e.preventDefault()
    const body = text.trim()
    if (!body || busy) return
    setText('')
    const tag = voiceTag
    setVoiceTag(null)
    if (!(await sendMessage(persona, body, tag))) setText(body)
  }

  async function runDemoStep() {
    const step = DEMO_STEPS[demoStep]
    if (!step || busy) return
    setPersona(step.persona)
    if (await sendMessage(step.persona, step.text)) setDemoStep((s) => s + 1)
  }

  async function quickAsk(q) {
    if (busy) return
    setPersona('parent')
    await sendMessage('parent', q.text)
  }

  async function askCounsellor() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const r = await apiPost('/escalation', { session_id: session.id })
      setEscalation(r.escalation)
      setMessages((m) => [...m, { role: 'assistant', text: r.reply, escalation: r.escalation.is_new ? r.escalation : null, at: stamp() }])
    } catch (err) {
      setError(`Could not escalate (${err.message})`)
    } finally {
      setBusy(false)
    }
  }

  function toggleVoice() {
    if (listening) {
      stopRef.current?.()
      return
    }
    setError(null)
    if (recognitionSupported()) {
      setListening(true)
      try {
        stopRef.current = listen(session.language, {
          onInterim: (t) => setText(t),
          onFinal: (t) => { setText(t); setVoiceTag('browser') },
          onEnd: () => { setListening(false); stopRef.current = null },
          onError: (code) => setError(code === 'not-allowed' ? 'Microphone access was blocked.' : `Voice input error (${code}).`),
        })
      } catch (err) {
        setListening(false)
        setError(err.message)
      }
    } else {
      // No speech recognition in this browser: a visibly simulated voice note.
      setListening(true)
      const nextDemo = demo ? DEMO_STEPS[demoStep] : null
      const phrase = nextDemo && nextDemo.persona === persona ? nextDemo.text : SIMULATED_VOICE[persona](session.trade)
      setTimeout(() => { setText(phrase); setVoiceTag('simulated'); setListening(false) }, 1200)
    }
  }

  const nextStep = DEMO_STEPS[demoStep]
  const demoRunning = demo && Boolean(nextStep)
  const voiceLabel = recognitionSupported() ? 'Speak' : 'Voice note (simulated)'
  const parentDetail = concerns.length ? `Concern: ${concerns.map((c) => OBJECTION_LABELS[c.category]).join(', ')}` : 'No concerns raised yet'

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      {/* ================= chat column ================= */}
      <section className="card flex min-h-[600px] flex-col overflow-hidden xl:h-[calc(100vh-73px-48px)]">
        <header className="relative overflow-hidden bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 px-4 py-4 text-white sm:px-5">
          <svg className="pointer-events-none absolute -right-6 -top-8 h-36 w-36 opacity-15" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="none" stroke="#fff" strokeWidth="2" /><circle cx="50" cy="50" r="32" fill="none" stroke="#fff" strokeWidth="2" /></svg>
          <div className="relative flex items-center gap-3">
            <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/95 sm:inline-flex"><LogoMark size={34} /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold sm:text-xl">Family Session #{session.id}</h2>
                {demo && <span className="whitespace-nowrap rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-white/40">Demo scenario</span>}
                {session.mode === 'llm' && <span className="whitespace-nowrap rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">AI mode</span>}
              </div>
              <div className="mt-0.5 text-xs text-white/85 sm:text-sm">
                {session.district} · {session.trade} · {capitalize(session.learner_gender)} learner · {capitalize(session.parent_relation)} · {LANGUAGE_LABELS[session.language] ?? session.language}
              </div>
            </div>
            <button onClick={onEnd} className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/50 hover:bg-white/25">
              <RotateCcw size={13} /> New session
            </button>
          </div>
        </header>

        {/* participants = persona selector */}
        <div className="flex flex-col gap-2 border-b border-ink/5 bg-white px-3 py-2.5 sm:flex-row" role="radiogroup" aria-label="Who is speaking">
          <Participant role="learner" session={session} active={persona === 'learner'} onSelect={() => setPersona('learner')}
            detail={`Goal: ${learnerGoal ?? session.trade}`} />
          <Participant role="parent" session={session} active={persona === 'parent'} onSelect={() => setPersona('parent')} detail={parentDetail} />
        </div>

        <div className="chat-pattern flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-5 sm:px-5">
          {messages.length === 0 && (
            <div className="m-auto max-w-sm text-center">
              <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-white shadow"><LogoMark size={38} /></span>
              <p className="mt-3 text-sm font-semibold text-ink">One session, two perspectives.</p>
              <p className="mt-1 text-xs text-ink/55">{demo ? 'Press “Next step” below to play the scripted story.' : 'Pick who is speaking above, then type or use the mic. Every parent concern is answered with local evidence.'}</p>
            </div>
          )}
          {messages.map((m, i) => <Bubble key={i} msg={m} session={session} />)}
          {busy && <Typing />}
          <div ref={endRef} />
        </div>

        {error && <div className="bg-red-50 px-4 py-1.5 text-xs text-red-700">{error}</div>}

        {demo && (
          <div className="flex flex-col gap-2 border-t border-brand-100 bg-brand-50 px-4 py-2.5 sm:flex-row sm:items-center">
            <div className="flex-1 text-xs text-brand-900">
              {nextStep ? (
                <>
                  <span className="font-bold">Step {demoStep + 1} of {DEMO_STEPS.length} · {PERSONA_LABELS[nextStep.persona]}:</span> “{nextStep.text}”
                  <div className="mt-0.5 text-brand-800/80">{nextStep.caption}</div>
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-semibold"><CheckCircle2 size={15} /> Demo complete — check the admin dashboard for the live event and the counsellor queue.</span>
              )}
            </div>
            {nextStep && (
              <button onClick={runDemoStep} disabled={busy}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-brand-600/25 hover:bg-brand-700 disabled:opacity-50">
                <Play size={15} fill="currentColor" /> Next step
              </button>
            )}
          </div>
        )}

        {/* composer */}
        <div className="border-t border-ink/5 bg-white px-3 pb-3 pt-3 sm:px-4">
          <form onSubmit={send} className="flex items-center gap-2">
            <button type="button" onClick={toggleVoice} disabled={busy} aria-label={voiceLabel} title={voiceLabel}
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-md transition-colors ${listening ? 'animate-pulse bg-red-500 shadow-red-500/30' : 'bg-brand-600 shadow-brand-600/25 hover:bg-brand-700'} disabled:opacity-50`}>
              {listening ? <AudioLines size={19} /> : <Mic size={19} />}
            </button>
            <input ref={inputRef} value={text} onChange={(e) => { setText(e.target.value); setVoiceTag(null) }}
              placeholder={listening ? 'Listening…' : persona === 'learner' ? 'Learner: e.g. Mujhe electrician course karna hai' : 'Parent: e.g. Electrician mein future nahi hai'}
              className="h-11 min-w-0 flex-1 rounded-full border border-ink/10 bg-ink/[0.02] px-4 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100" />
            <button type="submit" disabled={busy || !text.trim()} aria-label="Send"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-md shadow-brand-600/25 hover:bg-brand-700 disabled:bg-brand-200 disabled:shadow-none">
              <SendHorizontal size={19} />
            </button>
          </form>
          {!demoRunning && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium text-ink/45">Parent asks:</span>
              {QUICK_ASKS.map((q) => (
                <button key={q.label} type="button" onClick={() => quickAsk(q)} disabled={busy} title={`Ask as parent: “${q.text}”`}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${q.cls}`}>
                  <q.Icon size={14} /> {q.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ================= insights column ================= */}
      <InsightsColumn session={session} parentChannel={parentChannel} score={score} learnerGoal={learnerGoal} concerns={concerns} accepted={accepted}
        escalation={escalation} shownEvidence={shownEvidence} busy={busy} onAskCounsellor={askCounsellor}
        readAloud={readAloud} canReadAloud={synthesisSupported()}
        onToggleReadAloud={() => setReadAloud((v) => { if (v) stopSpeaking(); return !v })} />
    </div>
  )
}
