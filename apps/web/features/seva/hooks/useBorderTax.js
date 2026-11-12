import { useSyncExternalStore } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createFiling, listFilings, listRates, getFiling, getReceiptUrl, sendCaptcha, refreshCaptcha, cancelFiling } from '../services/borderTaxApi'
import { isFinal, gettingReceipt, BT_POLL_MS } from '../lib/borderTax'

const LIST_KEY = ['bordertax']

/** The caller's filing history. */
export function useFilings() {
  return useQuery({ queryKey: LIST_KEY, queryFn: listFilings, staleTime: 30000 })
}

/** Latest real fee per border (from drivers' filings) — refreshed after each new filing. */
export function useRates() {
  return useQuery({ queryKey: [...LIST_KEY, 'rates'], queryFn: listRates, staleTime: 300000 })
}

/** One filing, polled every 2s until it reaches a final status. */
export function useFiling(id) {
  return useQuery({
    queryKey: [...LIST_KEY, id],
    queryFn: () => getFiling(id),
    enabled: Boolean(id),
    staleTime: 0,
    refetchInterval: (q) => (q.state.data && isFinal(q.state.data.status) && !gettingReceipt(q.state.data) ? false : BT_POLL_MS),
  })
}

/** Presigned receipt PDF link for a paid filing (expires — refetched when stale). */
export function useReceiptUrl(id, enabled) {
  return useQuery({ queryKey: [...LIST_KEY, id, 'receipt'], queryFn: () => getReceiptUrl(id), enabled: Boolean(id && enabled), staleTime: 120000, retry: false })
}

/** create / captcha / cancel — each refreshes the history + the open filing. */
export function useBorderTaxActions() {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: LIST_KEY })
  return {
    create: useMutation({ mutationFn: createFiling, onSuccess: refresh }),
    captcha: useMutation({ mutationFn: ({ id, answer }) => sendCaptcha(id, answer), onSuccess: refresh }),
    refresh: useMutation({ mutationFn: (id) => refreshCaptcha(id), onSuccess: refresh }),
    cancel: useMutation({ mutationFn: (id) => cancelFiling(id), onSuccess: refresh }),
  }
}

/** Seconds until `deadline` (ISO / Date), ticking each second; null without a deadline. */
const tickEverySecond = (cb) => { const t = setInterval(cb, 1000); return () => clearInterval(t) }
const nowSec = () => Math.floor(Date.now() / 1000)

export function useSecondsLeft(deadline) {
  // a live 1s clock: a "now" held in state from mount made the first frame show a stale, too-long time
  const now = useSyncExternalStore(tickEverySecond, nowSec, nowSec)
  return deadline ? Math.max(0, Math.round(new Date(deadline).getTime() / 1000 - now)) : null
}
