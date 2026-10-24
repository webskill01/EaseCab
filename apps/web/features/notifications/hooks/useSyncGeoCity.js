import { useEffect, useRef } from 'react'
import { usePushPreferences } from './usePushPreferences'
import { geoGranted, getCurrentPosition } from '../services/geoClient'
import { nearestCity } from '@/features/rides/services/citiesApi'

/**
 * Geo alerts follow the driver: once per app open, when geo alerts are on and location is
 * already allowed (never prompts on boot), re-resolve the nearest city and save it if the
 * driver has moved. Best-effort — a failure keeps the last saved city.
 */
export function useSyncGeoCity() {
  const { prefs, update } = usePushPreferences()
  const ran = useRef(false)
  useEffect(() => {
    if (ran.current || !prefs?.notifyGeoCityId) return
    ran.current = true
    ;(async () => {
      try {
        if (!(await geoGranted())) return
        const city = await nearestCity(await getCurrentPosition())
        if (city && city.id !== prefs.notifyGeoCityId) update({ notifyGeoCityId: city.id })
      } catch {
        // offline / timeout — keep the saved geo city
      }
    })()
  }, [prefs]) // eslint-disable-line react-hooks/exhaustive-deps -- `update` is a fresh closure each render
}
