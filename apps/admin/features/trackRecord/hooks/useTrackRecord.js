'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchTrackRecord } from '../services/trackRecordApi'

/** Weekly health metrics — refreshed every 5 minutes while the tab is open. */
export function useTrackRecord() {
  return useQuery({ queryKey: ['admin-track-record'], queryFn: fetchTrackRecord, staleTime: 300000, refetchInterval: 300000 })
}
