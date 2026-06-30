import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listRides, listVerifiedRides, RIDES_STREAM_URL } from '../services/ridesApi'
import { toBotVM, toVerifiedVM, matchesCity } from '../lib/normalize'
import { useRideStream, STREAM_STATUS } from './useRideStream'

/** Feed sub-tabs. Live SSE backs the bot feed only; verified is query-driven. */
export const FEED_SUB = Object.freeze({ RIDES: 'rides', VERIFIED: 'verified' })

const LIVE_CAP = 14 // max live-prepended rides held at the top
const PENDING_CAP = 20 // max queued rides while the user is scrolled down
const AGE_TICK_MS = 20000 // re-render cadence so cards cross the fresh→booked line live
const AT_TOP_PX = 24

/** Merge live + base rides, newest-first, de-duplicated by id (live wins). */
function mergeDedup(extra, base) {
  const seen = new Set()
  const out = []
  for (const r of [...extra, ...base]) {
    if (seen.has(r.id)) continue
    seen.add(r.id)
    out.push(r)
  }
  return out
}

/**
 * The rides feed state machine: an initial TanStack page + a live SSE merge with the
 * "new rides" queue, the live city-filter lock, and a 20s age tick. Bot rides stream
 * live; the verified tab is query-only. Returns everything the FeedScreen needs.
 *
 * @param {object} args
 * @param {string} args.sub - FEED_SUB value
 * @param {string[]} args.cityIds - locked City ids ([] = All)
 */
export function useRidesFeed({ sub, cityIds }) {
  const isVerified = sub === FEED_SUB.VERIFIED

  // Stable key + array identity from the (possibly new-each-render) cityIds prop, so
  // the query, the reset effect, and the live filter don't churn on every render.
  const cityKey = (cityIds || []).join(',')
  const ids = useMemo(() => (cityKey ? cityKey.split(',') : []), [cityKey])

  const query = useQuery({
    queryKey: ['feed', sub, cityKey || 'all'],
    queryFn: () => (isVerified ? listVerifiedRides({ cityIds: ids }) : listRides({ cityIds: ids })),
    staleTime: 0, // SSE-driven (§15)
  })

  const base = useMemo(() => {
    const data = query.data
    if (!data) return []
    return isVerified ? data.posts.map(toVerifiedVM) : data.rides.map(toBotVM)
  }, [query.data, isVerified])

  const [extra, setExtra] = useState([]) // auto-prepended (user at top)
  const [pending, setPending] = useState([]) // queued (user scrolled down)
  const [atTop, setAtTop] = useState(true)
  const [now, setNow] = useState(() => Date.now())
  const atTopRef = useRef(true)
  const scrollRef = useRef(null)

  // Reset the live overlays whenever the tab or city lock changes (the query refetches).
  useEffect(() => {
    setExtra([])
    setPending([])
    setAtTop(true)
    atTopRef.current = true
  }, [sub, cityKey])

  // Age tick — cards recompute fresh/booked from receivedAt vs `now`.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), AGE_TICK_MS)
    return () => clearInterval(id)
  }, [])

  // A live bot ride: drop it if it doesn't touch the locked city; otherwise prepend
  // (at top) or queue (scrolled down) so the user's scroll position is never yanked.
  const handleLiveRide = useCallback((raw) => {
    const vm = toBotVM(raw)
    if (!matchesCity(vm, ids)) return
    setNow(Date.now())
    if (atTopRef.current) setExtra((e) => [vm, ...e].slice(0, LIVE_CAP))
    else setPending((p) => [vm, ...p].slice(0, PENDING_CAP))
  }, [ids])

  const streamStatus = useRideStream({
    url: RIDES_STREAM_URL,
    enabled: !isVerified, // SSE is the bot feed only
    onRide: handleLiveRide,
  })

  const onScroll = useCallback((e) => {
    const top = (e?.target?.scrollTop ?? 0) < AT_TOP_PX
    atTopRef.current = top
    setAtTop(top)
    if (top) {
      // Returning to the top resumes the live merge — flush whatever queued.
      setPending((p) => {
        if (p.length) setExtra((ex) => [...p, ...ex].slice(0, LIVE_CAP))
        return p.length ? [] : p
      })
    }
  }, [])

  const flushPending = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    atTopRef.current = true
    setAtTop(true)
    setPending((p) => {
      if (p.length) setExtra((ex) => [...p, ...ex].slice(0, LIVE_CAP))
      return []
    })
  }, [])

  const rides = useMemo(() => mergeDedup(extra, base), [extra, base])

  return {
    rides,
    now,
    isLoading: query.isLoading,
    isError: query.isError,
    isEmpty: !query.isLoading && !query.isError && rides.length === 0,
    streamStatus,
    isReconnecting: streamStatus === STREAM_STATUS.RECONNECTING,
    pendingCount: pending.length,
    atTop,
    scrollRef,
    onScroll,
    flushPending,
    refetch: query.refetch,
  }
}
