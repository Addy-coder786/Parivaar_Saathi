import { useState } from 'react'

// Stylised radar: employers plotted by distance on concentric rings (angle is decorative, distance is real).
function Radar({ employers, radius }) {
  const size = 160
  const c = size / 2
  const rMax = c - 8
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-40 w-40 shrink-0" role="img" aria-label={`${employers.length} employers within ${radius} km`}>
      {[1 / 3, 2 / 3, 1].map((f) => (
        <circle key={f} cx={c} cy={c} r={rMax * f} fill="none" stroke="#e1e0d9" strokeWidth="1" />
      ))}
      <line x1={c} y1={8} x2={c} y2={size - 8} stroke="#e1e0d9" strokeWidth="1" />
      <line x1={8} y1={c} x2={size - 8} y2={c} stroke="#e1e0d9" strokeWidth="1" />
      <circle cx={c} cy={c} r="5" fill="#0b0b0b" />
      <text x={c + 7} y={c - 6} fontSize="8" fill="#52514e">home</text>
      {employers.map((e, i) => {
        const angle = (i * 137.5 * Math.PI) / 180
        const r = (e.distance_km / radius) * rMax
        return (
          <circle key={e.name} cx={c + r * Math.cos(angle)} cy={c + r * Math.sin(angle)} r="4.5" fill="#2a78d6" stroke="#ffffff" strokeWidth="2">
            <title>{`${e.name} — ${e.role}, ${e.distance_km} km`}</title>
          </circle>
        )
      })}
      <text x={c + rMax - 2} y={c - 3} fontSize="8" textAnchor="end" fill="#898781">{radius} km</text>
    </svg>
  )
}

export default function JobRadarCard({ card }) {
  const [open, setOpen] = useState(false)
  const shown = open ? card.employers : card.employers.slice(0, 4)
  return (
    <div className="px-3 py-2">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        <Radar employers={card.employers} radius={card.radius_km} />
        <div className="flex-1">
          <div className="text-3xl font-bold text-slate-900">{card.total}</div>
          <div className="text-sm text-slate-600">opportunities within {card.radius_km} km</div>
          {card.items.slice(1).map((it) => (
            <p key={it.label} className="mt-1.5 text-xs text-slate-600">
              <span className="text-slate-500">{it.label}:</span> <span className="font-medium text-slate-800">{it.value}</span>
            </p>
          ))}
        </div>
      </div>
      <ul className="mt-2 divide-y divide-slate-100 text-xs">
        {shown.map((e) => (
          <li key={e.name} className="flex flex-col gap-0.5 py-1 sm:flex-row sm:justify-between sm:gap-2">
            <span className="text-slate-800">{e.name}</span>
            <span className="text-slate-500 sm:shrink-0">{e.role} · {e.distance_km} km</span>
          </li>
        ))}
      </ul>
      {card.employers.length > 4 && (
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-1 text-xs font-medium text-emerald-700 hover:underline">
          {open ? 'Show fewer' : `Show all ${card.employers.length} employers`}
        </button>
      )}
    </div>
  )
}
