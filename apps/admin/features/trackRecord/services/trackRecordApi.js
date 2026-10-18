import { apiFetch } from '@/lib/api/client'

/** GET /admin/stats/track-record → { since, targets, weeks[] } (weeks newest first, IST, Monday start). */
export async function fetchTrackRecord() {
  const { data } = await apiFetch('/admin/stats/track-record')
  return data.trackRecord
}
