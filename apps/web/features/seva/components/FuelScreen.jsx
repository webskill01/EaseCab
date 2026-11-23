'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { FUEL_TYPES } from '@easecab/shared'
import { Plus, CurrentLocation, Spinner } from '@/components/ui/icons'
import { Bar } from '@/components/ui/Skeleton'
import { getCurrentPosition, geoDenied } from '@/features/notifications/services/geoClient'
import { CityPicker } from '@/features/rides/components/CityPicker'
import { useNearby, useCityPumps, useFuelActions, savedFuel, saveFuel } from '../hooks/useFuel'
import { AddFuelStationSheet } from './AddFuelStationSheet'
import { FuelMap } from './FuelMap'
import { FuelOverlay, MODES } from './FuelOverlay'
import { FuelSheet, SNAPS, PEEK_PX, TOP_PX } from './FuelSheet'
import { FuelStationRow, FuelStationDetail } from './FuelStationCard'
import { useRouteFuel, RoutePickers, RouteOptions, routeTitle } from './RouteFuel'

const EMPTY = Object.freeze([])
const MAP_PAD = Object.freeze({ top: TOP_PX, bottom: PEEK_PX + 16, left: 40, right: 40 })
const TOAST_MS = 4000

/** Asks for the phone's position; geo = { pos } | { error: 'denied' | 'failed' } | null while waiting. */
function usePosition() {
  const [geo, setGeo] = useState(null)
  const locate = useCallback(async () => {
    try {
      setGeo({ pos: await getCurrentPosition() })
    } catch {
      setGeo({ error: (await geoDenied()) ? 'denied' : 'failed' })
    }
  }, [])
  useEffect(() => { locate() }, [locate])
  return { ...geo, retry: () => { setGeo(null); locate() } }
}

/** Sheet title for "Near me": count of pumps, or what the list is waiting on. */
function nearTitle(t, geo, query, fuel) {
  if (geo.error) return { text: t('title') }
  if (!geo.pos || query.isLoading) return { text: t('loading'), busy: true }
  if (query.isError) return { text: t('error'), danger: true }
  return { text: t('sheet.count', { count: query.data?.length ?? 0, fuel: t(`types.${fuel}`) }) }
}

/** Sheet title for "City": what to pick, or the count of pumps in that city. */
function cityTitle(t, city, query, fuel) {
  if (!city) return { text: t('city.hint') }
  if (query.isLoading) return { text: t('loading'), busy: true }
  if (query.isError) return { text: t('error'), danger: true }
  return { text: t('city.count', { count: query.data?.stations.length ?? 0, fuel: t(`types.${fuel}`), city: city.name }) }
}

function SheetTitle({ title }) {
  const tone = title.danger ? 'text-ec-danger' : title.note ? 'text-ec-blueInk' : 'text-ec-ink'
  return (
    <h2 className={`flex items-center gap-2 pt-1 text-[16px] font-extrabold leading-snug [text-wrap:balance] ${tone}`}>
      {title.busy && <Spinner size={16} className="shrink-0 animate-spin text-ec-blue" />}
      <span>{title.text}</span>
    </h2>
  )
}

const RowsSkeleton = () => (
  <div aria-hidden="true" className="ec-shimmer space-y-4 py-3">
    {[0, 1, 2].map((i) => (
      <div key={i} className="flex items-center gap-3">
        <Bar className="h-10 w-10 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2"><Bar className="h-3.5 w-2/3" /><Bar className="h-3 w-5/12" /></div>
      </div>
    ))}
  </div>
)

const Note = ({ children }) => <p className="py-6 text-center text-[13.5px] font-medium text-ec-ink60">{children}</p>

/** "Near me" body: location fix, loading, error, empty, or the rows + add-a-pump. */
function NearBody({ geo, query, rows, onAdd }) {
  const t = useTranslations('seva.fuel')
  if (geo.error) {
    return (
      <div className="py-6 text-center">
        <p className="text-[14px] font-bold text-ec-ink">{t(`geo.${geo.error}`)}</p>
        <button type="button" onClick={geo.retry} className="mt-3 h-10 rounded-ec-chip bg-ec-blue px-5 text-[14px] font-bold text-white active:scale-95">{t('geo.retry')}</button>
      </div>
    )
  }
  if (!geo.pos || query.isLoading) return <RowsSkeleton />
  if (query.isError) return <button type="button" onClick={() => query.refetch()} className="mx-auto mt-4 block h-10 rounded-ec-chip border border-ec-line px-5 text-[14px] font-bold text-ec-ink">{t('geo.retry')}</button>
  return (
    <>
      {query.data?.length ? rows : <Note>{t('empty')}</Note>}
      <button type="button" onClick={onAdd} className="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-ec-chip border border-dashed border-ec-blue text-[14px] font-bold text-ec-blue active:bg-ec-sky">
        <Plus size={18} /> {t('add.cta')}
      </button>
    </>
  )
}

