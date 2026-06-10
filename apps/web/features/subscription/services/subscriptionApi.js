import { apiFetch } from '@/lib/api/client'

/**
 * Subscription/membership status for the feed banner + Membership screen (Step 21).
 * @returns {Promise<{ status: ?string, trialExpiresAt: ?string, expiresAt: ?string, isActive: boolean }>}
 */
export async function getMembership() {
  const { data } = await apiFetch('/subscription/me')
  return data
}
