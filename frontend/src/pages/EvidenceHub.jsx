import { Compass, FileCheck2, MessageCircleQuestion, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import ProofCard from '../components/ProofCard'
import { apiGet } from '../lib/api'

// Which objection categories each view queries, and the parent question each card answers.
const PRESETS = {
  evidence: {
    title: 'Evidence Hub', Icon: FileCheck2,
    intro: 'Every card the counselling session can show, for any district and trade. Each one answers a specific parent concern — the LLM never supplies these facts.',
    categories: ['employment', 'social_status', 'placement', 'safety', 'distance'],
  },
  career: {
    title: 'Career Explorer', Icon: Compass,
    intro: 'Is there a future after this course? Local jobs, the wage ladder from entry-level to self-employment, the progression path and reported outcomes.',
    categories: ['employment', 'social_status', 'placement'],
  },
  safety: {
    title: 'Safety & Security', Icon: ShieldCheck,
    intro: 'What a parent needs to know before sending a daughter or son to a training centre: staff, CCTV, transport, hours, emergency contact and distance.',
    categories: ['safety', 'distance'],
  },
}

const QUESTIONS = {
  job_radar: '“Job milegi?” — Will there be work nearby?',
  paisa_map: '“Salary kitni hai?” — What will she/he earn?',
  roadmap: '“Degree nahi toh izzat?” — Pragati Path: NSQF levels in school/college terms',
  placement: '“Placement milegi?” — What do past trainees say? (IVR survey)',
  safety: '“Ladki ke liye safe hai?” — Is the centre safe?',
  distance: '“Centre kitni door hai?” — How far is it?',
}

export default function EvidenceHub({ preset = 'evidence', meta, defaults }) {
  const cfg = PRESETS[preset]
  const [district, setDistrict] = useState(defaults?.district ?? 'Sikar')
  const [trade, setTrade] = useState(defaults?.trade ?? 'Electrician')
  const [gender, setGender] = useState(defaults?.learner_gender ?? 'female')
  const [cards, setCards] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all(cfg.categories.map((objection) =>
      apiGet(`/evidence?${new URLSearchParams({ objection, district, trade, gender })}`).then((r) => r.cards)))
      .then((lists) => {
        if (cancelled) return
        const seen = new Set()
        setCards(lists.flat().filter((c) => (seen.has(c.type) ? false : seen.add(c.type))))
        setError(null)
      })
      .catch((e) => !cancelled && setError(`Could not load evidence (${e.message})`))
    return () => { cancelled = true }
  }, [cfg, district, trade, gender])

  const select = 'rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100'

  return (
    <div className="mx-auto max-w-6xl" data-view={preset}>
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-ink"><cfg.Icon size={24} className="text-brand-600" /> {cfg.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink/60">{cfg.intro}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select aria-label="District" className={select} value={district} onChange={(e) => setDistrict(e.target.value)}>
            {(meta?.districts ?? [district]).map((d) => <option key={d}>{d}</option>)}
          </select>
          <select aria-label="Trade" className={select} value={trade} onChange={(e) => setTrade(e.target.value)}>
            {(meta?.trades ?? [trade]).map((t) => <option key={t}>{t}</option>)}
          </select>
          {preset !== 'career' && (
            <select aria-label="Learner" className={select} value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="female">Female learner</option>
              <option value="male">Male learner</option>
            </select>
          )}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {!cards && !error && <p className="mt-8 text-center text-sm text-ink/45">Loading evidence…</p>}
      {cards && cards.length === 0 && <p className="mt-8 text-center text-sm text-ink/50">No evidence in the demo dataset for this combination.</p>}

      <div className="mt-5 columns-1 gap-5 md:columns-2">
        {cards?.map((c) => (
          <div key={c.type} className="mb-5 break-inside-avoid">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-700"><MessageCircleQuestion size={14} /> {QUESTIONS[c.type] ?? 'Parent concern'}</p>
            <ProofCard card={c} />
          </div>
        ))}
      </div>
    </div>
  )
}
