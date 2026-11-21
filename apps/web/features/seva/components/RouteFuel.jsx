'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { CityPicker } from '@/features/rides/components/CityPicker'
import { useRoute } from '../hooks/useFuel'

/** "On my route" state: From (my location or a city) → To city → the road + pumps on it. */
export function useRouteFuel(geo, fuel, onTo) {
  const [fromCity, setFromCity] = useState(null) // null = the phone's position
  const [toCity, setToCity] = useState(null)
  const from = fromCity ? { cityId: fromCity.id } : geo.pos || null
  const query = useRoute(from, toCity?.id, fuel)
  const data = query.data
  const route = useMemo(() => data && { ...data.route, fromMe: !fromCity }, [data, fromCity]) // stable → map doesn't redraw per render
  const pickTo = (c) => { setToCity(c); onTo?.() }
  return { fromCity, setFromCity, toCity, setToCity: pickTo, from, query, route, stations: data?.stations }
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

/** Sheet title for route mode: what's missing, or distance + time + pump count. */
export function routeTitle(t, r, geo) {
  if (!r.toCity) return { text: t('hint') }
  if (!r.from) return { text: geo.error ? t('needFrom') : t('loading') }
  if (r.query.isLoading) return { text: t('loading'), busy: true }
  if (r.query.isError) return { text: t('error'), danger: true }
  if (!r.route) return { text: t('loading'), busy: true }
  const count = r.stations.length
  if (r.route.approx) return { text: t('approx', { count }), note: true }
  return { text: t('summary', { km: Math.round(r.route.distanceKm), hrs: (r.route.durationMin / 60).toFixed(1), count }) }
}
