import { useQuery } from '@tanstack/react-query'
import { getProfile } from '../services/profileApi'

/** The signed-in user's profile + verification snapshot. staleTime 5min (§15). */
export function useProfile() {
  return useQuery({ queryKey: ['profile'], queryFn: getProfile, staleTime: 300000 })
}
