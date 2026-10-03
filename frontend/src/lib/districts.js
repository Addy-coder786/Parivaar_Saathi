// Map presentation helpers. District coordinates come from the backend (/dashboard/summary rows carry
// lng/lat/state) so there is a single source of truth; this file only holds how they are drawn.

// `anchor` decides whether a district's circle sits above ('bottom') or below ('top') its exact point, so the two
// neighbouring pairs (Sikar/Jaipur ~100 km, Nashik/Pune ~165 km) extend in opposite directions and never overlap.
export const DISTRICT_ANCHOR = { Sikar: 'bottom', Jaipur: 'top', Nashik: 'bottom', Pune: 'top' }

// Bounding box that frames all four districts (west, south, east, north).
export const DISTRICT_BOUNDS = [
  [72.3, 17.3],
  [77.6, 28.9],
]

// Sequential orange ramp (light → dark) for the average Prototype Resistance Index.
// Orange is the palette's second slot: the heat table already uses the blue sequential ramp for a different
// measure (objection counts), and two measures must not share a hue.
export const RESISTANCE_RAMP = ['#fde3d6', '#f9bfa3', '#f49a71', '#eb6834', '#c94f22', '#9e3b17']
export const RESISTANCE_DOMAIN = [50, 75] // index values mapped onto the ramp

export function resistanceColor(score) {
  if (score == null) return '#e1e0d9'
  const [lo, hi] = RESISTANCE_DOMAIN
  const t = Math.max(0, Math.min(1, (score - lo) / (hi - lo)))
  return RESISTANCE_RAMP[Math.min(RESISTANCE_RAMP.length - 1, Math.floor(t * RESISTANCE_RAMP.length))]
}

// Opportunities: one hue (categorical slot 1) — trade is shown in text, never by colour, so the map never
// needs more than one series colour (scatter-style maps only validate up to three categorical hues).
export const OPP_COLOR = '#2a78d6'
export const OPP_BEYOND_COLOR = '#898781'

export const BASEMAPS = {
  liberty: { label: 'Liberty', url: 'https://tiles.openfreemap.org/styles/liberty' },
  light: { label: 'Light', url: 'https://tiles.openfreemap.org/styles/positron' },
}

/** GeoJSON polygon approximating a circle of `km` around a point. */
export function circlePolygon(lng, lat, km, steps = 72) {
  const coords = []
  for (let i = 0; i <= steps; i++) {
    const b = (i / steps) * 2 * Math.PI
    const dLat = (km * Math.cos(b)) / 110.574
    const dLng = (km * Math.sin(b)) / (111.32 * Math.cos((lat * Math.PI) / 180))
    coords.push([lng + dLng, lat + dLat])
  }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} }
}

/** [[west, south], [east, north]] around a circle of `km`. */
export function circleBounds(lng, lat, km) {
  const dLat = km / 110.574
  const dLng = km / (111.32 * Math.cos((lat * Math.PI) / 180))
  return [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat + dLat],
  ]
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}
