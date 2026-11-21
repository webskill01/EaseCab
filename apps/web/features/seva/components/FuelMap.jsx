'use client'

import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react'
import { useTranslations } from 'next-intl'
import { getCurrentPosition } from '@/features/notifications/services/geoClient'
import { MAP_COLORS, pumpIcon, endIcon, meIcon } from '../lib/mapIcons'

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
const FALLBACK_CENTER = Object.freeze({ lat: 30.73, lng: 76.78 }) // Chandigarh, only until fitBounds runs
const LOCATE_ZOOM = 15
const ZOOM_STEP_MS = 120
const REVEAL_MS = 700
// Quiet base map: no shop / transit icons competing with the pump pins.
const STYLES = Object.freeze([
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
])

let loading = null
/**
 * Load the Google Maps JS API once per page (browser-restricted public key).
 * ponytail: plain script tag + classic Marker (no Map ID); move to AdvancedMarker if Google retires Marker.
 */
function loadMaps() {
  if (window.google?.maps?.Marker) return Promise.resolve(window.google.maps)
  loading ??= new Promise((resolve, reject) => {
    window.__ecMapsReady = async () => {
      try {
        await Promise.all([window.google.maps.importLibrary('maps'), window.google.maps.importLibrary('marker')])
        resolve(window.google.maps)
      } catch (e) { reject(e) }
    }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&v=weekly&loading=async&callback=__ecMapsReady`
    s.async = true
    s.onerror = () => { loading = null; reject(new Error('maps script failed')) }
    document.head.appendChild(s)
  })
  return loading
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Road with a white casing + A/B ends; the line draws itself from A to B. Returns a cleanup. */
function drawRoute(g, map, route) {
  const path = route.points.map(([lat, lng]) => ({ lat, lng }))
  const casing = new g.Polyline({ map, path: [], strokeColor: MAP_COLORS.CASING, strokeWeight: 10, strokeOpacity: 1, zIndex: 1 })
  const line = new g.Polyline({ map, path: [], strokeColor: MAP_COLORS.ROUTE, strokeWeight: 6, strokeOpacity: 1, zIndex: 2 })
  const ends = [new g.Marker({ map, position: route.from, icon: endIcon(g, 'A'), zIndex: 1001 }), new g.Marker({ map, position: route.to, icon: endIcon(g, 'B'), zIndex: 1001 })]
  const t0 = performance.now()
  let raf = 0
  const step = (now) => {
    const k = reducedMotion() ? 1 : Math.min(1, (now - t0) / REVEAL_MS)
    const part = path.slice(0, Math.max(2, Math.ceil((1 - (1 - k) ** 3) * path.length)))
    casing.setPath(part)
    line.setPath(part)
    if (k < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
  return () => { cancelAnimationFrame(raf); [casing, line, ...ends].forEach((o) => o.setMap(null)) }
}

/** Glide like Google Maps' locate button: pan first, then one zoom level at a time. */
function flyTo(g, map, p, target) {
  map.panTo(p)
  const step = () => {
    const z = map.getZoom()
    if (z === target) return
    g.event.addListenerOnce(map, 'idle', () => setTimeout(step, ZOOM_STEP_MS))
    map.setZoom(z + (z < target ? 1 : -1))
  }
  setTimeout(step, ZOOM_STEP_MS * 3)
}

/** Zoom to the whole route, or to the driver + nearby pumps, clear of the header and sheet. */
function fit(g, map, { me, route, stations, pad }) {
  const bounds = new g.LatLngBounds()
  if (route) route.points.forEach(([lat, lng]) => bounds.extend({ lat, lng }))
  else {
    if (me) bounds.extend(me)
    stations.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }))
  }
  if (!bounds.isEmpty()) map.fitBounds(bounds, pad)
}

/** Pump pins (dropped in once per result set) whose icon grows when selected. */
function usePins(ready, map, { stations, fuel, selectedId, onSelect }) {
  const pins = useRef(new Map())
  const select = useRef(onSelect)
  select.current = onSelect
  useEffect(() => {
    if (!ready) return undefined
    const g = window.google.maps
    const drop = reducedMotion() ? null : g.Animation.DROP
    stations.forEach((s) => {
      const pin = new g.Marker({ map: map.current, position: { lat: s.lat, lng: s.lng }, title: s.name, icon: pumpIcon(g, { fuel, selected: false }), animation: drop })
      pin.addListener('click', () => select.current(s.id))
      pins.current.set(s.id, pin)
    })
    const all = pins.current
    return () => { all.forEach((p) => p.setMap(null)); all.clear() }
  }, [ready, map, stations, fuel])
  useEffect(() => {
    if (!ready) return
    const g = window.google.maps
    pins.current.forEach((pin, id) => {
      const on = id === selectedId
      pin.setIcon(pumpIcon(g, { fuel, selected: on }))
      pin.setZIndex(on ? 999 : 1)
    })
  }, [ready, selectedId, fuel, stations])
}

/** Full-bleed Google map of pumps (and the road when `route` is given). Ref exposes `locate()`. */
export const FuelMap = forwardRef(function FuelMap({ me: given, route, stations, fuel, selectedId, onSelect, pad }, ref) {
  const t = useTranslations('seva.fuel.map')
  const box = useRef(null)
  const map = useRef(null)
  const [state, setState] = useState(KEY ? 'loading' : 'failed')
  const [located, setLocated] = useState(null) // from the locate button; wins over the screen's position
  const me = located || given
  const ready = state === 'ready'

  useImperativeHandle(ref, () => ({
    /** Fresh GPS fix → dot + glide in. Throws when location is off so the caller can say so. */
    locate: async () => {
      const p = await getCurrentPosition()
      setLocated(p)
      if (map.current) flyTo(window.google.maps, map.current, p, LOCATE_ZOOM)
    },
  }), [])

  useEffect(() => {
    if (!KEY) return undefined
    let live = true
    loadMaps().then((g) => {
      if (!live) return
      map.current = new g.Map(box.current, { center: me || FALLBACK_CENTER, zoom: 11, disableDefaultUI: true, clickableIcons: false, gestureHandling: 'greedy', styles: STYLES })
      setState('ready')
    }, (err) => {
      console.warn('[fuel] map failed to load', err?.message)
      if (live) setState('failed')
    })
    return () => { live = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- create the map once; overlays update below

  usePins(ready, map, { stations, fuel, selectedId, onSelect })
  useEffect(() => (ready && route ? drawRoute(window.google.maps, map.current, route) : undefined), [ready, route])
  useEffect(() => {
    if (!ready || !me) return undefined
    const dot = new window.google.maps.Marker({ map: map.current, position: me, icon: meIcon(window.google.maps), zIndex: 1002 })
    return () => dot.setMap(null)
  }, [ready, me])
  useEffect(() => {
    if (ready) fit(window.google.maps, map.current, { me: given, route, stations, pad })
  }, [ready, given, route, stations]) // eslint-disable-line react-hooks/exhaustive-deps -- pad is a constant per screen
  useEffect(() => {
    const s = ready && stations.find((x) => x.id === selectedId)
    if (s) map.current.panTo({ lat: s.lat, lng: s.lng })
  }, [ready, selectedId]) // eslint-disable-line react-hooks/exhaustive-deps -- only when the driver picks a pump

  return (
    <div className="absolute inset-0 bg-ec-line/40">
      <div ref={box} className="h-full w-full" aria-label={t('label')} role="region" />
      {state === 'loading' && <div aria-hidden="true" className="ec-shimmer absolute inset-0" />}
      {state === 'failed' && (
        <p className="absolute inset-x-6 top-1/3 text-center text-[13px] font-bold text-ec-ink60">{t('error')}</p>
      )}
    </div>
  )
})
