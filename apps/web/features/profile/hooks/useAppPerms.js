import { useCallback, useEffect, useState } from 'react'
import { requestPermissionAndToken } from '@/features/notifications/services/fcmClient'
import { PERM, normPerm } from '../lib/appPerms'

/**
 * Live app-permission state for the Profile sheet (T2-D). Reads the real browser
 * state for the two permissions the web platform exposes — Notifications and
 * Geolocation — and lets the user trigger the OS prompt. Battery optimization is an
 * Android/TWA phone setting with no web API, so it isn't modelled here (the sheet
 * shows it as an informational row).
 */
export function useAppPerms() {
  const [push, setPush] = useState(PERM.UNSUPPORTED)
  const [location, setLocation] = useState(PERM.UNSUPPORTED)

  const readPush = useCallback(() => {
    setPush(typeof Notification === 'undefined' ? PERM.UNSUPPORTED : normPerm(Notification.permission))
  }, [])

  const readLocation = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return setLocation(PERM.UNSUPPORTED)
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' })
      setLocation(normPerm(status.state))
    } catch {
      // Some browsers don't recognise the 'geolocation' descriptor — show read-only.
      setLocation(PERM.UNSUPPORTED)
    }
  }, [])

  useEffect(() => { readPush(); readLocation() }, [readPush, readLocation])

  const requestPush = useCallback(async () => {
    await requestPermissionAndToken() // surfaces the OS prompt (reused from notifications)
    readPush()
  }, [readPush])

  const requestLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    // getCurrentPosition is what actually surfaces the prompt; re-read either way.
    navigator.geolocation.getCurrentPosition(readLocation, readLocation)
  }, [readLocation])

  return { push, location, requestPush, requestLocation }
}
