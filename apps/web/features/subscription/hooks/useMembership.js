import { useQuery } from '@tanstack/react-query'
import { getMembership } from '../services/subscriptionApi'

/** The signed-in user's membership status. staleTime 5min (§15). */
export function useMembership() {
  return useQuery({ queryKey: ['membership'], queryFn: getMembership, staleTime: 300000 })
}
