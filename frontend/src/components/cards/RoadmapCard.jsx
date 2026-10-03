import { GraduationCap } from 'lucide-react'

// Pragati Path — the career staircase. Each step climbs; NSQF levels are explained in school/college terms
// so a parent can compare them with a degree. Answers "Is there a future after this course?"
export default function RoadmapCard({ card, items }) {
  const steps = card.steps
  if (!steps) {
    // Older card shape: plain list of steps.
    return (
      <ol className="flex flex-wrap items-center gap-y-2 px-3 py-2">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-center">
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-800">{it.value}</span>
            {i < items.length - 1 && <span aria-hidden className="mx-1 text-slate-400">→</span>}
          </li>
        ))}
      </ol>
    )
  }
  const degree = items.find((i) => i.label === 'Degree route')
  return (
    <div className="px-3 py-2">
      {card.question && <p className="mb-2 text-xs italic text-ink/50">“{card.question}”</p>}
      <ol className="flex flex-col-reverse gap-1.5" aria-label="Career steps, lowest first">
        {steps.map((s, i) => (
          <li key={s.title} className="flex items-stretch gap-2">
            <div className="flex w-10 shrink-0 flex-col items-center justify-end">
              {/* staircase riser: taller for higher steps */}
              <span className="w-full rounded-t-md bg-gradient-to-t from-brand-500 to-brand-300" style={{ height: `${10 + i * 7}px` }} aria-hidden="true" />
            </div>
            <div className={`flex-1 rounded-lg border px-2.5 py-1.5 ${i === steps.length - 1 ? 'border-brand-200 bg-brand-50' : 'border-ink/7 bg-white'}`}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-[11px] font-bold text-ink/40">Step {i + 1}</span>
                <span className="text-[13px] font-semibold text-ink">{s.title}</span>
                {s.nsqf && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10.5px] font-semibold text-indigo-800">
                    <GraduationCap size={11} /> NSQF {s.nsqf} ≈ {s.equivalent}
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11.5px] text-ink/60">
                {s.earning && <span className="font-medium text-ink/80">{s.earning}</span>}
                {s.when && <span>{s.when}</span>}
                {s.how && <span className="italic">{s.how}</span>}
              </div>
            </div>
          </li>
        ))}
      </ol>
      {degree && (
        <p className="mt-2 rounded-lg bg-indigo-50/70 px-2.5 py-1.5 text-[11.5px] text-indigo-900">
          <span className="font-semibold">Degree later?</span> {degree.value}.
        </p>
      )}
    </div>
  )
}