/** Driver's search + map + sheet state; split out so the screen stays a layout. */
function useFuelScreen() {
  const geo = usePosition()
  const [fuel, setFuel] = useState(FUEL_TYPES.CNG)
  const [mode, setMode] = useState(MODES.NEAR)
  const [snap, setSnap] = useState(SNAPS.PEEK)
  const [selectedId, setSelectedId] = useState(null)
  const [city, setCity] = useState(null)
  const near = useNearby(geo.pos, fuel)
  const inCity = useCityPumps(city?.id, fuel)
  const r = useRouteFuel(geo, fuel, () => setSnap(SNAPS.PEEK)) // destination picked → drop the sheet so the road shows
  const isRoute = mode === MODES.ROUTE
  const isCity = mode === MODES.CITY
  const stations = (isRoute ? r.stations : isCity ? inCity.data?.stations : near.data) ?? EMPTY
  const pickCity = (c) => { setCity(c); setSelectedId(null); setSnap(SNAPS.PEEK) }

  useEffect(() => { setFuel(savedFuel()) }, []) // after mount: localStorage is client-only
  const pickFuel = (f) => { setFuel(f); saveFuel(f); setSelectedId(null) }
  const pickMode = (m) => { setMode(m); setSelectedId(null); setSnap(m !== MODES.NEAR ? SNAPS.HALF : SNAPS.PEEK) }
  const open = useCallback((id) => { setSelectedId(id); setSnap(SNAPS.PEEK) }, [])
  return { geo, fuel, mode, isRoute, isCity, city, pickCity, inCity, snap, setSnap, near, r, stations, selected: stations.find((s) => s.id === selectedId), open, close: () => setSelectedId(null), pickFuel, pickMode }
}

/** Seva → Fuel: full-screen map of CNG / petrol / diesel pumps under a draggable list sheet. */
export function FuelScreen() {
  const t = useTranslations('seva.fuel')
  const tr = useTranslations('seva.fuel.route')
  const router = useRouter()
  const s = useFuelScreen()
  const mapRef = useRef(null)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState(null)
  const [added, setAdded] = useState(false)
  const [locErr, setLocErr] = useState(false)
  const { add, report } = useFuelActions()
  const route = s.isRoute ? s.r.route : null

  useEffect(() => {
    if (!locErr) return undefined
    const id = setTimeout(() => setLocErr(false), TOAST_MS)
    return () => clearTimeout(id)
  }, [locErr])
  const locate = () => mapRef.current?.locate().catch((err) => { console.warn('[fuel] locate failed', err?.message); setLocErr(true) })
  const submitAdd = (body) => add.mutate(body, {
    onSuccess: () => { setAdding(false); setAdded(true) },
    onError: (e) => setAddError(e.code === 'RATE_LIMITED' ? 'add.limit' : 'error'),
  })
  const rows = (
    <ul>{s.stations.map((st, i) => <FuelStationRow key={st.id} station={st} fuel={s.fuel} route={route} fromCentre={s.isCity} index={i} onOpen={s.open} />)}</ul>
  )
  const title = s.isRoute ? routeTitle(tr, s.r, s.geo) : s.isCity ? cityTitle(t, s.city, s.inCity, s.fuel) : nearTitle(t, s.geo, s.near, s.fuel)

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden bg-ec-bg">
      <FuelMap ref={mapRef} me={s.isCity || (s.isRoute && s.r.fromCity) ? null : s.geo.pos} route={route} alts={s.isRoute ? s.r.alts : undefined} onPickRoute={s.r.setPick} stations={s.stations} fuel={s.fuel} selectedId={s.selected?.id} onSelect={s.open} pad={MAP_PAD} />
      <FuelOverlay mode={s.mode} onMode={s.pickMode} fuel={s.fuel} onFuel={s.pickFuel} onBack={() => (window.history.length > 1 ? router.back() : router.push('/seva'))} />
      {locErr && <p role="alert" className="absolute inset-x-6 top-28 z-20 animate-ec-fade rounded-ec-chip bg-ec-ink px-4 py-2.5 text-center text-[12.5px] font-bold text-white shadow-ec-float">{t('map.locateFailed')}</p>}
      <FuelSheet snap={s.snap} onSnap={s.setSnap} header={s.selected ? null : <SheetTitle title={title} />}
        aside={<button type="button" onClick={locate} aria-label={t('map.locate')} className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-ec-blueInk shadow-ec-float active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-blue"><CurrentLocation size={22} /></button>}>
        {added && <p role="status" className="mb-2 animate-ec-fade rounded-xl bg-ec-successBg px-3 py-2 text-[13px] font-bold text-ec-successTx">{t('add.done')}</p>}
        {s.selected ? (
          <FuelStationDetail key={s.selected.id} station={s.selected} fuel={s.fuel} route={route} fromCentre={s.isCity} onReport={(id, kind) => report.mutate({ id, kind })} onClose={s.close} />
        ) : s.isRoute ? (
          <><RoutePickers r={s.r} /><RouteOptions r={s.r} />{s.r.stations?.length === 0 ? <Note>{t('route.empty')}</Note> : rows}</>
        ) : s.isCity ? (
          <>
            <div className="pb-1"><CityPicker label={t('city.label')} value={s.city} onPick={s.pickCity} /></div>
            {s.inCity.isLoading ? <RowsSkeleton /> : s.inCity.data?.stations.length === 0 ? <Note>{t('city.empty')}</Note> : rows}
          </>
        ) : (
          <NearBody geo={s.geo} query={s.near} rows={rows} onAdd={() => { setAddError(null); setAdding(true) }} />
        )}
        <p className="mt-5 text-center text-[11.5px] font-medium leading-relaxed text-ec-ink40">{t('disclaimer')}</p>
      </FuelSheet>
      {adding && <AddFuelStationSheet pos={s.geo.pos} defaultFuel={s.fuel} pending={add.isPending} error={addError} onSubmit={submitAdd} onClose={() => setAdding(false)} />}
    </div>
  )
}
