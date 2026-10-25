'use client'

import { useEffect, useState } from 'react'

/**
 * useState that survives leaving the page (e.g. opening a profile and coming back) for the
 * rest of the browser tab's life. Panel pages render client-only behind AdminGuard, so
 * reading sessionStorage on first render can't cause a hydration mismatch.
 */
export function useSessionState(key, initial) {
  const storageKey = `admin:${key}`
  const [value, setValue] = useState(() => {
    try {
      const saved = sessionStorage.getItem(storageKey)
      return saved === null ? initial : JSON.parse(saved)
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(value)) } catch { /* private mode: just don't persist */ }
  }, [storageKey, value])
  return [value, setValue]
}
