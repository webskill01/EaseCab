'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchMonthly } from '../services/trackRecordApi'

/** Monthly new / renewed / churn rows — refreshed every 5 minutes while the tab is open. */
export function useMonthly() {
  return useQuery({ queryKey: ['admin-track-record-monthly'], queryFn: fetchMonthly, staleTime: 300000, refetchInterval: 300000 })
}
