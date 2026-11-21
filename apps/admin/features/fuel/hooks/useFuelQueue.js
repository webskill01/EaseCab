'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { fetchFuelQueue, decideFuelStation } from '../services/fuelApi'

/** Fuel review queue (Phase 30): Pending (driver-added) and Reports tabs + one decide mutation. */
export function useFuelQueue() {
  const qc = useQueryClient()
  const [tab, setTabRaw] = useState('pending')
  const [page, setPage] = useState(1)
  const setTab = (t) => { setTabRaw(t); setPage(1) }

  const query = useQuery({ queryKey: ['fuel', tab, page], queryFn: () => fetchFuelQueue(tab, page), placeholderData: keepPreviousData })
  const decide = useMutation({
    mutationFn: ({ id, patch }) => decideFuelStation(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fuel'] }),
    meta: { success: () => 'Saved' },
  })

  return {
    tab, setTab, page, setPage, decide,
    items: query.data?.stations ?? [],
    counts: query.data?.counts ?? { pending: 0, reports: 0 },
    total: query.data?.meta?.total ?? 0,
    limit: query.data?.meta?.limit ?? 50,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
