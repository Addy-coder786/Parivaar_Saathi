import { LayoutDashboard, Menu, ShieldAlert, Sparkles, Users } from 'lucide-react'
import Logo from './Logo'

export default function AppHeader({ view, meta, onMenu }) {
  const tab = (href, label, Icon, active) => (
    <a href={href}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25' : 'text-ink/80 hover:bg-brand-50'}`}>
      <Icon size={17} strokeWidth={2.2} /> <span className="hidden sm:inline">{label}</span>
    </a>
  )
  const ai = meta?.mode === 'llm'
  const offline = meta?.mode === 'offline'
  return (
    <header className="sticky top-0 z-30 border-b border-ink/5 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-3 sm:px-6">
        <button type="button" onClick={onMenu} className="rounded-lg p-2 text-ink/70 hover:bg-brand-50 lg:hidden" aria-label="Open navigation">
          <Menu size={22} />
        </button>
        <Logo />
        <div className="ml-4 hidden items-center gap-2 border-l border-ink/10 pl-4 text-xs text-ink/55 xl:flex">
          <span>Better Careers</span><span className="text-ink/20">|</span><span>Stronger Families</span><span className="text-ink/20">|</span><span>Brighter Future</span>
        </div>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-800"
            title="Demonstration dataset — the production version is designed to connect authorised government/data-provider interfaces.">
            <ShieldAlert size={13} /> Demo data
          </span>
          {meta && (
            <span title={ai ? `Model: ${meta.model}` : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${ai ? 'bg-indigo-600 text-white' : offline ? 'bg-red-600 text-white' : 'bg-ink/5 text-ink/70'}`}>
              <Sparkles size={13} /> {ai ? 'AI mode' : offline ? 'Backend offline' : 'Demo mode · no LLM'}
            </span>
          )}
        </div>

        <nav className="ml-auto flex items-center gap-1 md:ml-4" aria-label="Main">
          {tab('#session', 'Family Session', Users, view !== 'dashboard')}
          {tab('#dashboard', 'Admin Dashboard', LayoutDashboard, view === 'dashboard')}
        </nav>
      </div>
    </header>
  )
}
