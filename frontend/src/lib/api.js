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

export function openEventSocket(onEvent, onStatus) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const ws = new WebSocket(`${proto}://${location.host}/ws/events`)
  ws.onopen = () => onStatus?.('connected')
  ws.onclose = () => onStatus?.('disconnected')
  ws.onerror = () => onStatus?.('error')
  ws.onmessage = (msg) => onEvent(JSON.parse(msg.data))
  return ws
}
