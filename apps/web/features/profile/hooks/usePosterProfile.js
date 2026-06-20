import { useQuery } from '@tanstack/react-query'
import { fetchPosterProfile } from '../services/posterApi'

/** A public poster's profile (T3-2). staleTime 5min (§15); skipped until an id is present. */
export function usePosterProfile(id) {
  return useQuery({
    queryKey: ['poster', id],
    queryFn: () => fetchPosterProfile(id),
    staleTime: 300000,
    enabled: Boolean(id),
  })
}
