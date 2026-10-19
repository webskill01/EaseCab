'use client'

import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { fetchReferrals } from '../services/referralsApi'

/** Referrals list (newest referee first) + program totals + rollout state. */
export function useReferrals() {
  const [page, setPage] = useState(1)
  const query = useQuery({ queryKey: ['referrals', page], queryFn: () => fetchReferrals(page), placeholderData: keepPreviousData })

  return {
    page, setPage,
    items: query.data?.referrals ?? [],
    summary: query.data?.summary ?? null,
    rollout: query.data?.rollout ?? null,
    total: query.data?.meta?.total ?? 0,
    limit: query.data?.meta?.limit ?? 20,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
