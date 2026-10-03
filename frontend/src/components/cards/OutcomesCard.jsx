import { PhoneCall } from 'lucide-react'

// Reported outcomes from Feed C — answers of past trainees to the 90-second IVR micro-survey.
function Bar({ label, value, total, tone }) {
  const pct = total ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-ink/60">{label}</span>
        <span className="font-semibold tabular-nums text-ink">{value} of {total}</span>
      </div>
      <div className="mt-0.5 h-2 rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function OutcomesCard({ card, items }) {
  const s = card.survey
  if (!s) {
    return (
      <dl className="divide-y divide-ink/5 px-3">
        {items.map((it) => (
          <div key={it.label} className="flex justify-between gap-4 py-1.5 text-sm"><dt className="text-ink/55">{it.label}</dt><dd className="font-medium">{it.value}</dd></div>
        ))}
      </dl>
    )
  }
  const n = s.responses
  return (
    <div className="space-y-2 px-3 py-2">
      <p className="flex items-center gap-1.5 text-xs text-ink/60">
        <PhoneCall size={13} className="text-brand-600" /> {n} past trainees answered a 90-second IVR call
        {s.live_responses > 0 && <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-800">{s.live_responses} new in this demo</span>}
      </p>
      <Bar label="Working in this trade" value={s.in_trade} total={n} tone="bg-brand-500" />
      <Bar label="Doing other work" value={s.other_work} total={n} tone="bg-sky-400" />
      <Bar label="Would recommend the course" value={s.recommend} total={n} tone="bg-indigo-400" />
      <div className="grid grid-cols-2 gap-2 pt-1">
        {s.median_band_label && (
          <div className="rounded-lg bg-slate-50 px-2 py-1.5">
            <div className="text-[10.5px] text-ink/50">Typical take-home (median band)</div>
            <div className="text-sm font-bold text-ink">{s.median_band_label}<span className="text-xs font-normal text-ink/50"> / month</span></div>
          </div>
        )}
        {s.retention_pct != null && (
          <div className="rounded-lg bg-slate-50 px-2 py-1.5">
            <div className="text-[10.5px] text-ink/50">Still in home district</div>
            <div className="text-sm font-bold text-ink">{s.retention_pct}%</div>
          </div>
        )}
      </div>
      <p className="text-[11px] text-ink/50">Self-reported by past trainees; not a placement guarantee.</p>
    </div>
  )
}
