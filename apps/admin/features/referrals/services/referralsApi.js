import { apiFetch } from '@/lib/api/client'

/** GET /admin/referrals?page= → { referrals, summary, rollout, meta }. */
export async function fetchReferrals(page = 1) {
  const { data, meta } = await apiFetch(`/admin/referrals?page=${page}`)
  return { ...data, meta }
}
