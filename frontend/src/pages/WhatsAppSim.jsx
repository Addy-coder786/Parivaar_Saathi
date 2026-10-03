import { CheckCheck, Info, MessageCircle, SendHorizontal, Smartphone } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { LogoMark } from '../components/shell/Logo'
import { apiGet, apiPost } from '../lib/api'

const clock = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

// A per-tab demo phone number (never a real one), so two tabs can act as two different parents.
function demoNumber() {
  try {
    const saved = sessionStorage.getItem('ps-demo-phone')
    if (saved) return saved
    const n = `+91 90000 ${String(Math.floor(10000 + Math.random() * 89999))}`
    sessionStorage.setItem('ps-demo-phone', n)
    return n
  } catch {
    return '+91 90000 00000'
  }
}

/** WhatsApp's light formatting: *bold* and _italic_. */
function Formatted({ text }) {
  return text.split('\n').map((line, i) => (
    <span key={i} className="block min-h-[0.6em]">
      {line.split(/(\*[^*\n]+\*|_[^_\n]+_)/g).map((part, j) =>
        part.startsWith('*') && part.endsWith('*') && part.length > 2 ? <strong key={j}>{part.slice(1, -1)}</strong>
          : part.startsWith('_') && part.endsWith('_') && part.length > 2 ? <em key={j} className="text-[#54656f]">{part.slice(1, -1)}</em>
            : <span key={j}>{part}</span>)}
    </span>
  ))
}

