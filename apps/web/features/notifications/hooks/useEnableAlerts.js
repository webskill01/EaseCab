import { useState } from 'react'
import { requestPermissionAndToken } from '../services/fcmClient'
import { registerToken, updatePreferences } from '../services/pushApi'
import { getCurrentPosition } from '../services/geoClient'
import { nearestCity } from '@/features/rides/services/citiesApi'
import { setStoredToken } from '../lib/pushStorage'

/**
 * Full "enable alerts" flow (Step 23): OS notification prompt → FCM token →
 * register + cache → OS geo prompt → nearest city → save as an alert city. Geo is
 * best-effort: a denial leaves notifications on with no city preset. Never throws.
 */
export function useEnableAlerts() {
  const [isEnabling, setIsEnabling] = useState(false)
  const [permission, setPermission] = useState(null)
  const [suggestion, setSuggestion] = useState(null)

  async function enable() {
    setIsEnabling(true)
    try {
      const { permission: perm, token } = await requestPermissionAndToken()
      setPermission(perm)
      if (perm !== 'granted' || !token) return { permission: perm, city: null }
      await registerToken({ deviceToken: token, platform: 'web' })
      setStoredToken(token)
      let city = null
      try {
        const pos = await getCurrentPosition()
        city = await nearestCity(pos)
        if (city) await updatePreferences({ notificationCities: [city.id] })
      } catch { /* geo optional — notifications already enabled */ }
      setSuggestion(city)
      return { permission: 'granted', city }
    } finally {
      setIsEnabling(false)
    }
  }

  return { enable, isEnabling, permission, suggestion }
}
