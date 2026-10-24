import { useEffect, useRef, useState } from 'react'
import { PUSH } from '@easecab/shared'
import { usePushPreferences } from '@/features/notifications/hooks/usePushPreferences'
import { readCityLock, writeCityLock } from '../lib/cityLock'

/**
 * The feed city filter, paired with ride alerts: ONE list stored server-side as the
 * user's notificationCities (empty = All rides + alerts for every ride). The cookie
 * lock is only a fast first paint before the preferences load, and is rewritten from
 * the server copy each time it arrives. One-time adoption: an older user whose server
 * list is empty but whose device cookie holds a filter gets that filter saved.
 *
 * @returns {{ selected: {id: string, name: string}[], toggle: (city: {id: string, name: string}) => void, clear: () => void }}
 */
export function useCityFilter() {
  const { prefs, update } = usePushPreferences()
  const [selected, setSelected] = useState([])
  const adopted = useRef(false)

  // Hydrate from the cookie after mount (cookie read can't run on the server).
  useEffect(() => { setSelected(readCityLock()) }, [])

  useEffect(() => {
    if (!prefs) return
    const server = prefs.cities ?? []
    if (!adopted.current) {
      adopted.current = true
      const local = readCityLock().slice(0, PUSH.NOTIFICATION_CITIES_MAX)
      if (server.length === 0 && local.length > 0) {
        update({ notificationCities: local.map((c) => c.id) })
        return
      }
    }
    writeCityLock(server)
    setSelected(server)
  }, [prefs]) // eslint-disable-line react-hooks/exhaustive-deps -- `update` is a fresh closure each render

  const save = (next) => {
    writeCityLock(next)
    setSelected(next)
    update({ notificationCities: next.map((c) => c.id) })
  }

  const toggle = (city) => {
    const on = selected.some((c) => c.id === city.id)
    if (!on && selected.length >= PUSH.NOTIFICATION_CITIES_MAX) return // server cap
    save(on ? selected.filter((c) => c.id !== city.id) : [...selected, { id: city.id, name: city.name }])
  }

  return { selected, toggle, clear: () => save([]) }
}
