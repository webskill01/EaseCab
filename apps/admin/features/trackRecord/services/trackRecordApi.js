import { apiFetch } from '@/lib/api/client'

/** GET /admin/stats/track-record → { since, targets, weeks[] } (weeks newest first, IST, Monday start). */
export async function fetchTrackRecord() {
  const { data } = await apiFetch('/admin/stats/track-record')
  return data.trackRecord
}

/** GET /admin/stats/monthly → { months[] } (billing months 16th → 15th IST, newest first). */
export async function fetchMonthly() {
  const { data } = await apiFetch('/admin/stats/monthly')
  return data.monthly
}
