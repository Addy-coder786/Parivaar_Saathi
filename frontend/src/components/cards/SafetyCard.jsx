// Beti Suraksha / centre safety card. Evidence fields only — never invented.
const CHECK_FIELDS = ['Female staff', 'CCTV', 'Transport', 'Training hours', 'Emergency contact']
// Feed A: what the (simulated) certification / training-partner audit record says about the centre.
const RECORD_FIELDS = ['Certified last batch', 'Average attendance (biometric log)', 'Training-partner audit']

export default function SafetyCard({ items }) {
  const byLabel = Object.fromEntries(items.map((i) => [i.label, i.value]))
  const record = RECORD_FIELDS.filter((f) => byLabel[f])
  return (
    <div className="px-3 py-2">
      <p className="text-sm text-slate-700">{byLabel.Centre}</p>
      <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {CHECK_FIELDS.filter((f) => byLabel[f]).map((f) => (
          <li key={f} className="flex gap-2 rounded-md bg-emerald-50 px-2 py-1.5 text-xs">
            <span aria-hidden className="font-bold text-emerald-700">✓</span>
            <span>
              <span className="font-semibold text-slate-800">{f}: </span>
              <span className="text-slate-700">{byLabel[f]}</span>
            </span>
          </li>
        ))}
      </ul>
      {record.length > 0 && (
        <div className="mt-2 rounded-md border border-ink/7 px-2 py-1.5">
          <div className="text-[11px] font-semibold text-ink/70">Centre record <span className="font-normal text-ink/45">· Feed A, simulated</span></div>
          <dl className="mt-1 grid grid-cols-1 gap-x-3 gap-y-0.5 text-xs sm:grid-cols-3">
            {record.map((f) => (
              <div key={f}>
                <dt className="text-[10.5px] text-ink/50">{f}</dt>
                <dd className="font-semibold text-ink/85">{byLabel[f]}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {byLabel.Verification && <p className="mt-2 text-xs text-amber-800">⚠ {byLabel.Verification}</p>}
    </div>
  )
}
