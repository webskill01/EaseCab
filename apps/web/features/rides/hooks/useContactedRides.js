import { useQuery } from '@tanstack/react-query'
import { listContacted } from '../services/myRidesApi'
import { toContactedVM } from '../lib/normalize'

/** The caller's contacted rides (My Rides → Contacted). Static list (no SSE). */
export function useContactedRides() {
  const query = useQuery({ queryKey: ['contacted'], queryFn: () => listContacted(), staleTime: 60000 })
  const contacts = (query.data?.contacts ?? []).map(toContactedVM)
  return {
    contacts,
    isLoading: query.isLoading,
    isError: query.isError,
    isEmpty: !query.isLoading && !query.isError && contacts.length === 0,
  }
}
