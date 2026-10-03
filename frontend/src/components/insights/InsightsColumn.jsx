import { Building2, ChevronRight, ClipboardList, ExternalLink, FileCheck2, GraduationCap, Headset, IndianRupee, Lightbulb, MapPin, MessageCircle, Radio, ShieldCheck, TrendingUp, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiGet } from '../../lib/api'
import { OBJECTION_LABELS, bandOf, capitalize, learnerVariant } from '../../lib/labels'
import Avatar from '../shell/Avatar'
import ResistanceGauge from './ResistanceGauge'

function joinLabels(items) {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
}

/** Deterministic one-paragraph read-out of the family state — no LLM involved. */
function insightText({ concerns, score, escalation, accepted }) {
  if (!concerns.length) return "Waiting for the parent's concerns. Each one is answered with local evidence, not persuasion."
  const labels = concerns.map((c) => OBJECTION_LABELS[c.category].toLowerCase())
  const parts = [`Parent is concerned about ${joinLabels(labels)}.`]
  if (concerns.some((c) => c.evidence)) parts.push('Evidence has been shown.')
  if (accepted) parts.push('Family is open to enrolment.')
  else if (escalation) parts.push(`Handed to a human counsellor (Case #${escalation.id}).`)
  else parts.push({ high: 'Still resistant.', medium: 'Still undecided.', low: 'Leaning positive.' }[bandOf(score)])
  return parts.join(' ')
}

function parentStance({ concerns, score, escalation, accepted }) {
  if (accepted) return { label: 'Open', cls: 'bg-brand-100 text-brand-800' }
  if (escalation) return { label: 'With counsellor', cls: 'bg-indigo-100 text-indigo-800' }
  if (!concerns.length) return { label: 'Listening', cls: 'bg-slate-100 text-slate-700' }
  return bandOf(score) === 'high' ? { label: 'Resistant', cls: 'bg-red-100 text-red-800' } : { label: 'Uncertain', cls: 'bg-amber-100 text-amber-800' }
}

const item = (card, prefix) => card.items.find((i) => i.label.startsWith(prefix))?.value

/** Turns a proof card that was actually shown in this session into a compact highlight tile. */
function tileFor(card) {
  switch (card.type) {
    case 'paisa_map':
      return { Icon: IndianRupee, title: 'Salary range', value: item(card, 'Entry-level')?.replace(' / month', ''), sub: 'Entry-level / month' }
    case 'job_radar':
      return { Icon: MapPin, title: 'Local jobs', value: `${card.total} opportunities`, sub: `within ${card.radius_km} km` }
    case 'safety': {
      const has = ['Female staff', 'CCTV', 'Transport'].filter((l) => item(card, l))
      return { Icon: ShieldCheck, title: card.title.startsWith('Beti') ? 'Beti Suraksha' : 'Safety at centre', value: has.join(' · '), sub: item(card, 'Centre') }
    }
    case 'roadmap':
      return card.steps
        ? { Icon: TrendingUp, title: 'Pragati Path', value: `NSQF ${card.steps[0].nsqf} → ${card.steps.length} steps`, sub: `to ${card.steps.at(-1).title}` }
        : { Icon: TrendingUp, title: 'Career path', value: `${card.items.length} steps`, sub: `to ${card.items.at(-1)?.value}` }
    case 'placement':
      return card.survey
        ? { Icon: GraduationCap, title: 'Past trainees', value: `${card.survey.in_trade} of ${card.survey.responses}`, sub: 'working in this trade (IVR survey)' }
        : { Icon: GraduationCap, title: 'Reported outcomes', value: card.items[0]?.value, sub: card.items[0]?.label }
    case 'distance':
      return { Icon: Building2, title: 'Nearest centre', value: item(card, 'Distance'), sub: item(card, 'Transport') }
    default:
      return { Icon: FileCheck2, title: card.title, value: card.items[0]?.value, sub: card.items[0]?.label }
  }
}

