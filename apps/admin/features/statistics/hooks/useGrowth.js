'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchGrowth } from '../services/statisticsApi'

/** Growth since launch — refreshed every minute while the tab is open. */
export function useGrowth() {
  return useQuery({ queryKey: ['admin-growth'], queryFn: fetchGrowth, staleTime: 60000, refetchInterval: 60000 })
}
