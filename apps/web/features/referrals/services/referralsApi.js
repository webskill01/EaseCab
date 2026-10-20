import { apiFetch } from '@/lib/api/client'

/**
 * Refer & Earn overview (Phase 22).
 * @returns {Promise<{ referrals: Array<{id,name,joinedAt,paid,rewarded}>, perReward: number,
 *   monthsEarned: number, towardNext: number, referredBy: ?{name}, canClaim: boolean, code: string }>}
 */
export async function getReferrals() {
  const { data } = await apiFetch('/referrals')
  return data
}

/**
 * Link me to the referrer whose invite link this device opened.
 * @param {{ code: string }} body
 * @returns {Promise<{ referrer: { name: ?string } }>}
 */
export async function claimReferrer(body) {
  const { data } = await apiFetch('/referrals/claim', { method: 'POST', body: JSON.stringify(body) })
  return data
}
