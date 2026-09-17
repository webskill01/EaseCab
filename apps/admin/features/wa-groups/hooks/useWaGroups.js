'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchWaGroups, setWaGroupEnabled, setAllWaGroupsEnabled } from '../services/waGroupsApi'

/**
 * WhatsApp groups controller: paginated, searchable, filterable list plus a
 * per-group switch and a bulk switch (applies to the current search). Every
 * change refetches so the on/off counts stay right.
 */
export function useWaGroups() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatusState] = useState('all')
  const [q, setQState] = useState('')

  const query = useQuery({ queryKey: ['waGroups', page, status, q], queryFn: () => fetchWaGroups({ page, status, q }) })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['waGroups'] })

  const toggle = useMutation({ mutationFn: ({ id, enabled }) => setWaGroupEnabled(id, enabled), onSuccess: invalidate })
  const bulk = useMutation({ mutationFn: (enabled) => setAllWaGroupsEnabled(enabled, q), onSuccess: invalidate })

  return {
    page, setPage,
    status, setStatus: (next) => { setStatusState(next); setPage(1) },
    q, setQ: (next) => { setQState(next); setPage(1) },
    items: query.data?.groups ?? [],
    counts: query.data?.counts ?? { on: 0, off: 0 },
    total: query.data?.meta?.total ?? 0,
    limit: query.data?.meta?.limit ?? 50,
    isLoading: query.isLoading,
    isError: query.isError,
    toggle,
    bulk,
  }
}
