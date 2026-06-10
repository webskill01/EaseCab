import { useEffect, useRef, useState } from 'react'

/** Connection status surfaced to the feed (drives the "reconnecting" affordance). */
export const STREAM_STATUS = Object.freeze({
  IDLE: 'idle',
  CONNECTING: 'connecting',
  LIVE: 'live',
  RECONNECTING: 'reconnecting',
})

const BASE_RECONNECT_MS = 1000
const MAX_RECONNECT_MS = 30000

/**
 * Subscribe to the rides SSE stream with exponential-backoff reconnect (§12/§15).
 * EventSource carries the httpOnly cookie via `withCredentials`. The latest `onRide`
 * is held in a ref so a re-render never tears down the connection. Returns the live
 * connection status. No-ops cleanly on the server / where EventSource is absent.
 *
 * @param {object} args
 * @param {string} args.url - absolute SSE endpoint
 * @param {boolean} [args.enabled] - open the stream (false → idle + closed)
 * @param {(ride: object) => void} args.onRide - called with each parsed `ride` event
 * @returns {string} one of STREAM_STATUS
 */
export function useRideStream({ url, enabled = true, onRide }) {
  const [status, setStatus] = useState(STREAM_STATUS.IDLE)
  const onRideRef = useRef(onRide)
  onRideRef.current = onRide

  useEffect(() => {
    const ES = typeof globalThis !== 'undefined' ? globalThis.EventSource : undefined
    if (!enabled || !url || !ES) {
      setStatus(STREAM_STATUS.IDLE)
      return undefined
    }

    let es
    let timer
    let backoff = BASE_RECONNECT_MS
    let closed = false

    const connect = () => {
      if (closed) return
      es = new ES(url, { withCredentials: true })

      es.onopen = () => {
        backoff = BASE_RECONNECT_MS // healthy connection → reset the backoff
        setStatus(STREAM_STATUS.LIVE)
      }
      es.addEventListener('ride', (e) => {
        try {
          onRideRef.current(JSON.parse(e.data))
        } catch {
          // malformed event — ignore, never throw inside the SSE callback
        }
      })
      es.onerror = () => {
        // The browser would auto-retry, but we want a capped exponential backoff and
        // a visible "reconnecting" state. Close, then reschedule ourselves.
        try { es.close() } catch { /* already closed */ }
        if (closed) return
        setStatus(STREAM_STATUS.RECONNECTING)
        timer = setTimeout(connect, backoff)
        backoff = Math.min(backoff * 2, MAX_RECONNECT_MS)
      }
    }

    setStatus(STREAM_STATUS.CONNECTING)
    connect()

    return () => {
      closed = true
      clearTimeout(timer)
      try { es?.close() } catch { /* nothing to close */ }
    }
  }, [url, enabled])

  return status
}
