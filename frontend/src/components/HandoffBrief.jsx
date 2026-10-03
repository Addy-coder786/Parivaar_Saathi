import { BAND_STYLES, PRIORITY_STYLES, STATUS_LABELS, capitalize } from '../lib/labels'

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 py-1.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-900">{children}</dd>
    </div>
  )
}

function List({ items, empty = '—' }) {
  if (!items?.length) return <span className="text-slate-400">{empty}</span>
  return (
    <ul className="list-inside list-disc">
      {items.map((x) => <li key={x}>{x}</li>)}
    </ul>
  )
}

export default function HandoffBrief({ escalation, onStatus, compact = false }) {
  const b = escalation.brief
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900">Warm-handoff brief · Case #{escalation.id}</span>
          <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase ${PRIORITY_STYLES[escalation.priority]}`}>
            {escalation.priority} priority
          </span>
        </div>
        {escalation.status && (
          <span className="text-xs text-slate-500">{STATUS_LABELS[escalation.status] ?? escalation.status}</span>
        )}
      </div>
      <dl className="divide-y divide-slate-100 px-3">
        <Row label="Learner">{b.learner.goal} · {capitalize(b.learner.gender)} learner</Row>
        <Row label="Parent">{capitalize(b.parent)}</Row>
        <Row label="District / trade">{b.district} · {b.trade}</Row>
        <Row label="Resistance">
          <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${BAND_STYLES[b.resistance_band]}`}>
            {capitalize(b.resistance_band)} ({b.resistance_score})
          </span>
        </Row>
        <Row label="Trigger">{escalation.reason}</Row>
        <Row label="Top concerns"><List items={b.top_concerns} /></Row>
        <Row label="Evidence shown"><List items={b.evidence_shown} empty="None yet" /></Row>
        <Row label="Remaining"><List items={b.remaining_concerns} empty="None recorded" /></Row>
        {!compact && (
          <Row label="Parent said">
            <ul className="space-y-0.5">
              {b.parent_said.map((t, i) => <li key={i} className="italic text-slate-700">“{t}”</li>)}
            </ul>
          </Row>
        )}
        <Row label="Suggested action"><span className="font-medium">{b.suggested_action}</span></Row>
        {b.routed_to?.counsellor && (
          <Row label="Routed to">
            <span className="font-semibold">Counsellor {b.routed_to.counsellor}</span>
            <span className="text-slate-500"> — {b.routed_to.reason}</span>
            <span className="ml-1 rounded bg-amber-50 px-1 text-[10px] font-semibold text-amber-800">simulated routing</span>
          </Row>
        )}
      </dl>
      {onStatus && escalation.status !== 'closed' && (
        <div className="flex gap-2 border-t border-slate-100 px-3 py-2">
          {escalation.status === 'open' && (
            <button onClick={() => onStatus('in_progress')} className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
              Take case
            </button>
          )}
          <button onClick={() => onStatus('closed')} className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
            Close case
          </button>
        </div>
      )}
    </div>
  )
}
