// All backend access goes through here. Vite proxies /api and /ws to FastAPI in dev.
async function request(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export const apiGet = (path) => request('GET', path)
export const apiPost = (path, body) => request('POST', path, body)
export const apiPatch = (path, body) => request('PATCH', path, body)

/** Live events. Reconnects with backoff (hosted servers drop idle sockets); close() stops for good. */
export function openEventSocket(onEvent, onStatus) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  let ws
  let stopped = false
  let retry = 0
  let timer
  const connect = () => {
    ws = new WebSocket(`${proto}://${location.host}/ws/events`)
    ws.onopen = () => { retry = 0; onStatus?.('connected') }
    ws.onclose = () => {
      if (stopped) return
      onStatus?.('reconnecting')
      timer = setTimeout(connect, Math.min(10000, 1000 * 2 ** retry++))
    }
    ws.onerror = () => onStatus?.('error')
    ws.onmessage = (msg) => onEvent(JSON.parse(msg.data))
  }
  connect()
  return {
    close() {
      stopped = true
      clearTimeout(timer)
      ws?.close()
    },
  }
}
