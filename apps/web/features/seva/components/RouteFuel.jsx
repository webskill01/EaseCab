'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { CityPicker } from '@/features/rides/components/CityPicker'
import { useRoute } from '../hooks/useFuel'

const hrs = (min) => (min / 60).toFixed(1)

/** "On my route" state: From (my location or a city) → To city → road options, the picked road + its pumps. */
export function useRouteFuel(geo, fuel, onTo) {
  const [fromCity, setFromCity] = useState(null) // null = the phone's position
  const [toCity, setToCity] = useState(null)
  const [picked, setPicked] = useState({ data: null, i: 0 })
  const from = fromCity ? { cityId: fromCity.id } : geo.pos || null
  const query = useRoute(from, toCity?.id, fuel)
  const data = query.data
  const pick = picked.data === data ? picked.i : 0 // new search → Google's first (fastest) road
  const setPick = (i) => setPicked({ data, i })
  const options = data?.routes
  // stable objects → the map doesn't redraw per render
  const route = useMemo(() => options?.[pick] && { ...options[pick], from: data.from, to: data.to, fromMe: !fromCity }, [data, options, pick, fromCity])
  const alts = useMemo(() => (options || []).map((o, i) => ({ points: o.points, index: i })).filter((o) => o.index !== pick), [options, pick])
  const pickTo = (c) => { setToCity(c); onTo?.() }
  return { fromCity, setFromCity, toCity, setToCity: pickTo, from, query, route, alts, options, pick, setPick, stations: route?.stations }
}

/** The two city fields at the top of the sheet. */
export function RoutePickers({ r }) {
  const t = useTranslations('seva.fuel.route')
  return (
    <div className="space-y-2 pb-1">
      <CityPicker label={t('fromMe')} value={r.fromCity} onPick={r.setFromCity} />
      {r.fromCity && <button type="button" onClick={() => r.setFromCity(null)} className="px-1 text-[12.5px] font-bold text-ec-blue">{t('useMe')}</button>}
      <CityPicker label={t('to')} value={r.toCity} onPick={r.setToCity} />
    </div>
  )
}

/** Google's road choices (2-3) as cards: road name, km, time, pumps on it. Hidden when there is one road. */
export function RouteOptions({ r }) {
  const t = useTranslations('seva.fuel.route')
  if (!r.options || r.options.length < 2) return null
  return (
    <div role="radiogroup" aria-label={t('options')} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 pt-2 [scrollbar-width:none]">
      {r.options.map((o, i) => {
        const on = i === r.pick
        return (
          <button key={i} type="button" role="radio" aria-checked={on} onClick={() => r.setPick(i)}
            className={`min-w-[132px] shrink-0 rounded-xl border px-3 py-2 text-left transition-colors duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-blue ${on ? 'border-ec-blue bg-ec-sky' : 'border-ec-line bg-white'}`}>
            <span className={`block truncate text-[13px] font-extrabold ${on ? 'text-ec-blueInk' : 'text-ec-ink'}`}>{o.label ? t('via', { road: o.label }) : t('option', { n: i + 1 })}</span>
            <span className="block text-[12px] font-semibold tabular-nums text-ec-ink60">{t('optionMeta', { km: Math.round(o.distanceKm), hrs: hrs(o.durationMin) })}</span>
            <span className="block text-[12px] font-bold text-ec-blue">{t('optionPumps', { count: o.stations.length })}</span>
          </button>
        )
      })}
    </div>
  )
}

/** Sheet title for route mode: what's missing, or distance + time + pump count. */
export function routeTitle(t, r, geo) {
  if (!r.toCity) return { text: t('hint') }
  if (!r.from) return { text: geo.error ? t('needFrom') : t('loading') }
  if (r.query.isLoading) return { text: t('loading'), busy: true }
  if (r.query.isError) return { text: t('error'), danger: true }
  if (!r.route) return { text: t('loading'), busy: true }
  const count = r.stations.length
  if (r.route.approx) return { text: t('approx', { count }), note: true }
  return { text: t('summary', { km: Math.round(r.route.distanceKm), hrs: hrs(r.route.durationMin), count }) }
}
