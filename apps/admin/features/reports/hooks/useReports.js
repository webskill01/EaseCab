'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { fetchReports, reviewReport } from '../services/reportsApi'

/**
 * Reports queue controller: paginated query + dismiss/remove mutation. The mutation
 * invalidates the queue so resolved reports drop out of the open list.
 */
export function useReports() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('open')

  const query = useQuery({ queryKey: ['reports', status, page], queryFn: () => fetchReports(page, status), placeholderData: keepPreviousData })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['reports'] })

  const review = useMutation({
    mutationFn: ({ id, action }) => reviewReport(id, action),
    onSuccess: invalidate,
    meta: { success: ({ action }) => (action === 'remove' ? 'Ride removed' : 'Report dismissed') },
  })

  return {
    items: query.data?.reports ?? [],
    total: query.data?.meta?.total ?? 0,
    limit: query.data?.meta?.limit ?? 20,
    page,
    setPage,
    status,
    setStatus: (next) => { setStatus(next); setPage(1) },
    isLoading: query.isLoading,
    isError: query.isError,
    review,
  }
}
