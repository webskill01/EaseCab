'use client'

import { useRef } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRideStream } from '@/features/rides/hooks/useRideStream'
import { RIDES_STREAM_URL } from '@/features/rides/services/ridesApi'
import { getMembership } from '@/features/subscription/services/subscriptionApi'
import { membershipView, MEMBERSHIP_STATE } from '@/features/subscription/lib/membership'
import { getGroupSettings, saveGroupSettings, getGroupSummary, listGroupRides, listGroupDuties } from '../services/groupModeApi'
import { GROUP_KEY, readSeen, mergeThread } from '../lib/groupView'

const POLL_MS = 20000
const PAGE = 50

/** Toggle + saved groups + whether the user may use Group Mode (active membership). */
export function useGroupMode() {
  const qc = useQueryClient()
  const settings = useQuery({ queryKey: ['groupMode'], queryFn: getGroupSettings, staleTime: 300000, retry: false })
  const membership = useQuery({ queryKey: ['membership'], queryFn: getMembership, staleTime: 300000 })
  const paid = membership.data ? membershipView(membership.data).state === MEMBERSHIP_STATE.ACTIVE : false
  // Optimistic: the switch flips and removed groups vanish at once; the server reply (names
  // for added cities) lands after, and a failed save snaps back to the server state.
  // A slow earlier save (or an in-flight GET) must not land after a newer tap and flip it back:
  // cancel reads first, and only the LAST pending save writes the server reply.
  const save = useMutation({
    mutationKey: ['groupMode'],
    mutationFn: saveGroupSettings,
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ['groupMode'] })
      qc.setQueryData(['groupMode'], (d) => d && { ...d, enabled: v.enabled, groups: v.cityIds.map((id) => d.groups.find((g) => g.cityId === id)).filter(Boolean), pinned: v.pinned })
    },
    onSuccess: (d) => { if (qc.isMutating({ mutationKey: ['groupMode'] }) <= 1) qc.setQueryData(['groupMode'], d) },
    onError: () => qc.invalidateQueries({ queryKey: ['groupMode'] }),
  })
  const groups = settings.data?.groups ?? []
  const pinned = settings.data?.pinned ?? [GROUP_KEY.ALL]
  const put = (patch) => save.mutate({ enabled: Boolean(settings.data?.enabled), cityIds: groups.map((g) => g.cityId), pinned, ...patch })
  // Decide the screen once (no feed→groups flash); membership only matters when Group Mode is saved on.
  const ready = !settings.isPending && (!settings.data?.enabled || !membership.isPending)
  return { groups, pinned, on: Boolean(settings.data?.enabled) && paid, paid, ready, put, saving: save.isPending }
}

/** Chat-list rows (unread + last message per group), polled. */
export function useGroupSummary(groups) {
  const keys = [GROUP_KEY.DUTIES, GROUP_KEY.ALL, ...groups.map((g) => g.cityId)]
  return useQuery({
    queryKey: ['groupSummary', keys.join(',')],
    queryFn: () => { const seen = readSeen(); return getGroupSummary(keys.map((key) => ({ key, since: seen[key] || 0 }))) },
    refetchInterval: POLL_MS,
  })
}

const SUMMARY_KEY = ['groupSummary']
const REFETCH_AFTER_LIVE_MS = 1500

/** Zero one group's badge in every cached summary right away (no wait for the refetch). */
export function clearUnread(qc, key) {
  qc.setQueriesData({ queryKey: SUMMARY_KEY }, (rows) => rows?.map((r) => (r.key === key ? { ...r, unread: 0 } : r)))
}

/** Chat list goes live: each SSE ride bumps its city + Mix Duty badges at once, then a quiet refetch fills the text. */
export function useLiveSummary() {
  const qc = useQueryClient()
  const timer = useRef(null)
  useRideStream({
    url: RIDES_STREAM_URL,
    onRide: (ride) => {
      qc.setQueriesData({ queryKey: SUMMARY_KEY }, (rows) => rows?.map((r) => (r.key === GROUP_KEY.ALL || r.key === ride.pickupCityId
        ? { ...r, unread: r.unread + 1, lastAt: ride.receivedAt, lastIsDuty: false } : r)))
      clearTimeout(timer.current)
      timer.current = setTimeout(() => qc.invalidateQueries({ queryKey: SUMMARY_KEY }), REFETCH_AFTER_LIVE_MS)
    },
  })
}

function usePaged(name, fn, key, enabled) {
  return useInfiniteQuery({
    queryKey: ['groupThread', name, key],
    queryFn: ({ pageParam }) => fn({ cityId: key === GROUP_KEY.ALL || key === GROUP_KEY.DUTIES ? undefined : key, cursor: pageParam, limit: PAGE }),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: POLL_MS,
    staleTime: 0, // app default is 5min: re-opening a chat must fetch, not replay the cache
    enabled,
  })
}

/** One group's messages: city = rides + duties there, all = every ride, duties = every duty. */
export function useGroupThread(key) {
  const qc = useQueryClient()
  const rides = usePaged('rides', listGroupRides, key, key !== GROUP_KEY.DUTIES)
  // New bot ride for this group → refetch now instead of waiting for the poll.
  const stream = useRideStream({
    url: RIDES_STREAM_URL,
    enabled: key !== GROUP_KEY.DUTIES,
    onRide: (ride) => {
      if (key === GROUP_KEY.ALL || ride.pickupCityId === key) qc.invalidateQueries({ queryKey: ['groupThread', 'rides', key] })
    },
  })
  const duties = usePaged('duties', listGroupDuties, key, key !== GROUP_KEY.ALL)
  const flat = (q) => (q.data?.pages ?? []).flatMap((p) => p.items)
  const used = [key !== GROUP_KEY.DUTIES && rides, key !== GROUP_KEY.ALL && duties].filter(Boolean)
  return {
    messages: mergeThread(flat(rides), flat(duties)),
    isLoading: used.some((q) => q.isPending),
    isError: used.some((q) => q.isError),
    error: used.find((q) => q.error)?.error,
    hasOlder: used.some((q) => q.hasNextPage),
    loadingOlder: used.some((q) => q.isFetchingNextPage),
    loadOlder: () => used.forEach((q) => q.hasNextPage && q.fetchNextPage()),
    stream, // STREAM_STATUS of the live feed (idle for Driver Duties: polled only)
  }
}
