'use client'

import { useEffect } from 'react'
import { registerAppShellSW } from '../services/swClient'

/** Registers the app-shell service worker once on mount. Renders nothing. */
export function PwaRegister() {
  useEffect(() => {
    registerAppShellSW()
  }, [])
  return null
}
