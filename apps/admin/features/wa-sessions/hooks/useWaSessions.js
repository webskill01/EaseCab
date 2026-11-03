'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchWaSessions, createWaSession, updateWaSession, removeWaSession, startPairing, fetchPairState,
  fetchPublicPair, startPublicPairing,
} from '../services/waSessionsApi'

const LIST_POLL_MS = 5000 // live status: the bot refreshes each session every 30s, state changes land instantly
const PAIR_POLL_MS = 2000 // QR rotates every ~20s
export const PAIR_DONE = ['paired', 'expired', 'failed']

/** Sessions list (polled) + add / rename / pause / remove. */
export function useWaSessions() {
  const qc = useQueryClient()
  const query = useQuery({ queryKey: ['waSessions'], queryFn: fetchWaSessions, refetchInterval: LIST_POLL_MS })
  const onSuccess = () => qc.invalidateQueries({ queryKey: ['waSessions'] })

  return {
    sessions: query.data?.sessions ?? [],
    totals: query.data?.totals ?? { groups: 0, max: 0 },
    isLoading: query.isLoading,
    isError: query.isError,
    create: useMutation({ mutationFn: createWaSession, onSuccess }),
    update: useMutation({ mutationFn: ({ id, ...patch }) => updateWaSession(id, patch), onSuccess }),
    remove: useMutation({ mutationFn: removeWaSession, onSuccess }),
  }
}

/**
 * Pairing progress for one session, polled while a run is live.
 * @param {{ id?: string, token?: string }} target - admin session id, or public share token
 */
export function usePairing({ id, token }) {
  const qc = useQueryClient()
  const key = ['waPair', id || token]
  const query = useQuery({
    queryKey: key,
    queryFn: () => (token ? fetchPublicPair(token) : fetchPairState(id)),
    refetchInterval: (q) => (PAIR_DONE.includes(q.state.data?.status) ? false : PAIR_POLL_MS),
    retry: false,
  })
  const start = useMutation({
    mutationFn: (phone) => (token ? startPublicPairing(token, phone) : startPairing(id, phone)),
    onSuccess: (data) => qc.setQueryData(key, (old) => ({ ...old, ...data, qrSvg: null, code: null })),
  })
  return { state: query.data, isError: query.isError, error: query.error, start }
}
