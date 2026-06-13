import { useCallback, useEffect, useRef, useState } from 'react'
import { markRideViewed, getViewedCount } from '../lib/pushStorage'

/**
 * Tracks how many distinct ride cards the user has actually seen (Step 23), using a
 * single IntersectionObserver. `observe(el, rideId)` is a ref callback for each card
 * wrapper. Disabled (e.g. once the prompt is resolved) → no-op. SSR/no-IO safe.
 */
export function useRideViewTracker({ enabled }) {
  const [viewedCount, setViewedCount] = useState(() => getViewedCount())
  const observerRef = useRef(null)

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return undefined
    const obs = new IntersectionObserver((entries) => {
      let changed = false
      for (const e of entries) {
        if (e.isIntersecting && e.target.dataset.rideId) {
          markRideViewed(e.target.dataset.rideId)
          changed = true
        }
      }
      if (changed) setViewedCount(getViewedCount())
    }, { threshold: 0.5 })
    observerRef.current = obs
    return () => obs.disconnect()
  }, [enabled])

  const observe = useCallback((el, rideId) => {
    if (!el || !observerRef.current) return
    el.dataset.rideId = rideId
    observerRef.current.observe(el)
  }, [])

  return { observe, viewedCount }
}
