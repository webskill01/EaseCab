'use client'

import { PUSH } from '@easecab/shared'
import { usePushPreferences } from '@/features/notifications/hooks/usePushPreferences'
import { GROUP_KEY } from '../lib/groupView'

/**
 * Per-group alert bells on top of the existing push prefs (no new server state):
 * Driver Duties = notifyPostedRides; Mix Duty = bot alerts for every city (empty city list);
 * a city group = that city is in notificationCities (the same list as the app-mode Filter).
 */
export function useGroupAlerts(groupIds) {
  const { prefs, update } = usePushPreferences()
  const ids = (prefs?.cities ?? []).map((c) => c.id)
  const bot = prefs?.notifyBotRides !== false
  const isOn = (key) => {
    if (key === GROUP_KEY.DUTIES) return prefs?.notifyPostedRides !== false
    if (key === GROUP_KEY.ALL) return bot && ids.length === 0
    return bot && (ids.length === 0 || ids.includes(key))
  }
  // Turning bot alerts down to "these cities": empty list would mean ALL, so none left = bot alerts off.
  const narrow = (next) => update(next.length ? { notificationCities: next } : { notifyBotRides: false })
  const toggle = (key) => {
    const on = isOn(key)
    if (key === GROUP_KEY.DUTIES) return update({ notifyPostedRides: !on })
    if (key === GROUP_KEY.ALL) return on ? narrow(groupIds.slice(0, PUSH.NOTIFICATION_CITIES_MAX)) : update({ notifyBotRides: true, notificationCities: [] })
    if (on) return narrow((ids.length ? ids : groupIds).filter((x) => x !== key))
    const base = bot ? ids : []
    if (base.length >= PUSH.NOTIFICATION_CITIES_MAX) return undefined // server cap
    return update({ notifyBotRides: true, notificationCities: [...base, key] })
  }
  return { ready: Boolean(prefs), isOn, toggle }
}