export default function WhatsAppSim({ params, defaults }) {
  const [phone] = useState(demoNumber)
  const [messages, setMessages] = useState([])
  const [quick, setQuick] = useState([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const endRef = useRef(null)
  const autoJoined = useRef(false)
  const suggestedCode = params.get('join') || (defaults ? `PS-${defaults.id.toUpperCase()}` : null)

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [messages, busy])

  useEffect(() => {
    apiGet('/meta').then((m) => setInfo(m.channels)).catch(() => {})
  }, [])

  async function send(body) {
    const t = body.trim()
    if (!t || busy) return
    setError(null)
    setBusy(true)
    setMessages((m) => [...m, { me: true, text: t, at: new Date() }])
    try {
      const r = await apiPost('/channels/whatsapp/simulate', { sender: phone, text: t })
      setMessages((m) => [...m, ...r.replies.map((x) => ({ me: false, text: x, at: new Date() }))])
      setQuick(r.quick_replies ?? [])
    } catch (e) {
      setError(`Not delivered (${e.message})`)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    // Opened from "Invite parent on WhatsApp": join the session straight away, as if the QR was scanned.
    if (params.get('join') && !autoJoined.current) {
      autoJoined.current = true
      send(`JOIN ${params.get('join')}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function submit(e) {
    e.preventDefault()
    const t = text
    setText('')
    send(t)
  }

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-[400px_1fr]" data-view="whatsapp">
      {/* phone */}
      <div className="mx-auto w-full max-w-[380px] rounded-[2.4rem] border-[10px] border-ink bg-ink shadow-2xl">
        <div className="flex h-[640px] flex-col overflow-hidden rounded-[1.8rem] bg-[#efeae2]">
          <header className="flex items-center gap-3 bg-[#008069] px-3 py-2.5 text-white">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white"><LogoMark size={26} /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold leading-tight">ParivaarSaathi</div>
              <div className="text-[11px] text-white/80">{busy ? 'typing…' : 'online · simulated WhatsApp'}</div>
            </div>
          </header>
          <div className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3" aria-live="polite">
            <p className="mx-auto mb-2 w-fit rounded-md bg-[#fff5c4] px-2 py-1 text-center text-[10.5px] text-[#54656f]">
              Simulated WhatsApp · messages use the same backend path as the real WhatsApp webhook
            </p>
            {messages.length === 0 && (
              <div className="mx-auto mt-6 max-w-[260px] rounded-lg bg-white p-3 text-center text-xs text-[#54656f] shadow-sm">
                Send the join code from the family session to connect this phone as the <b>parent</b>.
                {suggestedCode && (
                  <button type="button" onClick={() => send(`JOIN ${suggestedCode}`)}
                    className="mt-2 block w-full rounded-full bg-[#008069] px-3 py-1.5 font-semibold text-white hover:bg-[#016d5a]">
                    Send “JOIN {suggestedCode}”
                  </button>
                )}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.me ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-2.5 pb-1 pt-1.5 text-[13.5px] leading-snug text-[#111b21] shadow-sm ${m.me ? 'rounded-tr-none bg-[#d9fdd3]' : 'rounded-tl-none bg-white'}`}>
                  <Formatted text={m.text} />
                  <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-[#667781]">
                    {clock(m.at)} {m.me && <CheckCheck size={13} className="text-[#53bdeb]" />}
                  </div>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          {quick.length > 0 && (
            <div className="flex flex-wrap gap-1.5 bg-[#efeae2] px-3 pb-2">
              {quick.map(([digit, label]) => (
                <button key={digit} type="button" disabled={busy} onClick={() => send(digit)}
                  className="rounded-full border border-[#008069]/30 bg-white px-2.5 py-1 text-xs font-medium text-[#008069] shadow-sm hover:bg-[#f0faf7] disabled:opacity-50">
                  {digit} · {label}
                </button>
              ))}
            </div>
          )}
          {error && <div className="bg-red-50 px-3 py-1 text-[11px] text-red-700">{error}</div>}
          <form onSubmit={submit} className="flex items-center gap-2 bg-[#f0f2f5] px-2 py-2">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message" aria-label="WhatsApp message"
              className="h-10 min-w-0 flex-1 rounded-full bg-white px-4 text-sm outline-none" />
            <button type="submit" disabled={busy || !text.trim()} aria-label="Send WhatsApp message"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#008069] text-white disabled:opacity-50">
              <SendHorizontal size={18} />
            </button>
          </form>
        </div>
      </div>

      {/* explanation */}
      <div className="space-y-4">
        <div className="card p-5">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-ink"><MessageCircle size={24} className="text-brand-600" /> WhatsApp — Parent channel</h1>
          <p className="mt-1 text-sm text-ink/60">
            The parent joins the <b>same family session</b> from their own phone. Their messages appear in the learner's
            chat as Parent turns, the Resistance Index and the admin dashboard update live, and replies come back here with
            each evidence card as WhatsApp text.
          </p>
          <ol className="mt-3 list-inside list-decimal space-y-1 text-sm text-ink/75">
            <li>Start a family session — the right column shows <b>Invite parent on WhatsApp</b> with a join code.</li>
            <li>Send <code className="rounded bg-ink/5 px-1">JOIN PS-…</code> from this phone (or tap the button in the phone).</li>
            <li>Type a concern, or reply <b>1</b> salary · <b>2</b> safety · <b>3</b> jobs · <b>4</b> career growth · <b>0</b> counsellor.</li>
          </ol>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-ink/50"><Smartphone size={14} /> This tab's demo number: {phone} · stored only as a salted hash</p>
        </div>
        <div className="card p-5 text-sm text-ink/70">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink"><Info size={17} className="text-indigo-500" /> Real WhatsApp (Twilio WhatsApp Sandbox)</h2>
          <p className="mt-1">
            The backend also exposes <code className="rounded bg-ink/5 px-1">POST {info?.twilio?.webhook_path ?? '/channels/whatsapp/twilio'}</code>,
            which runs exactly the same code and answers with TwiML. To use it: expose the backend with a tunnel
            (e.g. <code className="rounded bg-ink/5 px-1">cloudflared tunnel --url http://localhost:8000</code>), paste
            <i> tunnel URL + webhook path</i> into the sandbox's “When a message comes in” field, and set
            <code className="rounded bg-ink/5 px-1">TWILIO_AUTH_TOKEN</code> and <code className="rounded bg-ink/5 px-1">PUBLIC_BASE_URL</code> in
            <code className="rounded bg-ink/5 px-1">backend/.env</code> to switch on signature checks.
          </p>
          <p className="mt-2 text-xs">
            Status: signature check {info?.twilio?.signature_check ? <b className="text-brand-700">on</b> : <b>off (no token configured)</b>}
            {info?.twilio?.number ? <> · number {info.twilio.number}</> : <> · no WhatsApp number configured</>}.
            Production would use the WhatsApp Business Platform with an approved business number.
          </p>
        </div>
      </div>
    </div>
  )
}
