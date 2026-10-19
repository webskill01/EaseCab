/**
 * Pure membership-state derivation for the feed banner, Membership screen and Profile row.
 * NONE = never had a paid window (new users since the trial was removed 2026-10-13);
 * EXPIRED = a paid window existed and lapsed.
 */

export const MEMBERSHIP_STATE = Object.freeze({ ACTIVE: 'active', EXPIRED: 'expired', NONE: 'none' })

/** Feed renewal banner shows once an ACTIVE window has this many days or fewer left (Phase 21.2). */
export const RENEWAL_BANNER_DAYS = 7

const DAY_MS = 86400000

/**
 * @param {?{ status: ?string, isActive: boolean, expiresAt?: ?string }} sub
 * @param {Date} [now]
 * @returns {{ state: string, daysLeft?: number }} daysLeft (ACTIVE only) rounds up: 3h left → 1.
 */
export function membershipView(sub, now = new Date()) {
  if (sub && sub.isActive) {
    if (!sub.expiresAt) return { state: MEMBERSHIP_STATE.ACTIVE }
    return { state: MEMBERSHIP_STATE.ACTIVE, daysLeft: Math.max(1, Math.ceil((new Date(sub.expiresAt) - now) / DAY_MS)) }
  }
  return { state: sub && sub.expiresAt ? MEMBERSHIP_STATE.EXPIRED : MEMBERSHIP_STATE.NONE }
}
