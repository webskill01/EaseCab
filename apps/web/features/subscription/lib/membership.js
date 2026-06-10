/**
 * Pure membership-state derivation for the feed banner (and Membership screen).
 * Maps the `/subscription/me` payload to a small view-model: which banner to show
 * and, for a trial, how many whole days remain.
 */

export const MEMBERSHIP_STATE = Object.freeze({ ACTIVE: 'active', TRIAL: 'trial', EXPIRED: 'expired' })

const DAY_MS = 86400000

/**
 * @param {?{ status: ?string, isActive: boolean, trialExpiresAt?: ?string, expiresAt?: ?string }} sub
 * @param {number} [now] - epoch ms (injectable for tests)
 * @returns {{ state: string, daysLeft?: number, ending?: boolean }}
 */
export function membershipView(sub, now = Date.now()) {
  if (!sub || !sub.isActive) return { state: MEMBERSHIP_STATE.EXPIRED }
  if (sub.status === 'trial') {
    const ms = sub.trialExpiresAt ? new Date(sub.trialExpiresAt).getTime() - now : 0
    const daysLeft = Math.max(1, Math.ceil(ms / DAY_MS))
    return { state: MEMBERSHIP_STATE.TRIAL, daysLeft, ending: ms <= DAY_MS }
  }
  return { state: MEMBERSHIP_STATE.ACTIVE }
}
