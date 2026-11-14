'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { fetchRenewals } from '../services/renewalsApi'
import { useSessionState } from '@/features/shell/hooks/useSessionState'

/** Renewals list (newest first), paged; refreshed every minute like Statistics. */
export function useRenewals() {
  const [page, setPage] = useSessionState('renewals:page', 1)
  const query = useQuery({
    queryKey: ['renewals', page],
    queryFn: () => fetchRenewals({ page }),
    placeholderData: keepPreviousData,
    refetchInterval: 60000,
  })
  return {
    page, setPage,
    items: query.data?.renewals ?? [],
    total: query.data?.meta?.total ?? 0,
    limit: query.data?.meta?.limit ?? 30,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
