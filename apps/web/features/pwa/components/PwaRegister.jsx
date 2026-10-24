'use client'

import { useEffect } from 'react'
import { registerAppShellSW } from '../services/swClient'
import { markBubbleSupport } from '../services/twaBubble'

/** Registers the app-shell service worker once on mount. Renders nothing. */
export function PwaRegister() {
  useEffect(() => {
    markBubbleSupport()
    registerAppShellSW()
  }, [])
  return null
}
