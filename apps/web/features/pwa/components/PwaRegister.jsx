'use client'

import { useEffect } from 'react'
import { registerAppShellSW } from '../services/swClient'
import { markBubbleSupport } from '../services/twaBubble'
import { captureNativeLaunch } from '@/features/notifications/services/nativePush'
import { captureInviteFromUrl } from '@/features/referrals/lib/invite'

/** Registers the app-shell service worker once on mount. Renders nothing. */
export function PwaRegister() {
  useEffect(() => {
    markBubbleSupport()
    captureInviteFromUrl()
    captureNativeLaunch()
    registerAppShellSW()
  }, [])
  return null
}
