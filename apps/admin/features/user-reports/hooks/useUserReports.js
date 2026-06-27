'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchUserReports, reviewUserReport } from '../services/userReportsApi'

/**
 * User-reports queue controller: paginated query + reinstate/uphold mutation. The
 * mutation invalidates the queue so a resolved user drops out of the list.
 */
export function useUserReports() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)

  const query = useQuery({ queryKey: ['user-reports', page], queryFn: () => fetchUserReports(page) })
  const review = useMutation({
    mutationFn: ({ userId, action }) => reviewUserReport(userId, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-reports'] }),
  })

  return {
    items: query.data?.users ?? [],
    total: query.data?.meta?.total ?? 0,
    page,
    setPage,
    isLoading: query.isLoading,
    isError: query.isError,
    review,
  }
}