/** Lets the parent join this session from their own WhatsApp (simulator in demo; Twilio number when configured). */
function ParentChannel({ session, parentChannel }) {
  const [info, setInfo] = useState(null)
  useEffect(() => {
    apiGet(`/session/${session.id}/channels`).then(setInfo).catch(() => {})
  }, [session.id, parentChannel])
  const code = info?.join_code ?? `PS-${session.id.toUpperCase()}`
  const number = info?.twilio?.number?.replace(/[^\d]/g, '')
  return (
    <section className="card p-4">
      <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink"><MessageCircle size={18} className="text-[#008069]" /> Parent on WhatsApp</h3>
      {parentChannel || info?.linked ? (
        <p className="mt-2 rounded-xl bg-[#e7f7f1] p-3 text-[13px] text-[#075e54]">
          <b>Parent connected from WhatsApp.</b> Their messages appear here as Parent turns, and replies go back to their phone.
        </p>
      ) : (
        <>
          <p className="mt-1 text-xs text-ink/60">The parent can join this same session from their own phone by sending:</p>
          <div className="mt-2 rounded-xl border border-dashed border-[#008069]/40 bg-[#f0faf7] px-3 py-2 text-center font-mono text-sm font-bold tracking-wide text-[#075e54]">JOIN {code}</div>
        </>
      )}
      <div className="mt-2 flex flex-col gap-1.5">
        <a href={`#whatsapp?join=${code}`} target="_blank" rel="noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#008069] px-3 py-2 text-xs font-semibold text-white hover:bg-[#016d5a]">
          <ExternalLink size={14} /> Open parent's WhatsApp (simulator)
        </a>
        {number && (
          <a href={`https://wa.me/${number}?text=${encodeURIComponent(`JOIN ${code}`)}`} target="_blank" rel="noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#008069]/40 px-3 py-2 text-xs font-semibold text-[#008069] hover:bg-[#f0faf7]">
            Open in real WhatsApp
          </a>
        )}
      </div>
    </section>
  )
}

export default function InsightsColumn({ session, parentChannel, score, learnerGoal, concerns, accepted, escalation, shownEvidence, busy, onAskCounsellor, readAloud, onToggleReadAloud, canReadAloud }) {
  const state = { concerns, score, escalation, accepted }
  const stance = parentStance(state)
  const highlights = shownEvidence.slice(0, 3)
  const parentVariant = session.parent_relation
  return (
    <div className="flex flex-col gap-4">
      {/* Quick insights */}
      <section className="card p-4">
        <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink"><Lightbulb size={18} className="text-brand-600" /> Quick Insights</h3>
        <div className="mt-3 grid grid-cols-1 items-center gap-3 sm:grid-cols-[auto_1fr] xl:grid-cols-1">
          <ResistanceGauge score={score} />
          <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-[13px] leading-relaxed text-ink/80">
            <Lightbulb size={16} className="mb-1 text-amber-500" />
            {insightText(state)}
          </div>
        </div>
        <p className="mt-2 text-[10.5px] leading-snug text-ink/45">Prototype Resistance Index: a simple rule-based score, not a validated psychological measure.</p>
      </section>

      {/* Family dialogue state */}
      <section className="card p-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink"><Radio size={18} className="text-brand-600" /> Family Dialogue State</h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" /> Live
          </span>
        </div>
        <ul className="mt-3 divide-y divide-ink/5">
          <li className="flex items-center gap-3 py-2.5">
            <Avatar variant={learnerVariant(session.learner_gender)} size={38} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-brand-700">Learner</div>
              <div className="truncate text-xs text-ink/60">Goal: {learnerGoal ?? 'not stated yet'}</div>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${learnerGoal ? 'bg-brand-100 text-brand-800' : 'bg-slate-100 text-slate-700'}`}>{learnerGoal ? 'Positive' : 'Exploring'}</span>
          </li>
          <li className="flex items-center gap-3 py-2.5">
            <Avatar variant={parentVariant} size={38} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-rose-700">Parent <span className="font-normal text-ink/50">({capitalize(session.parent_relation)}{parentChannel ? ' · on WhatsApp' : ''})</span></div>
              <div className="truncate text-xs text-ink/60">
                {concerns.length ? `Concerns: ${concerns.map((c) => OBJECTION_LABELS[c.category]).join(', ')}` : 'No concerns raised yet'}
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stance.cls}`}>{stance.label}</span>
          </li>
        </ul>
        {concerns.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {concerns.map((c) => (
              <span key={c.category} className={`rounded-full border px-2 py-0.5 text-[11px] ${c.resolved ? 'border-brand-200 bg-brand-50 text-brand-800' : c.refusal ? 'border-red-200 bg-red-50 text-red-800' : 'border-ink/10 bg-white text-ink/70'}`}>
                {OBJECTION_LABELS[c.category]} · {c.resolved ? 'resolved' : c.refusal ? 'refused' : c.evidence ? 'evidence shown' : 'no evidence'}
              </span>
            ))}
          </div>
        )}
      </section>

      <ParentChannel session={session} parentChannel={parentChannel} />

      {/* Evidence highlights */}
      <section className="card p-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink"><FileCheck2 size={18} className="text-brand-600" /> Evidence Highlights</h3>
          <a href="#evidence" className="text-xs font-semibold text-indigo-600 hover:underline">View all</a>
        </div>
        {highlights.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-ink/10 p-4 text-center text-xs text-ink/50">Evidence shown to the family appears here.</p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {highlights.map((card) => {
              const t = tileFor(card)
              return (
                <div key={card.type} className="fade-up flex flex-col rounded-xl border border-ink/7 bg-white p-2.5 shadow-sm">
                  <span className="mb-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><t.Icon size={17} /></span>
                  <div className="text-[11px] font-bold leading-tight text-ink">{t.title}</div>
                  <div className="mt-0.5 text-[12px] font-semibold leading-tight text-ink/85">{t.value}</div>
                  <div className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-ink/50">{t.sub}</div>
                  <span className="mt-auto pt-1.5"><span className="inline-block rounded-full bg-amber-50 px-1.5 py-0.5 text-[9.5px] font-semibold text-amber-800">Shown · demo data</span></span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Next steps */}
      <section className="card p-4">
        <h3 className="flex items-center justify-between text-[15px] font-bold text-ink">
          <span className="flex items-center gap-2"><ClipboardList size={18} className="text-brand-600" /> Next Steps</span>
          <ChevronRight size={18} className="text-ink/30" />
        </h3>
        {escalation ? (
          <div className="mt-3 rounded-xl bg-indigo-50 p-3 text-[13px] text-indigo-900">
            <div className="font-semibold">Case #{escalation.id} is with a human counsellor ({escalation.priority} priority).</div>
            {escalation.brief?.remaining_concerns?.length > 0 && <div className="mt-1 text-xs">Remaining: {escalation.brief.remaining_concerns.join(', ')}</div>}
            {escalation.brief?.suggested_action && <div className="mt-1 text-xs text-indigo-800/80">Suggested: {escalation.brief.suggested_action}</div>}
          </div>
        ) : accepted ? (
          <div className="mt-3 rounded-xl bg-brand-50 p-3 text-[13px] text-brand-900">Family is open to enrolment. Next: a centre visit and admission details with a counsellor.</div>
        ) : (
          <div className="mt-3 flex gap-2 rounded-xl bg-indigo-50/70 p-3 text-[13px] text-indigo-900/80">
            <Headset size={18} className="mt-0.5 shrink-0 text-indigo-500" />
            If the parent's concern remains unresolved, we can connect the family with a human counsellor. The AI does not replace counsellors.
          </div>
        )}
        <button type="button" onClick={onAskCounsellor} disabled={busy || Boolean(escalation)}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:shadow-none">
          <Headset size={17} /> {escalation ? 'Counsellor requested' : 'Request Human Counsellor'}
        </button>
        {canReadAloud && (
          <button type="button" onClick={onToggleReadAloud} aria-pressed={readAloud}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-ink/10 px-4 py-2 text-xs font-medium text-ink/70 hover:bg-brand-50">
            {readAloud ? <Volume2 size={15} /> : <VolumeX size={15} />} Read replies aloud: {readAloud ? 'on' : 'off'}
          </button>
        )}
      </section>
    </div>
  )
}
