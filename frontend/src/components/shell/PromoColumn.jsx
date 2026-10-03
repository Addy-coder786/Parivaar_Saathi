import { BarChart3, FileCheck2, Headset, ShieldCheck, Sprout, Users } from 'lucide-react'

// Right-edge value strip from the reference design. Wording kept to what the prototype actually does.
const POINTS = [
  { Icon: FileCheck2, text: 'Source-labelled career & local job data' },
  { Icon: ShieldCheck, text: 'Safety information for girls & women' },
  { Icon: Users, text: 'Parent + learner together in one session' },
  { Icon: Headset, text: 'Escalation to human counsellors' },
  { Icon: BarChart3, text: 'Insights for better policy decisions' },
]

export default function PromoColumn() {
  return (
    <aside className="sticky top-[97px] hidden h-fit w-60 shrink-0 overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-b from-brand-50 to-white p-5 2xl:block">
      <Sprout size={34} className="text-brand-500" strokeWidth={1.6} />
      <h3 className="mt-2 text-xl font-extrabold leading-tight text-brand-700">Building<br />Brighter Futures</h3>
      <ul className="mt-5 space-y-4">
        {POINTS.map(({ Icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-[13px] leading-snug text-ink/70">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm ring-1 ring-brand-100"><Icon size={17} /></span>
            <span className="pt-1">{text}</span>
          </li>
        ))}
      </ul>
      <p className="mt-8 -rotate-6 text-center text-xl text-ink/75" style={{ fontFamily: '"Segoe Script", "Bradley Hand", cursive' }}>Sahi Jaankari,<br />Sahi Faisla</p>
      <svg viewBox="0 0 160 14" className="mx-auto mt-1 h-3.5 w-32 -rotate-6" aria-hidden="true">
        <path d="M4 10C50 2 110 2 156 6" fill="none" stroke="#f59f00" strokeWidth="3" strokeLinecap="round" />
        <path d="M10 13C55 6 110 6 150 9" fill="none" stroke="#1f9460" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </aside>
  )
}
