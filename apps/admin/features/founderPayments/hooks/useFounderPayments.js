'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { fetchFounderPayments, linkFounderPayment } from '../services/founderPaymentsApi'
import { useSessionState } from '@/features/shell/hooks/useSessionState'

/** Founder payments list (linked/unlinked + member search, by capture time) + the link mutation (the refetched row then shows the member). */
export function useFounderPayments() {
  const qc = useQueryClient()
  const [page, setPage] = useSessionState('founder:page', 1)
  const [filters, setFilters] = useSessionState('founder:filters', { status: 'all', sort: 'newest', q: '' })
  const query = useQuery({
    queryKey: ['founderPayments', filters, page],
    queryFn: () => fetchFounderPayments({ page, ...filters }),
    placeholderData: keepPreviousData,
  })
  const setFilter = (key) => (value) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1) }
  const link = useMutation({
    mutationFn: linkFounderPayment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['founderPayments'] }),
    meta: { success: 'Payment linked' },
  })

  return {
    page, setPage,
    ...filters,
    setStatus: setFilter('status'), setSort: setFilter('sort'), setQ: setFilter('q'),
    items: query.data?.payments ?? [],
    unlinked: query.data?.unlinked ?? 0,
    total: query.data?.meta?.total ?? 0,
    limit: query.data?.meta?.limit ?? 20,
    isLoading: query.isLoading,
    isError: query.isError,
    link,
  }
}
