import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getReferrals, claimReferrer } from '../services/referralsApi'

/** Refer & Earn overview. Short staleTime — progress changes when a friend pays. */
export function useReferrals() {
  return useQuery({ queryKey: ['referrals'], queryFn: getReferrals, staleTime: 60000 })
}

/** "Who referred you?" — refreshes the overview (and membership: a claim can trigger a reward). */
export function useClaimReferrer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: claimReferrer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['referrals'] })
      qc.invalidateQueries({ queryKey: ['membership'] })
    },
  })
}
