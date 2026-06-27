'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchUnresolvedRides, actOnUnresolvedRide } from '../services/unresolvedRidesApi'

/**
 * Unresolved-rides queue controller: paginated query of live rides missing a city +
 * a set_city/hide mutation that invalidates the queue so the row updates or drops off.
 */
export function useUnresolvedRides() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)

  const query = useQuery({ queryKey: ['unresolvedRides', page], queryFn: () => fetchUnresolvedRides(page) })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['unresolvedRides'] })

  const action = useMutation({
    mutationFn: ({ id, action, side, cityId }) => actOnUnresolvedRide(id, action, { side, cityId }),
    onSuccess: invalidate,
  })

  return {
    items: query.data?.rides ?? [],
    total: query.data?.meta?.total ?? 0,
    page, setPage,
    isLoading: query.isLoading,
    isError: query.isError,
    action,
  }
}
