'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchStats } from '../services/statsApi'

/** Dashboard stats query — short stale window so the landing counts stay fresh. */
export function useStats() {
  return useQuery({ queryKey: ['admin-stats'], queryFn: fetchStats, staleTime: 30000 })
}
