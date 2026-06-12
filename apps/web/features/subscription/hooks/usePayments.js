import { useQuery } from '@tanstack/react-query'
import { listPayments } from '../services/subscriptionApi'

/** First page of the user's captured-payment history. staleTime 5min (§15). */
export function usePayments() {
  return useQuery({ queryKey: ['payments'], queryFn: () => listPayments(), staleTime: 300000 })
}
