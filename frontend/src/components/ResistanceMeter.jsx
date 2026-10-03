import { BAND_LABELS, BAND_STYLES } from '../lib/labels'

function band(score) {
  return score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low'
}

export default function ResistanceMeter({ score, previous }) {
  const b = band(score)
  const barColor = b === 'high' ? 'bg-red-500' : b === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Prototype Resistance Index</h3>
        <span className="text-2xl font-bold tabular-nums text-slate-900">{score}</span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full ${barColor} transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      <div className={`mt-2 inline-block rounded border px-2 py-0.5 text-xs font-medium ${BAND_STYLES[b]}`}>
        {BAND_LABELS[b]}
      </div>
      {previous && (
        <p className="mt-2 text-xs text-slate-500">
          Last change: <span className="font-medium">{BAND_LABELS[previous.from].split(' —')[0]}</span> ({previous.peak})
          {' → '}
          <span className="font-medium">{BAND_LABELS[previous.to].split(' —')[0]}</span> ({previous.after})
        </p>
      )}
      <p className="mt-2 text-[11px] leading-snug text-slate-400">
        Simple rule-based prototype score — not a validated psychological measure.
      </p>
    </div>
  )
}
