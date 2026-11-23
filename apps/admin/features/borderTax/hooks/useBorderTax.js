'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { fetchFilings, fetchStates, setStatePaused } from '../services/borderTaxApi'
import { useSessionState } from '@/features/shell/hooks/useSessionState'

const DEFAULTS = { state: '', status: '', outcome: '', range: '', q: '' } // real drivers only: the API defaults who=real
const DAY_MS = 86_400_000
const istDay = (ms) => new Date(ms + 19_800_000).toISOString().slice(0, 10)

/** Date dropdown id → { from, to } IST days. */
function rangeDays(range, now = Date.now()) {
  if (range === 'today') return { from: istDay(now), to: istDay(now) }
  if (range === 'yesterday') return { from: istDay(now - DAY_MS), to: istDay(now - DAY_MS) }
  if (range === '7d') return { from: istDay(now - 6 * DAY_MS), to: istDay(now) }
  if (range === '30d') return { from: istDay(now - 29 * DAY_MS), to: istDay(now) }
  return {}
}

/** Border tax filings (filters kept per tab session) + byStatus totals over the whole filter. */
export function useFilings() {
  const [page, setPage] = useSessionState('bordertax:page', 1)
  const [filters, setFilters] = useSessionState('bordertax:filters:v2', DEFAULTS) // v2: drops saved who/userId filters
  const { range, ...rest } = filters
  const query = useQuery({
    queryKey: ['borderTax', filters, page],
    queryFn: () => fetchFilings({ page, ...rest, ...rangeDays(range) }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000, // live filings move on their own
  })
  const setFilter = (key) => (value) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1) }
  return {
    page, setPage, ...filters, setFilter,
    items: query.data?.filings ?? [],
    byStatus: query.data?.byStatus ?? [],
    total: query.data?.meta?.total ?? 0,
    limit: query.data?.meta?.limit ?? 30,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}

/** One driver's filings for the user page — test accounts included (who=all). */
export function useUserFilings(userId, page) {
  const query = useQuery({
    queryKey: ['borderTax', 'user', userId, page],
    queryFn: () => fetchFilings({ page, userId, who: 'all' }),
    placeholderData: keepPreviousData,
  })
  return {
    items: query.data?.filings ?? [],
    total: query.data?.meta?.total ?? 0,
    limit: query.data?.meta?.limit ?? 30,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}

/** Live states with their on/off switch + the toggle mutation. */
export function useStateSwitches() {
  const qc = useQueryClient()
  const query = useQuery({ queryKey: ['borderTaxStates'], queryFn: fetchStates })
  const toggle = useMutation({
    mutationFn: setStatePaused,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['borderTaxStates'] }),
    meta: { success: 'Saved' },
  })
  return { states: query.data ?? [], toggle }
}
