// Dismisses the animated intro defined in index.html and reveals the app underneath.
// Timing starts when the artwork has loaded, so the entrance animation is always seen in full.
const SHOW_MS = 4500 // entrance (~1.6 s) + time to read the screen; the progress bar fills over this
const FADE_MS = 650
const LOAD_TIMEOUT_MS = 6000 // slow network: never hold the app longer than this

export function runIntro() {
  const intro = document.getElementById('intro')
  if (!intro) return

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const showFor = reduced ? 1200 : SHOW_MS
  intro.style.setProperty('--intro-ms', `${Math.max(300, showFor - 1350)}ms`) // bar starts at 1 s, full just before exit

  let done = false
  const reveal = () => {
    if (done) return
    done = true
    intro.classList.add('is-leaving')
    document.body.classList.remove('intro-active')
    window.removeEventListener('keydown', onKey)
    setTimeout(() => intro.remove(), FADE_MS + 50)
  }
  const onKey = (e) => {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') reveal()
  }

  document.getElementById('intro-skip')?.addEventListener('click', reveal)
  window.addEventListener('keydown', onKey)

  const schedule = () => {
    if (window.__introFailed) return reveal()
    const elapsed = performance.now() - window.__introLoadedAt
    setTimeout(reveal, Math.max(0, showFor - elapsed))
  }

  if (window.__introLoadedAt !== undefined || window.__introFailed) {
    schedule()
  } else {
    const img = document.getElementById('intro-img')
    img?.addEventListener('load', () => {
      window.__introLoadedAt ??= performance.now()
      intro.classList.add('is-ready')
      schedule()
    }, { once: true })
    img?.addEventListener('error', reveal, { once: true })
    setTimeout(reveal, LOAD_TIMEOUT_MS)
  }
}
