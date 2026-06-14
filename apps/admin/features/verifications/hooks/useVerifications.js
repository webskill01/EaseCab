'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchVerifications, reviewSubmission, setBadge } from '../services/verificationsApi'

/**
 * Verifications queue controller: paginated query + approve/reject + badge mutations.
 * Every mutation invalidates the queue so the list reflects the new state.
 */
export function useVerifications() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)

  const query = useQuery({ queryKey: ['verifications', page], queryFn: () => fetchVerifications(page) })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['verifications'] })

  const review = useMutation({
    mutationFn: ({ id, action, rejectionReason }) => reviewSubmission(id, action, rejectionReason),
    onSuccess: invalidate,
  })
  const badge = useMutation({
    mutationFn: ({ userId, status }) => setBadge(userId, status),
    onSuccess: invalidate,
  })

  return {
    items: query.data?.verifications ?? [],
    total: query.data?.meta?.total ?? 0,
    page,
    setPage,
    isLoading: query.isLoading,
    isError: query.isError,
    review,
    badge,
  }
}
