import { X } from 'lucide-react'
import { NAV } from '../../lib/nav'
import Avatar from './Avatar'


function NavList({ view, sessionActive, onNavigate }) {
  return (
    <ul className="space-y-1">
      {NAV.map(({ view: v, label, Icon, live, group }) => {
        const active = view === v
        return (
          <li key={v}>
            {group && <div className="mb-1 mt-4 px-4 text-[10.5px] font-bold uppercase tracking-wider text-ink/35">{group}</div>}
            <a href={`#${v}`} onClick={onNavigate} aria-current={active ? 'page' : undefined}
              className={`group flex items-center gap-3 rounded-xl px-4 py-2.5 text-[15px] font-medium transition-all ${active ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25' : 'text-ink/75 hover:bg-white hover:text-brand-700 hover:shadow-sm'}`}>
              <Icon size={21} strokeWidth={1.9} className={active ? '' : 'text-ink/55 group-hover:text-brand-600'} />
              <span className="flex-1">{label}</span>
              {live && sessionActive && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${active ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700'}`}>Live</span>
              )}
            </a>
          </li>
        )
      })}
    </ul>
  )
}

function FamilyIllustration() {
  return (
    <div className="relative mx-auto flex h-28 w-48 items-end justify-center">
      <div className="absolute inset-x-2 bottom-0 h-16 rounded-t-[60px] bg-gradient-to-t from-brand-100 to-brand-50" />
      <Avatar variant="learner-male" size={64} ring className="relative z-10 -mr-3 mb-1" />
      <Avatar variant="mother" size={70} ring className="relative z-20 mb-3" />
      <Avatar variant="father" size={64} ring className="relative z-10 -ml-3 mb-1" />
    </div>
  )
}

export default function Sidebar({ view, sessionActive, open, onClose }) {
  const body = (
    <div className="flex h-full flex-col">
      <NavList view={view} sessionActive={sessionActive} onNavigate={onClose} />
      <div className="mt-auto pt-8">
        <FamilyIllustration />
        <p className="mt-3 text-center font-[cursive] text-xl leading-tight text-ink/80" style={{ fontFamily: '"Segoe Script", "Bradley Hand", cursive' }}>
          Sahi Jaankari,<br />Sahi Faisla
        </p>
        <svg viewBox="0 0 160 12" className="mx-auto mt-1 h-3 w-36" aria-hidden="true"><path d="M4 9C50 2 110 2 156 6" fill="none" stroke="#1f9460" strokeWidth="3" strokeLinecap="round" /></svg>
      </div>
    </div>
  )
  return (
    <>
      <aside className="sticky top-[73px] hidden h-[calc(100vh-73px)] w-64 shrink-0 overflow-y-auto border-r border-ink/5 bg-gradient-to-b from-white to-brand-50/40 px-4 py-6 lg:block">
        {body}
      </aside>
      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="absolute inset-0 bg-ink/30" onClick={onClose} aria-label="Close navigation" />
          <div className="fade-up absolute inset-y-0 left-0 w-72 overflow-y-auto bg-white px-4 py-5 shadow-2xl">
            <div className="mb-4 flex justify-end">
              <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-brand-50" aria-label="Close navigation"><X size={20} /></button>
            </div>
            {body}
          </div>
        </div>
      )}
    </>
  )
}
