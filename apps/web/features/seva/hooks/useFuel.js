import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FUEL_TYPES } from '@easecab/shared'
import { listNearby, cityStations, routeStations, addStation, reportStation } from '../services/fuelApi'

const KEY = ['fuel']
const PREF_KEY = 'ec_fuel'

/** Last fuel chip the driver picked (per device). ponytail: localStorage, move to the profile if drivers switch phones a lot. */
export function savedFuel() {
  try {
    const v = localStorage.getItem(PREF_KEY)
    return Object.values(FUEL_TYPES).includes(v) ? v : FUEL_TYPES.CNG
  } catch {
    return FUEL_TYPES.CNG
  }
}

export function saveFuel(fuel) {
  try { localStorage.setItem(PREF_KEY, fuel) } catch { /* private mode: chip just isn't remembered */ }
}

/** Nearby stations for a position + fuel; idle until the position is known. */
export function useNearby(pos, fuel) {
  return useQuery({
    queryKey: [...KEY, pos?.lat, pos?.lng, fuel],
    queryFn: () => listNearby({ ...pos, fuel }),
    enabled: Boolean(pos),
    staleTime: 60000,
  })
}

/** A picked city's pumps; idle until a city is picked. */
export function useCityPumps(cityId, fuel) {
  return useQuery({
    queryKey: [...KEY, 'city', cityId, fuel],
    queryFn: () => cityStations({ cityId, fuel }),
    enabled: Boolean(cityId),
    staleTime: 300000,
  })
}

/** Pumps on the way from `from` ({ cityId } | { lat, lng }) to a city; idle until both ends are known. */
export function useRoute(from, toCityId, fuel) {
  return useQuery({
    queryKey: [...KEY, 'route', from?.cityId, from?.lat, from?.lng, toCityId, fuel],
    queryFn: () => routeStations({ from, toCityId, fuel }),
    enabled: Boolean(from && toCityId),
    staleTime: 300000,
  })
}

export function useFuelActions() {
  const qc = useQueryClient()
  return {
    add: useMutation({ mutationFn: (body) => addStation(body) }),
    report: useMutation({
      mutationFn: ({ id, kind }) => reportStation(id, kind),
      onSuccess: (r) => r.applied && qc.invalidateQueries({ queryKey: KEY }),
    }),
  }
}
