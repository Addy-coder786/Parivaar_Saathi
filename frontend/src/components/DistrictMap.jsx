import { FullscreenControl, Map as MapLibreMap, Marker, NavigationControl, Popup, ScaleControl, setWorkerUrl } from 'maplibre-gl' // named exports only
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { apiGet } from '../lib/api'
import {
  BASEMAPS, DISTRICT_ANCHOR, DISTRICT_BOUNDS, OPP_BEYOND_COLOR, OPP_COLOR, RESISTANCE_DOMAIN, RESISTANCE_RAMP,
  circleBounds, circlePolygon, escapeHtml, resistanceColor,
} from '../lib/districts'
import { OBJECTION_LABELS } from '../lib/labels'
import DemoBadge from './DemoBadge'

// Vite worker setup recommended by MapLibre/OpenFreeMap: point MapLibre at its worker module explicitly.
setWorkerUrl(workerUrl)

const TRADES = ['Electrician', 'Solar Technician', 'Welder', 'CNC Operator', 'Healthcare Assistant']
const OVERVIEW_PADDING = { top: 84, bottom: 120, left: 48, right: 48 } // bottom: room for the legend

// Zoomed-in framing keeps content clear of the top-right control column and the bottom-left legend.
// On narrow screens the controls stack on top instead, so pad vertically rather than on the right.
function detailPadding(map) {
  const w = map?.getContainer().clientWidth ?? 1000
  return w < 640 ? { top: 110, bottom: 120, left: 16, right: 16 } : { top: 50, bottom: 70, left: 50, right: 190 }
}
const EMPTY_FC = { type: 'FeatureCollection', features: [] }
const OFFLINE_STYLE = { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#e9ecef' } }] }

async function fetchStyle(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`style HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

function markerSize(sessions, maxSessions) {
  const MIN = 24
  const MAX = 48
  return maxSessions ? Math.round(MIN + Math.sqrt(sessions / maxSessions) * (MAX - MIN)) : MIN
}

function buildDistrictMarker(anchor) {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = 'ps-marker'
  el.innerHTML = anchor === 'top'
    ? '<span class="ps-marker-pin"></span><span class="ps-marker-dot"></span><span class="ps-marker-label"></span>'
    : '<span class="ps-marker-label"></span><span class="ps-marker-dot"></span><span class="ps-marker-pin"></span>'
  return el
}

function opportunityPopupHtml(o) {
  const row = (k, v) => (v ? `<div class="ps-pop-row"><span>${escapeHtml(k)}</span><b>${escapeHtml(v)}</b></div>` : '')
  return `
    <div class="ps-pop">
      <div class="ps-pop-title">${escapeHtml(o.role)}</div>
      <div class="ps-pop-sub">${escapeHtml(o.employer)}</div>
      <div class="ps-pop-chips">
        <span>${escapeHtml(o.trade)}</span>
        <span>${escapeHtml(o.employment_type)}</span>
        <span>${escapeHtml(o.shift)}</span>
      </div>
      ${row('Distance', `${o.distance_km} km · ≈ ${o.commute_min} min (est.)`)}
      ${row('Openings', String(o.openings))}
      ${row('Starting pay (district)', o.entry_wage)}
      ${row('Course to qualify', o.course)}
      ${o.within_radius ? '' : '<div class="ps-pop-warn">Outside the 15 km radius</div>'}
      <div class="ps-pop-foot">Demo data · illustrative location</div>
    </div>`
}

function centrePopupHtml(c) {
  const row = (k, v) => (v ? `<div class="ps-pop-row"><span>${escapeHtml(k)}</span><b>${escapeHtml(v)}</b></div>` : '')
  return `
    <div class="ps-pop">
      <div class="ps-pop-title">🏫 ${escapeHtml(c.name)}</div>
      <div class="ps-pop-sub">Training centre</div>
      ${row('Distance', `${c.distance_km} km · ≈ ${c.commute_min} min (est.)`)}
      ${row('Course', c.course)}
      ${row('Female staff', c.female_staff)}
      ${row('CCTV', c.cctv)}
      ${row('Transport', c.transport)}
      ${row('Hours', c.training_hours)}
      <div class="ps-pop-foot">Demo centre data — not an inspected record</div>
    </div>`
}

function toFeatureCollection(data) {
  if (!data) return EMPTY_FC
  return {
    type: 'FeatureCollection',
    features: data.opportunities.map((o) => ({
      type: 'Feature',
      id: o.id,
      geometry: { type: 'Point', coordinates: [o.lng, o.lat] },
      properties: { id: o.id, within: o.within_radius },
    })),
  }
}

export default function DistrictMap({ rows, liveEvent, initialDistrict = null, initialTrade = null, showFollow = true }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const districtMarkersRef = useRef(new Map())
  const detailMarkersRef = useRef([])
  const hoverPopupRef = useRef(null)
  const pinnedPopupRef = useRef(null)
  const dataRef = useRef(null)
  const hoverIdRef = useRef(null)
  const pinnedIdRef = useRef(null)
  const selectedRef = useRef(null)
  const listRef = useRef(null)
  const lastLiveRef = useRef(null)

  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [basemapOnline, setBasemapOnline] = useState(true)
  const [styleName, setStyleName] = useState('liberty')
  const [hoverDistrict, setHoverDistrict] = useState(null)
  const [selected, setSelected] = useState(null)
  const [trade, setTrade] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [hoverId, setHoverId] = useState(null)
  const [pinnedId, setPinnedId] = useState(null)
  const [follow, setFollow] = useState(showFollow)
  const openedInitialRef = useRef(false)
  const [liveToast, setLiveToast] = useState(null)

  const rowsByDistrict = Object.fromEntries((rows ?? []).map((r) => [r.district, r]))

  // ---- overlay layers (re-added after every style change) -----------------------------------------
  const ensureOverlays = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const d = dataRef.current
    if (!map.getSource('radius')) {
      map.addSource('radius', { type: 'geojson', data: d ? circlePolygon(d.center.lng, d.center.lat, d.radius_km) : EMPTY_FC })
      map.addLayer({ id: 'radius-fill', type: 'fill', source: 'radius', paint: { 'fill-color': OPP_COLOR, 'fill-opacity': 0.07 } })
      map.addLayer({ id: 'radius-line', type: 'line', source: 'radius', paint: { 'line-color': OPP_COLOR, 'line-width': 1.5, 'line-opacity': 0.8, 'line-dasharray': [2, 2] } })
    }
    if (!map.getSource('opps')) {
      map.addSource('opps', { type: 'geojson', data: toFeatureCollection(d), promoteId: 'id' })
      const hovered = ['boolean', ['feature-state', 'hover'], false]
      const pinned = ['boolean', ['feature-state', 'pinned'], false]
      map.addLayer({
        id: 'opps-halo', type: 'circle', source: 'opps',
        paint: {
          'circle-color': OPP_COLOR,
          'circle-opacity': ['case', ['any', hovered, pinned], 0.22, 0],
          'circle-radius': ['case', ['any', hovered, pinned], 18, 6],
        },
      })
      map.addLayer({
        id: 'opps', type: 'circle', source: 'opps',
        paint: {
          'circle-color': ['case', ['get', 'within'], OPP_COLOR, OPP_BEYOND_COLOR],
          'circle-opacity': ['case', ['get', 'within'], 1, 0.6],
          'circle-radius': ['case', pinned, 10, hovered, 9, 6],
          'circle-stroke-width': 2,
          'circle-stroke-color': ['case', ['any', hovered, pinned], '#0b0b0b', '#ffffff'],
        },
      })
    }
    // Feature-state is wiped by a style change; restore highlight/pin.
    if (hoverIdRef.current != null) map.setFeatureState({ source: 'opps', id: hoverIdRef.current }, { hover: true })
    if (pinnedIdRef.current != null) map.setFeatureState({ source: 'opps', id: pinnedIdRef.current }, { pinned: true })
  }, [])

  // ---- hover / pin --------------------------------------------------------------------------------
  const findOpp = (id) => dataRef.current?.opportunities.find((o) => o.id === id)

  const setHover = useCallback((id, { popup = true } = {}) => {
    const map = mapRef.current
    if (!map?.getSource('opps')) return
    if (hoverIdRef.current != null && hoverIdRef.current !== id) map.setFeatureState({ source: 'opps', id: hoverIdRef.current }, { hover: false })
    hoverIdRef.current = id
    setHoverId(id)
    if (id == null) {
      hoverPopupRef.current?.remove()
      return
    }
    map.setFeatureState({ source: 'opps', id }, { hover: true })
    const o = findOpp(id)
    if (popup && o && id !== pinnedIdRef.current) {
      if (!hoverPopupRef.current) hoverPopupRef.current = new Popup({ closeButton: false, closeOnClick: false, offset: 14, className: 'ps-popup', maxWidth: '300px' })
      hoverPopupRef.current.setLngLat([o.lng, o.lat]).setHTML(opportunityPopupHtml(o)).addTo(map)
    }
  }, [])

  const setPinned = useCallback((id, { fly = false } = {}) => {
    const map = mapRef.current
    if (!map?.getSource('opps')) return
    if (pinnedIdRef.current != null) map.setFeatureState({ source: 'opps', id: pinnedIdRef.current }, { pinned: false })
    pinnedIdRef.current = id
    setPinnedId(id)
    pinnedPopupRef.current?.remove()
    if (id == null) return
    map.setFeatureState({ source: 'opps', id }, { pinned: true })
    const o = findOpp(id)
    if (!o) return
    hoverPopupRef.current?.remove()
    pinnedPopupRef.current = new Popup({ closeButton: true, closeOnClick: false, offset: 14, className: 'ps-popup', maxWidth: '300px' })
      .setLngLat([o.lng, o.lat]).setHTML(opportunityPopupHtml(o)).addTo(map)
    pinnedPopupRef.current.on('close', () => {
      if (pinnedIdRef.current === id) {
        if (map.getSource('opps')) map.setFeatureState({ source: 'opps', id }, { pinned: false })
        pinnedIdRef.current = null
        setPinnedId(null)
      }
    })
    if (fly) map.easeTo({ center: [o.lng, o.lat], zoom: Math.max(map.getZoom(), 12), padding: detailPadding(map), duration: 800 })
    // Keep the matching list row in view.
    listRef.current?.querySelector(`[data-opp="${id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [])

  // ---- detail markers (district HQ + training centre) --------------------------------------------
  const clearDetailMarkers = () => {
    detailMarkersRef.current.forEach((m) => m.remove())
    detailMarkersRef.current = []
  }

  const drawDetail = useCallback((d) => {
    const map = mapRef.current
    if (!map) return
    dataRef.current = d
    map.getSource('radius')?.setData(d ? circlePolygon(d.center.lng, d.center.lat, d.radius_km) : EMPTY_FC)
    map.getSource('opps')?.setData(toFeatureCollection(d))
    clearDetailMarkers()
    if (!d) return
    const hq = document.createElement('div')
    hq.className = 'ps-hq'
    // Label sits to the LEFT of the point: the training centre is placed north-east of the HQ (geo.py CENTRE_BEARING).
    hq.innerHTML = `<span class="ps-hq-label">${escapeHtml(d.district)} HQ</span><span class="ps-hq-dot"></span>`
    detailMarkersRef.current.push(new Marker({ element: hq, anchor: 'right', offset: [6, 0] }).setLngLat([d.center.lng, d.center.lat]).addTo(map))
    for (const c of d.centres) {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'ps-centre'
      el.textContent = '🏫'
      el.setAttribute('aria-label', `${c.name}, ${c.distance_km} km`)
      const pop = new Popup({ closeButton: false, closeOnClick: false, offset: 18, className: 'ps-popup', maxWidth: '300px' }).setHTML(centrePopupHtml(c))
      el.addEventListener('mouseenter', () => pop.setLngLat([c.lng, c.lat]).addTo(map))
      el.addEventListener('mouseleave', () => pop.remove())
      el.addEventListener('click', () => (pop.isOpen() ? pop.remove() : pop.setLngLat([c.lng, c.lat]).addTo(map)))
      detailMarkersRef.current.push(new Marker({ element: el, anchor: 'center' }).setLngLat([c.lng, c.lat]).addTo(map))
    }
  }, [])

  // ---- select / overview --------------------------------------------------------------------------
  const loadDistrict = useCallback(async (district, tradeFilter, { fit = true } = {}) => {
    const map = mapRef.current
    if (!map) return
    selectedRef.current = district
    setSelected(district)
    setLoading(true)
    setHover(null)
    setPinned(null)
    try {
      const qs = new URLSearchParams({ district, ...(tradeFilter ? { trade: tradeFilter } : {}) })
      const d = await apiGet(`/map/opportunities?${qs}`)
      if (selectedRef.current !== district) return // user moved on
      setData(d)
      drawDetail(d)
      if (fit) map.fitBounds(circleBounds(d.center.lng, d.center.lat, d.radius_km), { padding: detailPadding(map), duration: 1400, maxZoom: 12.5 })
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [drawDetail, setHover, setPinned])

  const showOverview = useCallback(() => {
    const map = mapRef.current
    selectedRef.current = null
    setSelected(null)
    setData(null)
    setHover(null)
    setPinned(null)
    drawDetail(null)
    map?.fitBounds(DISTRICT_BOUNDS, { padding: OVERVIEW_PADDING, duration: 1200 })
  }, [drawDetail, setHover, setPinned])

  // ---- map init -----------------------------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const container = containerRef.current
    const districtMarkers = districtMarkersRef.current
    let cancelled = false
    let map = null
    fetchStyle(BASEMAPS.liberty.url)
      .then((style) => ({ style, online: true }))
      .catch(() => ({ style: OFFLINE_STYLE, online: false }))
      .then(({ style, online }) => {
        if (cancelled) return
        setBasemapOnline(online)
        try {
          map = new MapLibreMap({
            container,
            style,
            bounds: DISTRICT_BOUNDS,
            fitBoundsOptions: { padding: OVERVIEW_PADDING },
            attributionControl: { compact: true },
            cooperativeGestures: true, // Ctrl/⌘ + scroll to zoom, two fingers on touch — the page still scrolls normally
            dragRotate: false,
            pitchWithRotate: false,
            touchPitch: false,
          })
        } catch {
          setFailed(true) // no WebGL in this browser
          return
        }
        mapRef.current = map
        map.addControl(new NavigationControl({ showCompass: false }), 'top-left')
        map.addControl(new FullscreenControl(), 'top-left')
        map.addControl(new ScaleControl({ unit: 'metric', maxWidth: 100 }), 'bottom-right')
        map.on('style.load', ensureOverlays)
        map.on('load', () => {
          map.resize() // lazy-loaded CSS can land after construction and change the container size
          setReady(true)
        })
        map.on('mousemove', 'opps', (e) => {
          map.getCanvas().style.cursor = 'pointer'
          const id = e.features?.[0]?.id
          if (id != null && id !== hoverIdRef.current) setHover(id)
        })
        map.on('mouseleave', 'opps', () => {
          map.getCanvas().style.cursor = ''
          setHover(null)
        })
        map.on('click', 'opps', (e) => {
          const id = e.features?.[0]?.id
          if (id != null) setPinned(id)
        })
        // Runtime 'error' events are tile/glyph fetches failing (e.g. Wi-Fi drops) — markers still work.
        map.on('error', () => {})
      })
    return () => {
      cancelled = true
      districtMarkers.forEach((m) => m.remove())
      districtMarkers.clear()
      detailMarkersRef.current.forEach((m) => m.remove())
      hoverPopupRef.current?.remove()
      pinnedPopupRef.current?.remove()
      map?.remove()
      mapRef.current = null
    }
  }, [ensureOverlays, setHover, setPinned])

  // ---- basemap switch -----------------------------------------------------------------------------
  async function switchStyle(name) {
    const map = mapRef.current
    if (!map || name === styleName) return
    try {
      const style = await fetchStyle(BASEMAPS[name].url)
      setStyleName(name)
      map.setStyle(style, { diff: false }) // overlays are re-added on 'style.load'
    } catch {
      setBasemapOnline(false)
    }
  }

  // ---- district markers (overview) ----------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !rows) return
    const maxSessions = Math.max(1, ...rows.map((r) => r.sessions || 0))
    for (const row of rows) {
      if (row.lng == null || row.lat == null) continue
      let marker = districtMarkersRef.current.get(row.district)
      if (!marker) {
        const anchor = DISTRICT_ANCHOR[row.district] ?? 'center'
        const el = buildDistrictMarker(anchor)
        el.addEventListener('mouseenter', () => setHoverDistrict(row.district))
        el.addEventListener('mouseleave', () => setHoverDistrict((h) => (h === row.district ? null : h)))
        el.addEventListener('focus', () => setHoverDistrict(row.district))
        el.addEventListener('click', () => loadDistrict(row.district, null))
        marker = new Marker({ element: el, anchor }).setLngLat([row.lng, row.lat]).addTo(map)
        districtMarkersRef.current.set(row.district, marker)
      }
      const el = marker.getElement()
      const size = markerSize(row.sessions || 0, maxSessions)
      const dot = el.querySelector('.ps-marker-dot')
      dot.style.width = `${size}px`
      dot.style.height = `${size}px`
      dot.style.background = resistanceColor(row.avg_score)
      dot.textContent = row.high_resistance ?? ''
      el.querySelector('.ps-marker-label').textContent = row.district
      el.setAttribute('aria-label', `${row.district}: ${row.sessions} sessions, average index ${row.avg_score}, ${row.high_resistance} high resistance. Click to see nearby opportunities.`)
    }
  }, [rows, ready, loadDistrict])

  // Hide district bubbles while zoomed into one district; highlight the hovered one.
  useEffect(() => {
    districtMarkersRef.current.forEach((m, name) => {
      const el = m.getElement()
      el.style.display = selected ? 'none' : ''
      el.classList.toggle('is-hover', hoverDistrict === name)
    })
  }, [selected, hoverDistrict, rows, ready])

  // Re-query when the trade filter changes while a district is open (keep the camera where it is).
  function changeTrade(t) {
    setTrade(t)
    if (selectedRef.current) loadDistrict(selectedRef.current, t, { fit: false })
  }

  // ---- open straight into a district (e.g. the current session's) ----------------------------------
  useEffect(() => {
    if (!ready || !initialDistrict || openedInitialRef.current) return
    openedInitialRef.current = true
    setTrade(initialTrade)
    loadDistrict(initialDistrict, initialTrade)
  }, [ready, initialDistrict, initialTrade, loadDistrict])

  // ---- follow live events ---------------------------------------------------------------------------
  useEffect(() => {
    if (!liveEvent || !ready || !follow) return
    const key = `${liveEvent.timestamp}-${liveEvent.type}`
    if (lastLiveRef.current === key || !rowsByDistrict[liveEvent.district]) return
    lastLiveRef.current = key
    const label = liveEvent.type === 'escalation_created'
      ? `Escalated to counsellor (${liveEvent.priority})`
      : liveEvent.type === 'family_decision'
        ? 'Family open to enrolment'
        : liveEvent.objection === 'refusal'
          ? 'Refusal'
          : `${OBJECTION_LABELS[liveEvent.objection] ?? liveEvent.objection} objection`
    setLiveToast({ key, text: `${liveEvent.district} · ${liveEvent.trade} · ${label}` })
    const sameView = selectedRef.current === liveEvent.district && trade === liveEvent.trade
    if (!sameView) {
      setTrade(liveEvent.trade)
      loadDistrict(liveEvent.district, liveEvent.trade)
    }
    const timer = setTimeout(() => setLiveToast((t) => (t?.key === key ? null : t)), 5000)
    return () => clearTimeout(timer)
    // rowsByDistrict is derived from rows; depending on rows avoids a new object each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveEvent, ready, follow, rows, loadDistrict, trade])

  const hoverRow = hoverDistrict && !selected ? rowsByDistrict[hoverDistrict] : null
  const inside = data?.opportunities.filter((o) => o.within_radius) ?? []
  const sortedRows = [...(rows ?? [])].sort((a, b) => (b.avg_score ?? 0) - (a.avg_score ?? 0))

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_330px]">
      {/* ---------------- map ---------------- */}
      <div className="relative h-[460px] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
        {/* Sized explicitly: MapLibre's own CSS forces `position: relative` on this element. */}
        <div ref={containerRef} className="h-full w-full" style={{ height: '100%' }} />

        {failed && !ready && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-500">
            Map could not be initialised in this browser (WebGL unavailable). The district table below carries the same data.
          </div>
        )}

        {/* top-right controls */}
        <div className="absolute right-2 top-2 flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1 rounded-md bg-white/95 p-0.5 text-[11px] shadow" role="group" aria-label="Basemap style">
            {Object.entries(BASEMAPS).map(([name, b]) => (
              <button key={name} type="button" disabled={!basemapOnline} onClick={() => switchStyle(name)}
                className={`rounded px-2 py-0.5 font-medium ${styleName === name ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'} disabled:opacity-40`}>
                {b.label}
              </button>
            ))}
          </div>
          {showFollow && (
            <label className="flex cursor-pointer items-center gap-1.5 rounded-md bg-white/95 px-2 py-1 text-[11px] font-medium text-slate-700 shadow">
              <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} className="accent-emerald-600" />
              Follow live events
            </label>
          )}
          <div className="pointer-events-none flex items-center gap-1 rounded-md bg-white/90 px-2 py-1 text-[10px] text-slate-500 shadow">
            <DemoBadge /> real districts · simulated figures
          </div>
        </div>

        {!basemapOnline && (
          <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-md bg-amber-50 px-2 py-1 text-[10px] text-amber-800 shadow">
            Basemap unavailable offline — showing markers only
          </div>
        )}

        {liveToast && (
          <div key={liveToast.key} className="ps-live-toast pointer-events-none absolute left-1/2 top-12 -translate-x-1/2 rounded-full bg-emerald-700 px-3 py-1 text-xs font-medium text-white shadow-lg">
            <span className="mr-1.5 inline-block h-2 w-2 animate-ping rounded-full bg-white align-middle" /> Live · {liveToast.text}
          </div>
        )}

        {selected && (
          <button type="button" onClick={showOverview}
            className="absolute left-12 top-2 rounded-md bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow hover:bg-white">
            ← All districts
          </button>
        )}

        {/* legend — fades while a popup is open so it never hides the popup's details */}
        <div className={`pointer-events-none absolute bottom-2 left-2 rounded-md bg-white/92 px-2.5 py-2 text-[11px] text-slate-700 shadow transition-opacity duration-200 ${hoverId != null || pinnedId != null ? 'opacity-20' : 'opacity-100'}`}>
          {selected ? (
            <>
              <div className="font-semibold text-slate-800">Opportunities near {selected}</div>
              <div className="mt-1 flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-white" style={{ background: OPP_COLOR, boxShadow: `0 0 0 1px ${OPP_COLOR}` }} /> within {data?.radius_km ?? 15} km</div>
              <div className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-white" style={{ background: OPP_BEYOND_COLOR, opacity: 0.7 }} /> beyond radius</div>
              <div className="flex items-center gap-1.5"><span>🏫</span> training centre · <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: OPP_COLOR }} /> {data?.radius_km ?? 15} km radius</div>
              <div className="mt-1 hidden text-slate-500 sm:block">Hover a point for key factors · click to pin</div>
            </>
          ) : (
            <>
              <div className="font-semibold text-slate-800">Avg. Prototype Resistance Index</div>
              <div className="mt-1 flex items-center gap-1">
                <span>{RESISTANCE_DOMAIN[0]}</span>
                <span className="flex h-2.5 w-24 overflow-hidden rounded-sm">
                  {RESISTANCE_RAMP.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}
                </span>
                <span>{RESISTANCE_DOMAIN[1]}+</span>
              </div>
              <div className="mt-1.5 hidden text-slate-500 sm:block">Size = sessions · number = families at High · click a district to zoom in</div>
            </>
          )}
        </div>

        {/* overview hover card */}
        {hoverRow && (
          <div className="pointer-events-none absolute right-2 top-[104px] w-56 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-slate-900">{hoverRow.district}</span>
              <span className="text-slate-500">{hoverRow.state}</span>
            </div>
            <dl className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-slate-700">
              <dt className="text-slate-500">Sessions</dt><dd className="text-right tabular-nums">{hoverRow.sessions}</dd>
              <dt className="text-slate-500">Avg. index</dt><dd className="text-right tabular-nums">{hoverRow.avg_score ?? '—'}</dd>
              <dt className="text-slate-500">At High</dt><dd className="text-right tabular-nums">{hoverRow.high_resistance}</dd>
              <dt className="text-slate-500">Objections</dt><dd className="text-right tabular-nums">{hoverRow.total}</dd>
            </dl>
            <div className="mt-1.5 border-t border-slate-100 pt-1.5">
              <span className="text-slate-500">Top concern: </span>
              <span className="font-medium text-slate-900">{hoverRow.top_concern ? OBJECTION_LABELS[hoverRow.top_concern] : '—'}</span>
            </div>
            <div className="mt-1 font-medium text-emerald-700">Click to see nearby opportunities →</div>
          </div>
        )}
      </div>

      {/* ---------------- side panel ---------------- */}
      <aside className="flex h-[460px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
        {!selected ? (
          <>
            <div className="border-b border-slate-100 px-3 py-2">
              <div className="text-sm font-semibold text-slate-800">Districts by resistance</div>
              <div className="text-[11px] text-slate-500">Hover to locate · click to zoom in and see opportunities</div>
            </div>
            <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto">
              {sortedRows.map((r) => (
                <li key={r.district}>
                  <button type="button" onMouseEnter={() => setHoverDistrict(r.district)} onMouseLeave={() => setHoverDistrict(null)}
                    onClick={() => loadDistrict(r.district, null)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${hoverDistrict === r.district ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                    <span className="h-8 w-8 shrink-0 rounded-full border-2 border-white shadow" style={{ background: resistanceColor(r.avg_score) }} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900">{r.district} <span className="font-normal text-slate-500">· {r.state}</span></span>
                      <span className="block text-xs text-slate-500">{r.sessions} sessions · top concern {r.top_concern ? OBJECTION_LABELS[r.top_concern] : '—'}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-bold tabular-nums text-slate-900">{r.avg_score ?? '—'}</span>
                      <span className="block text-[10px] text-slate-500">avg. index</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <div className="border-b border-slate-100 px-3 py-2">
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-semibold text-slate-900">{selected} <span className="font-normal text-slate-500">· {data?.state}</span></div>
                <button type="button" onClick={showOverview} className="text-xs font-medium text-emerald-700 hover:underline">← All districts</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1" role="group" aria-label="Filter by trade">
                {[null, ...TRADES].map((t) => (
                  <button key={t ?? 'all'} type="button" onClick={() => changeTrade(t)}
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${trade === t ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                    {t ?? 'All trades'}
                  </button>
                ))}
              </div>
            </div>

            {loading || !data ? (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-400">{loading ? 'Loading opportunities…' : 'No data'}</div>
            ) : (
              <div ref={listRef} className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-3 gap-px border-b border-slate-100 bg-slate-100 text-center">
                  {[
                    ['Within 15 km', data.summary.count],
                    ['Openings', data.summary.openings],
                    ['Nearest', data.summary.nearest_km != null ? `${data.summary.nearest_km} km` : '—'],
                    ['Apprentice-ships', data.summary.apprenticeships],
                    ['Day shift', data.summary.day_shift_pct != null ? `${data.summary.day_shift_pct}%` : '—'],
                    ['Beyond radius', data.summary.beyond_radius],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-white px-1 py-1.5">
                      <div className="text-base font-bold tabular-nums text-slate-900">{v}</div>
                      <div className="text-[10px] leading-tight text-slate-500">{k}</div>
                    </div>
                  ))}
                </div>

                {!trade && data.summary.by_trade.length > 0 && (
                  <div className="border-b border-slate-100 px-3 py-2">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">By trade (starting pay)</div>
                    {data.summary.by_trade.map((t) => (
                      <button key={t.trade} type="button" onClick={() => changeTrade(t.trade)} className="flex w-full justify-between gap-2 rounded px-1 py-0.5 text-left text-xs hover:bg-slate-50">
                        <span className="text-slate-800">{t.trade} <span className="text-slate-500">· {t.count}</span></span>
                        <span className="shrink-0 tabular-nums text-slate-600">{t.entry_wage}</span>
                      </button>
                    ))}
                  </div>
                )}

                {data.centres[0] && (
                  <div className="border-b border-slate-100 bg-emerald-50/60 px-3 py-2 text-xs">
                    <div className="font-semibold text-slate-800">🏫 {data.centres[0].name}</div>
                    <div className="text-slate-600">{data.centres[0].distance_km} km · ≈ {data.centres[0].commute_min} min (est.) · {data.centres[0].transport}</div>
                    <div className="text-slate-600">Female staff: {data.centres[0].female_staff}</div>
                  </div>
                )}

                <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Nearest opportunities</div>
                <ul className="pb-2">
                  {inside.map((o) => (
                    <li key={o.id}>
                      <button type="button" data-opp={o.id}
                        onMouseEnter={() => setHover(o.id)} onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover(o.id)} onBlur={() => setHover(null)}
                        onClick={() => setPinned(o.id, { fly: true })}
                        className={`w-full border-l-2 px-3 py-1.5 text-left transition-colors ${pinnedId === o.id ? 'border-slate-900 bg-blue-50' : hoverId === o.id ? 'border-blue-500 bg-blue-50/60' : 'border-transparent hover:bg-slate-50'}`}>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium text-slate-900">{o.role}</span>
                          <span className="shrink-0 text-xs tabular-nums text-slate-600">{o.distance_km} km</span>
                        </div>
                        <div className="truncate text-[11px] text-slate-500">{o.employer.replace(/^Demo Employer \d+ — /, '')}{!trade && ` · ${o.trade}`}</div>
                        <div className="mt-0.5 flex flex-wrap gap-1 text-[10px]">
                          <span className="rounded bg-slate-100 px-1.5 py-px text-slate-700">{o.openings} opening{o.openings > 1 ? 's' : ''}</span>
                          <span className="rounded bg-slate-100 px-1.5 py-px text-slate-700">{o.employment_type}</span>
                          <span className="rounded bg-slate-100 px-1.5 py-px text-slate-700">{o.shift}</span>
                          <span className="rounded bg-slate-100 px-1.5 py-px text-slate-700">≈ {o.commute_min} min</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="border-t border-slate-100 px-3 py-2 text-[10px] leading-snug text-slate-400">{data.note}</p>
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  )
}
