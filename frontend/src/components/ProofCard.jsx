import { ChevronDown, ChevronUp, FileCheck2, Info } from 'lucide-react'
import { useState } from 'react'
import DemoBadge from './DemoBadge'
import JobRadarCard from './cards/JobRadarCard'
import OutcomesCard from './cards/OutcomesCard'
import PaisaMapCard from './cards/PaisaMapCard'
import RoadmapCard from './cards/RoadmapCard'
import SafetyCard from './cards/SafetyCard'

// Generic label/value table — fallback for any card type without a specialised body.
export function ItemsTable({ items }) {
  return (
    <dl className="divide-y divide-ink/5 px-3">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-0.5 py-1.5 text-sm sm:flex-row sm:justify-between sm:gap-4">
          <dt className="text-ink/55">{item.label}</dt>
          <dd className="font-medium text-ink sm:text-right">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

const BODIES = { job_radar: JobRadarCard, paisa_map: PaisaMapCard, safety: SafetyCard, roadmap: RoadmapCard, placement: OutcomesCard }

// Outcome Data Engine feeds (see the Data Feeds view); every one is simulated in this prototype.
const FEED_LABELS = { A: 'Feed A · centre records', B: 'Feed B · wage quintiles', C: 'Feed C · IVR survey', J: 'Job listings' }

export default function ProofCard({ card }) {
  const [showSource, setShowSource] = useState(false)
  const Body = BODIES[card.type] ?? ItemsTable
  return (
    <div className="fade-up mt-2 overflow-hidden rounded-xl border border-ink/8 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-3">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white">
          <FileCheck2 size={14} /> Evidence Card
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          {card.feeds?.map((f) => (
            <a key={f} href="#feeds" className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600 hover:bg-slate-200" title="Where this card's data comes from (simulated feed)">
              {FEED_LABELS[f] ?? f}
            </a>
          ))}
          {card.demo && <DemoBadge />}
        </span>
      </div>
      <h4 className="px-3 pb-1 pt-2 text-[15px] font-bold text-ink">{card.title}</h4>
      <Body card={card} items={card.items} />
      {card.note && <p className="flex items-start gap-1.5 px-3 pb-2 text-xs text-ink/55"><Info size={13} className="mt-0.5 shrink-0" />{card.note}</p>}
      <div className="border-t border-ink/5 px-3 py-2">
        <button type="button" onClick={() => setShowSource((v) => !v)} aria-expanded={showSource}
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline">
          View source details {showSource ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showSource && (
          <p className="mt-1 text-xs text-ink/55">
            {card.source} · {card.as_of}
          </p>
        )}
      </div>
    </div>
  )
}
