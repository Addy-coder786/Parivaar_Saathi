import { CheckCircle2, Headset, LayoutDashboard, TriangleAlert, Users } from 'lucide-react'
import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { apiGet, apiPatch, openEventSocket } from '../lib/api'
import { BAND_STYLES, OBJECTION_LABELS, PRIORITY_STYLES, STATUS_LABELS, capitalize, timeOf } from '../lib/labels'
import { INK, SERIES, heatStyle } from '../lib/viz'
import DemoBadge from './DemoBadge'
import HandoffBrief from './HandoffBrief'

const CATEGORIES = Object.keys(OBJECTION_LABELS)

// MapLibre is ~800 KB; load it only when the dashboard renders so the chat page stays light.
const DistrictMap = lazy(() => import('./DistrictMap'))

function BandPill({ band, score }) {
  return (
    <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${BAND_STYLES[band]}`}>
      {capitalize(band)} ({score})
    </span>
  )
}

function Kpi({ label, value, hint, tone = 'slate', Icon }) {
  const tones = {
    slate: ['text-ink', 'bg-brand-50 text-brand-600'],
    red: ['text-red-700', 'bg-red-50 text-red-600'],
    emerald: ['text-brand-700', 'bg-brand-50 text-brand-600'],
    amber: ['text-amber-700', 'bg-amber-50 text-amber-600'],
  }
  const [valueCls, iconCls] = tones[tone]
  return (
    <div className="card flex items-start gap-3 p-4">
      {Icon && <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconCls}`}><Icon size={21} /></span>}
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-ink/50">{label}</div>
        <div className={`mt-0.5 text-3xl font-extrabold ${valueCls}`}>{value ?? '—'}</div>
        {hint && <div className="mt-0.5 text-xs text-ink/50">{hint}</div>}
      </div>
    </div>
  )
}

function Panel({ title, subtitle, children, right }) {
  return (
    <section className="card overflow-hidden">
      <header className="flex items-start justify-between gap-2 border-b border-ink/5 px-5 py-3">
        <div>
          <h3 className="text-[15px] font-bold text-ink">{title}</h3>
          {subtitle && <p className="text-xs text-ink/50">{subtitle}</p>}
        </div>
        {right}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

const tooltipStyle = { fontSize: 12, borderRadius: 8, border: `1px solid ${INK.grid}` }

function ObjectionChart({ data }) {
  const rows = data.map((d) => ({ name: OBJECTION_LABELS[d.category], count: d.count }))
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 8 }} barCategoryGap={8}>
        <CartesianGrid horizontal={false} stroke={INK.grid} />
        <XAxis type="number" tick={{ fontSize: 11, fill: INK.muted }} axisLine={{ stroke: INK.axis }} tickLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={104} tick={{ fontSize: 12, fill: INK.secondary }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: '#f4f4f2' }} contentStyle={tooltipStyle} />
        <Bar dataKey="count" name="Objections" fill={SERIES[0]} maxBarSize={18} radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fill: INK.secondary }} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Short axis labels so six categories fit at phone width; the tooltip and legend keep the full names.
const SHORT_LABELS = { income: 'Income', employment: 'Career', safety: 'Safety', social_status: 'Status', distance: 'Distance', placement: 'Placement' }

