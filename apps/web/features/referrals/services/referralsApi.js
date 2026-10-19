import { apiFetch } from '@/lib/api/client'

/**
 * Refer & Earn overview (Phase 22).
 * @returns {Promise<{ referrals: Array<{id,name,joinedAt,paid,rewarded}>, perReward: number,
 *   monthsEarned: number, towardNext: number, referredBy: ?{name}, canClaim: boolean }>}
 */
export async function getReferrals() {
  const { data } = await apiFetch('/referrals')
  return data
}

/**
 * Name the driver who referred me (10-digit mobile; the API normalises it).
 * @param {{ phone: string }} body
 * @returns {Promise<{ referrer: { name: ?string } }>}
 */
export async function claimReferrer(body) {
  const { data } = await apiFetch('/referrals/claim', { method: 'POST', body: JSON.stringify(body) })
  return data
}
