'use client'

import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { fetchReferrals } from '../services/referralsApi'

/** Referrals list filtered by paid state + search, sorted by join date, plus program totals + rollout. */
export function useReferrals() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ status: 'all', sort: 'newest', q: '' })
  const query = useQuery({
    queryKey: ['referrals', filters, page],
    queryFn: () => fetchReferrals({ page, ...filters }),
    placeholderData: keepPreviousData,
  })
  const setFilter = (key) => (value) => { setFilters((f) => ({ ...f, [key]: value })); setPage(1) }

  return {
    page, setPage,
    ...filters,
    setStatus: setFilter('status'), setSort: setFilter('sort'), setQ: setFilter('q'),
    items: query.data?.referrals ?? [],
    summary: query.data?.summary ?? null,
    rollout: query.data?.rollout ?? null,
    total: query.data?.meta?.total ?? 0,
    limit: query.data?.meta?.limit ?? 20,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
