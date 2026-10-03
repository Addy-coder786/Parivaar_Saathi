import { ArrowRight, FileCheck2, Headset, LayoutDashboard, MessagesSquare, Play, ShieldAlert, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { apiPost } from '../lib/api'
import { LANGUAGE_LABELS } from '../lib/labels'
import Avatar from './shell/Avatar'

const STEPS = [
  { Icon: MessagesSquare, title: 'Learner + parent, one session', text: 'Both voices in the same chat; the system tracks each persona separately.' },
  { Icon: FileCheck2, title: 'Objection → evidence', text: 'Each parent concern is answered with local, source-labelled data.' },
  { Icon: Headset, title: 'Human escalation', text: 'Unresolved resistance goes to a counsellor with a warm-handoff brief.' },
  { Icon: LayoutDashboard, title: 'Resistance intelligence', text: 'Every objection streams live to the administrator dashboard.' },
]

export default function SessionSetup({ meta, onStart, onDemo, demoError }) {
  const [form, setForm] = useState({
    district: 'Sikar',
    trade: 'Electrician',
    learner_gender: 'female',
    parent_relation: 'mother',
    language: 'hinglish',
    use_llm: true,
  })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const ready = meta && meta.mode !== 'offline'
  const aiAvailable = meta?.mode === 'llm'

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onStart(await apiPost('/session', form))
    } catch (err) {
      setError(`Could not start session (${err.message})`)
    } finally {
      setBusy(false)
    }
  }

  const field = 'mt-1.5 w-full rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm font-medium outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100'
  const label = 'text-xs font-semibold uppercase tracking-wide text-ink/55'

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
      {/* hero + demo */}
      <div className="flex flex-col gap-5">
        <section className="card relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white sm:p-8">
          <svg className="pointer-events-none absolute -bottom-10 -right-10 h-56 w-56 opacity-10" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="46" fill="none" stroke="#fff" strokeWidth="3" /><circle cx="50" cy="50" r="30" fill="none" stroke="#fff" strokeWidth="3" />
          </svg>
          <p className="text-sm font-semibold text-brand-100">SIH26241 · Team Bit Flare</p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">We don't just recommend careers —<br className="hidden sm:block" /> we help families trust them.</h1>
          <p className="mt-3 max-w-xl text-sm text-white/85 sm:text-base">
            A shared counselling session for learner and parent. ParivaarSaathi detects the parent's actual concern and answers it with local evidence on wages, jobs, safety and outcomes.
          </p>
          <div className="mt-5 flex items-end gap-1">
            <Avatar variant="learner-female" size={52} ring />
            <Avatar variant="mother" size={56} ring className="-ml-3" />
            <Avatar variant="assistant" size={52} className="-ml-3 ring-2 ring-white" />
          </div>
        </section>

        <section className="card border-2 border-dashed border-brand-200 bg-brand-50/60 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><Play size={18} className="text-brand-600" /> Demo Scenario Mode</h2>
              <p className="mt-1 text-sm text-ink/65">Plays the scripted Sikar electrician story step by step — learner goal, two parent objections, evidence, escalation. Deterministic; works without an LLM.</p>
            </div>
            <button onClick={onDemo} disabled={!ready}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700 disabled:opacity-50">
              <Play size={16} fill="currentColor" /> Run demo scenario
            </button>
          </div>
          {demoError && <p className="mt-2 text-xs text-red-600">{demoError}</p>}
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {STEPS.map(({ Icon, title, text }, i) => (
            <div key={title} className="card flex gap-3 p-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Icon size={20} /></span>
              <div>
                <div className="text-sm font-bold text-ink"><span className="text-brand-500">{i + 1}.</span> {title}</div>
                <div className="mt-0.5 text-xs leading-relaxed text-ink/60">{text}</div>
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* setup form */}
      <form onSubmit={submit} className="card h-fit p-6 sm:p-7">
        <h2 className="text-xl font-bold text-ink">Start a family counselling session</h2>
        <p className="mt-1 text-sm text-ink/60">Learner and parent join the same session.</p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={label}>
            District
            <select className={field} value={form.district} onChange={set('district')}>
              {(meta?.districts ?? [form.district]).map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label className={label}>
            Trade
            <select className={field} value={form.trade} onChange={set('trade')}>
              {(meta?.trades ?? [form.trade]).map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className={label}>
            Learner
            <select className={field} value={form.learner_gender} onChange={set('learner_gender')}>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className={label}>
            Parent
            <select className={field} value={form.parent_relation} onChange={set('parent_relation')}>
              <option value="mother">Mother</option>
              <option value="father">Father</option>
              <option value="guardian">Guardian</option>
            </select>
          </label>
          <label className={`${label} sm:col-span-2`}>
            Reply language
            <select className={field} value={form.language} onChange={set('language')}>
              {(meta?.languages ?? ['hinglish']).map((l) => <option key={l} value={l}>{LANGUAGE_LABELS[l] ?? l}</option>)}
            </select>
            {!aiAvailable && <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-ink/50">Hindi (Devanagari) replies become available when an LLM key is configured.</span>}
          </label>
        </div>

        <div className={`mt-5 rounded-xl border px-3.5 py-3 text-xs leading-relaxed ${aiAvailable ? 'border-indigo-200 bg-indigo-50 text-indigo-900' : 'border-ink/10 bg-ink/[0.02] text-ink/65'}`}>
          {aiAvailable ? (
            <label className="flex items-start gap-2.5">
              <input type="checkbox" checked={form.use_llm} onChange={set('use_llm')} className="mt-0.5 accent-indigo-600" />
              <span>
                <span className="inline-flex items-center gap-1 font-bold"><Sparkles size={13} /> AI mode</span> — {meta.model} classifies concerns and phrases replies around the retrieved evidence.
                Facts always come from the dataset; a reply that adds an unsupported number is discarded and the template is used. Untick for the deterministic Demo Scenario path.
              </span>
            </label>
          ) : (
            <span>
              <span className="font-bold">Demo Scenario Mode</span> — no LLM key configured; replies use deterministic rules and templates.
              Add an LLM key (<code>GROQ_API_KEY</code> or <code>ANTHROPIC_API_KEY</code>) to <code>backend/.env</code> and restart the backend to enable AI mode.
            </span>
          )}
        </div>

        <p className="mt-4 flex items-center gap-2 text-xs text-ink/55">
          <ShieldAlert size={14} className="text-amber-600" /> Evidence comes from a clearly labelled demonstration dataset.
        </p>

        {(error || meta?.mode === 'offline') && <p className="mt-3 text-sm text-red-600">{error ?? 'Backend unreachable — start the FastAPI server on port 8000.'}</p>}

        <button type="submit" disabled={busy || !ready}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700 disabled:opacity-50">
          {busy ? 'Starting…' : <>Start session <ArrowRight size={16} /></>}
        </button>
      </form>
    </div>
  )
}