function GenderChart({ data }) {
  const rows = data.map((d) => ({ name: OBJECTION_LABELS[d.category], short: SHORT_LABELS[d.category], Female: d.female, Male: d.male }))
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: -16 }} barGap={2} barCategoryGap={12}>
        <CartesianGrid vertical={false} stroke={INK.grid} />
        <XAxis dataKey="short" tick={{ fontSize: 10, fill: INK.secondary }} axisLine={{ stroke: INK.axis }} tickLine={false} interval={0} />
        <YAxis tick={{ fontSize: 11, fill: INK.muted }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip cursor={{ fill: '#f4f4f2' }} contentStyle={tooltipStyle} labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ''} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: INK.secondary }} />
        <Bar dataKey="Female" fill={SERIES[0]} maxBarSize={14} radius={[4, 4, 0, 0]} />
        <Bar dataKey="Male" fill={SERIES[1]} maxBarSize={14} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function DistrictHeat({ rows }) {
  const max = Math.max(1, ...rows.flatMap((r) => CATEGORIES.map((c) => r.counts[c] ?? 0)))
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-xs">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-1 pr-2 font-medium">District</th>
            {CATEGORIES.map((c) => <th key={c} className="px-1 py-1 text-center font-medium">{OBJECTION_LABELS[c]}</th>)}
            <th className="px-1 py-1 text-center font-medium">Sessions</th>
            <th className="px-1 py-1 text-center font-medium">High</th>
            <th className="py-1 pl-2 font-medium">Top concern</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.district}>
              <td className="py-0.5 pr-2 font-semibold text-slate-800">{r.district}</td>
              {CATEGORIES.map((c) => (
                <td key={c} className="p-0.5">
                  <div className="rounded px-1 py-1.5 text-center font-medium tabular-nums" style={heatStyle(r.counts[c] ?? 0, max)} title={`${r.district} · ${OBJECTION_LABELS[c]}: ${r.counts[c] ?? 0}`}>
                    {r.counts[c] ?? 0}
                  </div>
                </td>
              ))}
              <td className="px-1 text-center tabular-nums text-slate-700">{r.sessions}</td>
              <td className="px-1 text-center tabular-nums text-slate-700">{r.high_resistance}</td>
              <td className="pl-2 text-slate-800">{r.top_concern ? OBJECTION_LABELS[r.top_concern] : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EventRow({ ev, fresh }) {
  const flash = fresh ? 'animate-[flash_2s_ease-out]' : ''
  if (ev.type === 'survey_response') {
    return (
      <li className={`flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between ${flash}`}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-mono text-xs text-slate-400">{timeOf(ev.timestamp)}</span>
          <span className="font-semibold uppercase text-slate-900">{ev.district}</span>
          <span className="text-slate-600">{ev.trade}</span>
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
            {ev.automated ? `IVR survey round · ${ev.count} calls` : 'IVR survey answer'}
          </span>
        </div>
        <span className="text-xs text-slate-500">Feed C updated{ev.responses ? ` · ${ev.responses} responses` : ''}</span>
      </li>
    )
  }
  if (ev.type === 'channel_joined') {
    return (
      <li className={`flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2.5 text-sm ${flash}`}>
        <span className="font-mono text-xs text-slate-400">{timeOf(ev.timestamp)}</span>
        <span className="rounded-full bg-[#e7f7f1] px-2 py-0.5 text-xs font-medium text-[#075e54]">Parent joined a session from WhatsApp</span>
      </li>
    )
  }
  if (ev.type === 'escalation_created') {
    return (
      <li className={`flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between ${flash}`}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-mono text-xs text-slate-400">{timeOf(ev.timestamp)}</span>
          <span className="font-semibold uppercase text-slate-900">{ev.district}</span>
          <span className="text-slate-600">{ev.trade}</span>
          <span className="text-slate-600">{capitalize(ev.gender)}</span>
          <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase ${PRIORITY_STYLES[ev.priority]}`}>Escalated · {ev.priority}</span>
        </div>
        <span className="text-xs text-slate-500">Case #{ev.escalation_id} · {ev.reason}</span>
      </li>
    )
  }
  if (ev.type === 'family_decision') {
    return (
      <li className={`flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between ${flash}`}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-mono text-xs text-slate-400">{timeOf(ev.timestamp)}</span>
          <span className="font-semibold uppercase text-slate-900">{ev.district}</span>
          <span className="text-slate-600">{ev.trade}</span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Family open to enrolment</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          Resistance <BandPill band={ev.before_band} score={ev.before_score} /> → <BandPill band={ev.after_band} score={ev.after_score} />
        </div>
      </li>
    )
  }
  return (
    <li className={`flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between ${flash}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="font-mono text-xs text-slate-400">{timeOf(ev.timestamp)}</span>
        <span className="font-semibold uppercase text-slate-900">{ev.district}</span>
        <span className="text-slate-600">{ev.trade}</span>
        <span className="text-slate-600">{capitalize(ev.gender)}</span>
        {ev.objection === 'refusal' ? (
          <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-medium text-white">Refusal · no specific concern</span>
        ) : (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">{OBJECTION_LABELS[ev.objection] ?? ev.objection}</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        Resistance <BandPill band={ev.before_band} score={ev.before_score} /> → <BandPill band={ev.after_band} score={ev.after_score} />
      </div>
    </li>
  )
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [escalations, setEscalations] = useState([])
  const [openCase, setOpenCase] = useState(null)
  const [events, setEvents] = useState([])
  const [wsStatus, setWsStatus] = useState('connecting')
  const [freshKey, setFreshKey] = useState(null)
  const [lastLive, setLastLive] = useState(null) // latest live event, so the map can fly to its district
  const [error, setError] = useState(null)

  const refresh = useCallback(() => {
    apiGet('/dashboard/summary').then(setSummary).catch((e) => setError(`Could not load summary (${e.message})`))
    apiGet('/escalations').then((r) => setEscalations(r.escalations)).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    refresh()
    apiGet('/events/recent?limit=20')
      .then((r) => !cancelled && setEvents((live) => [...live, ...r.events]))
      .catch((e) => !cancelled && setError(`Could not load events (${e.message})`))
    const ws = openEventSocket((ev) => {
      if (ev.type === 'reset') {
        setEvents([])
        refresh()
        return
      }
      if (['resistance_update', 'escalation_created', 'family_decision', 'survey_response', 'channel_joined'].includes(ev.type)) {
        setEvents((prev) => [ev, ...prev].slice(0, 60))
        setFreshKey(ev.timestamp + ev.type)
        if (['resistance_update', 'escalation_created', 'family_decision'].includes(ev.type)) setLastLive(ev)
      }
      refresh()
    }, setWsStatus)
    return () => {
      cancelled = true
      ws.close()
    }
  }, [refresh])

  async function setStatus(id, status) {
    await apiPatch(`/escalations/${id}`, { status })
    setOpenCase(null)
    refresh()
  }

  const k = summary?.kpis
  const queue = escalations.filter((e) => e.status !== 'closed')

  return (
    <div className="mx-auto max-w-[1400px] space-y-5" data-view="dashboard">
      <div className="card relative flex flex-wrap items-center justify-between gap-3 overflow-hidden bg-gradient-to-r from-brand-700 to-brand-500 p-5 text-white">
        <svg className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 opacity-15" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="none" stroke="#fff" strokeWidth="3" /><circle cx="50" cy="50" r="30" fill="none" stroke="#fff" strokeWidth="3" /></svg>
        <div className="relative">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold"><LayoutDashboard size={24} /> Resistance Intelligence</h1>
          <p className="mt-1 text-sm text-white/85">
            Why families hesitate — by district, trade, gender and concern.{' '}
            <span className="ml-1 inline-flex items-center gap-1.5 align-middle"><DemoBadge /> <span className="text-xs">Includes simulated history sessions.</span></span>
          </p>
        </div>
        <span className={`relative rounded-full px-3 py-1 text-xs font-bold ${wsStatus === 'connected' ? 'bg-white text-brand-700' : 'bg-white/20 text-white'}`}>
          {wsStatus === 'connected' ? '● Live' : `○ ${wsStatus}`}
        </span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi Icon={Users} label="Sessions" value={k?.total_sessions} hint={`${k?.live_sessions ?? 0} live in this demo`} />
        <Kpi Icon={TriangleAlert} label="High resistance" value={k?.high_resistance} hint="Families currently at index ≥ 70" tone="red" />
        <Kpi Icon={CheckCircle2} label="Objections resolved" value={k ? `${k.resolved_objections}/${k.total_objections}` : null} hint="Evidence shown, not raised again" tone="emerald" />
        <Kpi Icon={Headset} label="Open escalations" value={k?.open_escalations} hint="Awaiting a human counsellor" tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Objection distribution" subtitle={summary?.top_concern ? `Top concern overall: ${OBJECTION_LABELS[summary.top_concern]}` : undefined}>
          {summary && <ObjectionChart data={summary.by_objection} />}
        </Panel>
        <Panel title="Objections by learner gender" subtitle="Which concerns are raised for daughters vs sons">
          {summary && <GenderChart data={summary.by_gender} />}
        </Panel>
      </div>

      <Panel title="District resistance map" subtitle="Where families hesitate — and the opportunities near them. Click a district to zoom in; hover points for key factors.">
        {summary ? (
          <Suspense fallback={<div className="flex h-[460px] items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-400">Loading map…</div>}>
            <DistrictMap rows={summary.by_district} liveEvent={lastLive} />
          </Suspense>
        ) : (
          <div className="h-[460px] rounded-lg bg-slate-100" />
        )}
      </Panel>

      <Panel title="District × concern" subtitle="Objection counts per district — darker is more. Hover a cell for detail.">
        {summary && <DistrictHeat rows={summary.by_district} />}
        {summary && (
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.by_trade.map((t) => (
              <span key={t.trade} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-700">
                <span className="font-semibold">{t.trade}</span> · {t.total} objections
                {t.top_concern && <span className="text-slate-500"> · top: {OBJECTION_LABELS[t.top_concern]}</span>}
              </span>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Live event feed" subtitle="Every parent objection becomes an anonymised event; IVR survey answers and WhatsApp joins appear too">
          {events.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Waiting for objections… start a family session in another tab.</p>
          ) : (
            <ul className="-mx-4 -my-4 max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
              {events.map((ev, i) => <EventRow key={`${ev.timestamp}-${ev.type}-${i}`} ev={ev} fresh={ev.timestamp + ev.type === freshKey} />)}
            </ul>
          )}
        </Panel>

        <Panel title="Counsellor queue" subtitle="Unresolved cases with a warm-handoff brief, routed by district, language and caseload (simulated pool)" right={<span className="text-xs text-slate-500">{queue.length} open</span>}>
          {queue.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No open cases.</p>
          ) : (
            <ul className="-mx-4 -my-4 max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
              {queue.map((e) => (
                <li key={e.id} className="px-4 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <span className="font-semibold text-slate-900">Case #{e.id}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase ${PRIORITY_STYLES[e.priority]}`}>{e.priority}</span>
                      <span className="text-slate-600">{capitalize(e.learner_gender)} learner · {e.trade} · {e.district}</span>
                      <span className="text-xs text-slate-500">{STATUS_LABELS[e.status]}</span>
                      {e.counsellor_code && <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-700" title={e.routing}>→ {e.counsellor_code}</span>}
                    </div>
                    <button onClick={() => setOpenCase(openCase === e.id ? null : e.id)} className="rounded border border-emerald-600 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50">
                      {openCase === e.id ? 'Hide' : 'View case'}
                    </button>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {e.reason} · remaining: {e.brief.remaining_concerns.join(', ') || '—'}
                  </p>
                  {openCase === e.id && (
                    <div className="mt-2">
                      <HandoffBrief escalation={e} onStatus={(s) => setStatus(e.id, s)} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
