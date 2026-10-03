import { ArrowRight, Database, Headset, PlugZap, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiGet } from '../lib/api'

const STATUS_STYLES = {
  working: 'bg-brand-100 text-brand-800',
  simulated: 'bg-amber-100 text-amber-800',
  ready: 'bg-sky-100 text-sky-800',
  out: 'bg-slate-200 text-slate-700',
}
const STATUS_LABELS = { working: 'Working', simulated: 'Simulated', ready: 'Adapter ready', out: 'Not in prototype' }

/** Honest status of every integration named in the solution design. */
function integrations(meta) {
  const llm = meta?.mode === 'llm'
  const bhashini = meta?.voice?.bhashini_configured
  const twilio = meta?.channels?.twilio
  return [
    { name: 'Family session (learner + parent, dual-persona state)', status: 'working', detail: 'Web chat with persona tracking, resistance index, live dashboard.' },
    { name: `LLM classification + phrasing (${meta?.provider ?? '—'})`, status: llm ? 'working' : 'ready', detail: llm ? `${meta.model}; facts only from the dataset, fact- and language-guarded.` : 'No key configured — deterministic rules and templates are used.' },
    { name: 'WhatsApp — parent channel', status: 'simulated', detail: `In-app simulator on the real code path. Twilio Sandbox webhook ready${twilio?.signature_check ? ' (signature check on)' : ' — needs a tunnel and TWILIO_AUTH_TOKEN'}.` },
    { name: 'IVR micro-survey of past trainees (Feed C)', status: 'simulated', detail: 'Keypad survey in the browser; answers update the outcomes card. Telephony provider not connected.' },
    { name: 'BHASHINI speech (ASR / TTS)', status: bhashini ? 'working' : 'ready', detail: bhashini ? 'BHASHINI TTS in use, browser fallback.' : 'Adapter written against the BHASHINI pipeline API; browser speech is used until credentials are added (untested live).' },
    { name: 'Skill India Digital Hub / NSDC records (Feed A)', status: 'simulated', detail: 'Certification, attendance and audit fields from the demo dataset.' },
    { name: 'PLFS / e-Shram wage data (Feed B)', status: 'simulated', detail: 'District × industry quintiles generated for the demo.' },
    { name: 'National Career Service — counsellor routing & jobs', status: 'simulated', detail: 'Simulated counsellor pool and job listings; no NCS connection.' },
    { name: 'Aadhaar-based enrolment / biometric identity', status: 'out', detail: 'Deliberately not built: needs legal approval, consent design and production security.' },
    { name: 'All 22 scheduled languages', status: 'out', detail: 'Hinglish, English and Hindi today; more languages arrive through BHASHINI + the LLM path.' },
  ]
}

export default function DataFeeds({ meta }) {
  const [feeds, setFeeds] = useState(null)
  const [pool, setPool] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    apiGet('/data/feeds').then((r) => setFeeds(r.feeds)).catch((e) => setError(`Could not load feeds (${e.message})`))
    apiGet('/counsellors').then((r) => setPool(r.counsellors)).catch(() => {})
  }, [])

  return (
    <div className="mx-auto max-w-6xl space-y-5" data-view="feeds">
      <div className="card p-5">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-ink"><Database size={24} className="text-brand-600" /> Data &amp; Integrations</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink/60">
          The <b>Outcome Data Engine</b> turns separate feeds into the evidence cards parents see. Retrieval is structured —
          the card's numbers are looked up from these tables, never generated. In this prototype <b>every feed is simulated</b>;
          each one names the authorised source the production design connects instead.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* pipeline */}
      <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-[1fr_auto_220px_auto_220px]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(feeds ?? []).map((f) => (
            <div key={f.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="text-[13px] font-bold text-ink">{f.id === 'J' ? 'Jobs' : `Feed ${f.id}`} · {f.name}</div>
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">{f.status}</span>
              </div>
              <div className="mt-1 text-2xl font-extrabold tabular-nums text-ink">{f.records.toLocaleString('en-IN')}<span className="ml-1 text-xs font-medium text-ink/50">{f.unit}</span></div>
              {f.live_records > 0 && <div className="text-[11px] font-semibold text-brand-700">{f.live_records} added live in this demo</div>}
              <dl className="mt-2 space-y-1 text-[11.5px]">
                <div><dt className="inline text-ink/45">Fields: </dt><dd className="inline text-ink/75">{f.fields}</dd></div>
                <div><dt className="inline text-ink/45">Production source: </dt><dd className="inline text-ink/75">{f.production}</dd></div>
                <div><dt className="inline text-ink/45">Used in: </dt><dd className="inline text-ink/75">{f.used_in.join(', ')}</dd></div>
              </dl>
            </div>
          ))}
        </div>
        <ArrowRight className="mx-auto hidden self-center text-ink/30 lg:block" aria-hidden="true" />
        <div className="card flex flex-col justify-center p-4 text-center lg:self-center">
          <Database className="mx-auto text-brand-600" />
          <div className="mt-1 text-sm font-bold text-ink">Evidence engine</div>
          <p className="mt-1 text-[11.5px] text-ink/60">Objection + district + trade → exact rows → proof card with source and feed labels.</p>
        </div>
        <ArrowRight className="mx-auto hidden self-center text-ink/30 lg:block" aria-hidden="true" />
        <div className="card flex flex-col justify-center p-4 text-center lg:self-center">
          <Sparkles className="mx-auto text-indigo-500" />
          <div className="mt-1 text-sm font-bold text-ink">LLM phrases only</div>
          <p className="mt-1 text-[11.5px] text-ink/60">A reply with a number not in the cards, a banned claim or the wrong language is discarded; the template is used.</p>
        </div>
      </div>

      {/* integrations */}
      <section className="card p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><PlugZap size={19} className="text-brand-600" /> Integration status</h2>
        <ul className="mt-3 divide-y divide-ink/5">
          {integrations(meta).map((it) => (
            <li key={it.name} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:gap-4">
              <span className={`w-fit shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold sm:w-28 sm:text-center ${STATUS_STYLES[it.status]}`}>{STATUS_LABELS[it.status]}</span>
              <div>
                <div className="text-sm font-semibold text-ink">{it.name}</div>
                <div className="text-xs text-ink/60">{it.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* counsellor pool */}
      <section className="card p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><Headset size={19} className="text-indigo-500" /> Counsellor routing <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">simulated pool</span></h2>
        <p className="mt-1 text-sm text-ink/60">
          Escalated cases are routed: counsellor covers the district → speaks the family's language → a female counsellor when a
          daughter's family raised safety → lightest open caseload. Production: the NCS counsellor network.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs text-ink/50">
              <tr><th className="py-1.5 pr-3 font-semibold">Counsellor</th><th className="pr-3 font-semibold">Coverage</th><th className="pr-3 font-semibold">Languages</th><th className="pr-3 font-semibold">Open cases</th></tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {(pool ?? []).map((c) => (
                <tr key={c.code}>
                  <td className="py-2 pr-3 font-semibold text-ink">{c.code}{c.female && <span className="ml-1.5 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">female</span>}</td>
                  <td className="pr-3 text-ink/70">{c.cluster} · {c.districts.join(', ')}</td>
                  <td className="pr-3 text-ink/70">{c.languages.join(', ')}</td>
                  <td className="pr-3 tabular-nums text-ink">{c.open_cases}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="flex items-center gap-1.5 text-xs text-ink/45"><ShieldCheck size={14} /> No personal identifiers are stored: WhatsApp numbers are kept only as salted hashes, IVR answers carry no name or number.</p>
    </div>
  )
}
