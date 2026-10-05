import { useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { allCities } from '../services/citiesApi'
import { cityToView } from '../lib/allLocations'

/**
 * Canonical (English) city name → the active locale's script, via the cached
 * `/cities/all` list the All Locations overlay already loads. Display only — stored
 * profile/post data stays canonical. Unknown names (raw WA text) pass through.
 * @returns {(name: ?string) => ?string}
 */
export function useLocalCityName() {
  const locale = useLocale()
  const localized = locale === 'pa' || locale === 'hi'
  const { data: cities = [] } = useQuery({ queryKey: ['allCities'], queryFn: allCities, staleTime: 300000, enabled: localized })
  const byName = useMemo(() => new Map(cities.map((c) => [c.canonicalName, c])), [cities])
  return (name) => {
    const c = localized && name && byName.get(name)
    return c ? cityToView(c, locale).name : name
  }
}

/**
 * Vehicle label (shared VEHICLE_TYPES value) → localized via `rides.vehicles.*`;
 * anything outside the catalog is shown as-is.
 * @returns {(v: ?string) => ?string}
 */
export function useVehicleLabel() {
  const t = useTranslations('rides')
  return (v) => {
    const key = v ? `vehicles.${v.replace(/\s+/g, '')}` : null
    return key && t.has(key) ? t(key) : v
  }
}
