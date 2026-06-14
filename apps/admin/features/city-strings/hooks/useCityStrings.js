'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchCityStrings, actOnCityString } from '../services/cityStringsApi'

/**
 * City-string queue controller: paginated query of unreviewed strings + a
 * resolve/dismiss mutation that invalidates the queue so the row drops off.
 */
export function useCityStrings() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)

  const query = useQuery({ queryKey: ['cityStrings', page], queryFn: () => fetchCityStrings(page) })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['cityStrings'] })

  const action = useMutation({
    mutationFn: ({ id, action, cityId }) => actOnCityString(id, action, cityId),
    onSuccess: invalidate,
  })

  return {
    items: query.data?.cityStrings ?? [],
    total: query.data?.meta?.total ?? 0,
    page, setPage,
    isLoading: query.isLoading,
    isError: query.isError,
    action,
  }
}
