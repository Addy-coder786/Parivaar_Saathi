import { BAND_STYLES, bandOf, capitalize } from '../../lib/labels'

// Semicircle gauge for the Prototype Resistance Index (0–100). Arc colour follows the band.
const BAND_COLOR = { high: '#e03131', medium: '#f59f00', low: '#1f9460' }

export default function ResistanceGauge({ score }) {
  const band = bandOf(score)
  const r = 54
  const c = Math.PI * r // half circumference
  const pct = Math.max(0, Math.min(100, score)) / 100
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 140 84" className="w-40" role="img" aria-label={`Prototype Resistance Index ${score}, ${band}`}>
        <path d="M16 74a54 54 0 0 1 108 0" fill="none" stroke="#e9eeeb" strokeWidth="14" strokeLinecap="round" />
        <path d="M16 74a54 54 0 0 1 108 0" fill="none" stroke={BAND_COLOR[band]} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`} style={{ transition: 'stroke-dasharray 700ms ease, stroke 400ms ease' }} />
        <text x="70" y="68" textAnchor="middle" className="fill-ink" style={{ fontSize: 30, fontWeight: 800 }}>{score}</text>
      </svg>
      <div className="-mt-1 text-sm font-semibold text-ink">Resistance Index</div>
      <span className={`mt-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold ${BAND_STYLES[band]}`}>{capitalize(band)}</span>
    </div>
  )
}
