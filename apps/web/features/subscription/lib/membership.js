/**
 * Pure membership-state derivation for the feed banner, Membership screen and Profile row.
 * NONE = never had a paid window (new users since the trial was removed 2026-10-13);
 * EXPIRED = a paid window existed and lapsed.
 */

export const MEMBERSHIP_STATE = Object.freeze({ ACTIVE: 'active', EXPIRED: 'expired', NONE: 'none' })

/**
 * @param {?{ status: ?string, isActive: boolean, expiresAt?: ?string }} sub
 * @returns {{ state: string }}
 */
export function membershipView(sub) {
  if (sub && sub.isActive) return { state: MEMBERSHIP_STATE.ACTIVE }
  return { state: sub && sub.expiresAt ? MEMBERSHIP_STATE.EXPIRED : MEMBERSHIP_STATE.NONE }
}
