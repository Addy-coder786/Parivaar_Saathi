import { useEffect, useState } from 'react'
import Dashboard from './components/Dashboard'
import FamilyChat from './components/FamilyChat'
import SessionSetup from './components/SessionSetup'
import AppHeader from './components/shell/AppHeader'
import PromoColumn from './components/shell/PromoColumn'
import Sidebar from './components/shell/Sidebar'
import { apiGet, apiPost } from './lib/api'
import { DEMO_SESSION } from './lib/demoScript'
import { NAV } from './lib/nav'
import { setServerSpeech } from './lib/speech'
import DataFeeds from './pages/DataFeeds'
import EvidenceHub from './pages/EvidenceHub'
import IvrSurvey from './pages/IvrSurvey'
import JobsPage from './pages/JobsPage'
import WhatsAppSim from './pages/WhatsAppSim'

const VIEWS = new Set(NAV.map((n) => n.view))

// Hash-based views (#session, #career, #evidence, #safety, #jobs, #dashboard) so the dashboard can be
// opened in a second browser tab. "#chat" is kept as an alias for older links.
// A view may carry parameters, e.g. "#whatsapp?join=PS-1A2B3C4D".
function useHashView() {
  const read = () => {
    const [h, query = ''] = window.location.hash.replace('#', '').split('?')
    return { view: VIEWS.has(h) ? h : 'session', params: new URLSearchParams(query) }
  }
  const [state, setState] = useState(read)
  useEffect(() => {
    const onHash = () => setState(read())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return state
}

export default function App() {
  const { view, params } = useHashView()
  const [session, setSession] = useState(null)
  const [demo, setDemo] = useState(false)
  const [demoError, setDemoError] = useState(null)
  const [meta, setMeta] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    apiGet('/meta')
      .then((m) => { setMeta(m); setServerSpeech(m.voice?.tts === 'bhashini') })
      .catch(() => setMeta({ mode: 'offline' }))
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [view])

  async function startDemo() {
    setDemoError(null)
    try {
      // The scripted demo always runs on the deterministic path, even when an LLM key is configured.
      setSession(await apiPost('/session', { ...DEMO_SESSION, use_llm: false }))
      setDemo(true)
    } catch (e) {
      setDemoError(`Could not start demo (${e.message})`)
    }
  }

  function endSession() {
    setSession(null)
    setDemo(false)
  }

  return (
    <div className="app-shell min-h-screen bg-canvas text-ink">
      <AppHeader view={view} meta={meta} onMenu={() => setMenuOpen(true)} />
      <div className="mx-auto flex max-w-[1800px]">
        <Sidebar view={view} sessionActive={Boolean(session)} open={menuOpen} onClose={() => setMenuOpen(false)} />
        <main className="min-w-0 flex-1 px-3 py-6 sm:px-6">
          {/* Session and dashboard stay mounted so switching views keeps the chat history and the live socket. */}
          <div hidden={view !== 'session'}>
            <div className="flex gap-5">
              <div className="min-w-0 flex-1">
                {session ? (
                  <FamilyChat key={session.id} session={session} demo={demo} onEnd={endSession} />
                ) : (
                  <SessionSetup meta={meta} onStart={(s) => { setDemo(false); setSession(s) }} onDemo={startDemo} demoError={demoError} />
                )}
              </div>
              {session && <PromoColumn />}
            </div>
          </div>
          <div hidden={view !== 'dashboard'}>
            <Dashboard />
          </div>
          {(view === 'evidence' || view === 'career' || view === 'safety') && (
            <EvidenceHub key={view} preset={view} meta={meta} defaults={session} />
          )}
          {view === 'jobs' && <JobsPage defaults={session} />}
          {view === 'whatsapp' && <WhatsAppSim key={params.get('join') ?? 'none'} params={params} defaults={session} />}
          {view === 'survey' && <IvrSurvey meta={meta} defaults={session} />}
          {view === 'feeds' && <DataFeeds meta={meta} />}
          <footer className="mt-8 text-center text-[11px] text-ink/40">
            Prototype for SIH26241 · Team Bit Flare · Evidence shown is a demonstration dataset; the production version is designed to connect authorised government/data-provider interfaces.
          </footer>
        </main>
      </div>
    </div>
  )
}
