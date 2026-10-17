'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { fetchCityStrings, actOnCityString } from '../services/cityStringsApi'

/**
 * City-string queue controller: paginated query of unreviewed strings + a
 * resolve/dismiss mutation that invalidates the queue so the row drops off.
 */
export function useCityStrings() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)

  const query = useQuery({ queryKey: ['cityStrings', page], queryFn: () => fetchCityStrings(page), placeholderData: keepPreviousData })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['cityStrings'] })

  const action = useMutation({
    mutationFn: ({ id, action, cityId }) => actOnCityString(id, action, cityId),
    onSuccess: invalidate,
    meta: { success: ({ action }) => (action === 'resolve' ? 'City resolved' : 'Dismissed') },
  })

  return {
    items: query.data?.cityStrings ?? [],
    total: query.data?.meta?.total ?? 0,
    limit: query.data?.meta?.limit ?? 20,
    page, setPage,
    isLoading: query.isLoading,
    isError: query.isError,
    action,
  }
}
