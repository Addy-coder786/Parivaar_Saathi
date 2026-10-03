const rs = (n) => `₹${n.toLocaleString('en-IN')}`

// Feed B: where the trade's ladder sits inside the district's earnings spread (P20–P80) for its industry.
function Quintiles({ q }) {
  const lo = q.p20 * 0.8
  const hi = q.p80 * 1.1
  const pos = (v) => `${((v - lo) / (hi - lo)) * 100}%`
  return (
    <div className="mx-3 mb-2 rounded-lg border border-ink/7 bg-slate-50/70 px-3 py-2">
      <div className="text-[11px] font-semibold text-ink/70">
        District earnings spread · {q.nic_label} (NIC {q.nic}) <span className="font-normal text-ink/45">· Feed B, simulated</span>
      </div>
      <div className="relative mt-5 h-2.5 rounded-full bg-slate-200" role="img"
        aria-label={`Middle 60% earn ${rs(q.p20)} to ${rs(q.p80)} a month; middle band ${rs(q.p40)} to ${rs(q.p60)}`}>
        <span className="absolute inset-y-0 rounded-full bg-sky-300" style={{ left: pos(q.p20), right: `calc(100% - ${pos(q.p80)})` }} />
        <span className="absolute inset-y-0 rounded-full bg-sky-600" style={{ left: pos(q.p40), right: `calc(100% - ${pos(q.p60)})` }} />
        {['p20', 'p40', 'p60', 'p80'].map((k) => (
          <span key={k} className="absolute -top-4 -translate-x-1/2 text-[9.5px] tabular-nums text-ink/55" style={{ left: pos(q[k]) }}>
            {(q[k] / 1000).toFixed(q[k] % 1000 ? 1 : 0)}k
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 text-[10.5px] text-ink/55">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-sky-300" />middle 60% (P20–P80)</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-sky-600" />middle band (P40–P60)</span>
      </div>
    </div>
  )
}

// Wage progression as a staircase: entry → experienced → supervisor → self-employed.
export default function PaisaMapCard({ card, items }) {
  const ladder = items.filter((it) => !it.label.startsWith('Middle 60%'))
  return (
    <>
      <ol className="px-3 py-2">
        {ladder.map((it, i) => (
          <li key={it.label} className="flex items-stretch gap-3">
            <div className="flex flex-col items-center">
              <span className="mt-1 h-3 w-3 rounded-full border-2 border-white bg-[#2a78d6] shadow-[0_0_0_1px_#2a78d6]" />
              {i < ladder.length - 1 && <span className="w-0.5 flex-1 bg-slate-200" />}
            </div>
            <div className="pb-3">
              <div className="text-xs text-slate-500">{it.label}</div>
              <div className="text-sm font-semibold text-slate-900">{it.value}</div>
            </div>
          </li>
        ))}
      </ol>
      {card.quintiles && <Quintiles q={card.quintiles} />}
    </>
  )
}
