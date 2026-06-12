'use strict';

/** Fields that must all be non-empty for an L1-complete profile (DECISIONS 2026-06-02 refinements). */
const PROFILE_REQUIRED_STRINGS = Object.freeze(['name', 'bio', 'baseCity', 'vehicleType', 'profilePicUrl']);

/**
 * Derived profile-completeness check (Step 21b). Pure; single source of truth for
 * L1 — no stored flag. Required: a self-uploaded DP, bio, name, base city, vehicle
 * type, and at least one language. Safe on null/undefined.
 *
 * @param {{ name?: string, bio?: string, baseCity?: string, vehicleType?: string,
 *   profilePicUrl?: string, languagesSpoken?: string[] }|null} user
 * @returns {boolean}
 */
function isProfileComplete(user) {
  if (!user) return false;
  const stringsOk = PROFILE_REQUIRED_STRINGS.every(
    (f) => typeof user[f] === 'string' && user[f].trim().length > 0,
  );
  return stringsOk && Array.isArray(user.languagesSpoken) && user.languagesSpoken.length > 0;
}

/**
 * Posting soft gate — L1 (Step 21b, supersedes the 2026-05-30 any-one-doc rule). A
 * user may post once Aadhaar OTP is verified AND their profile is complete. The
 * aadhaar flag is set by the verification feature on a successful Surepass verify
 * and never downgraded; profile completeness is derived. Independent of the admin
 * L2 badge (verificationStatus). Pure; safe on null/undefined.
 *
 * @param {{ aadhaarVerified?: boolean }|null} user - plus the isProfileComplete fields
 * @returns {boolean}
 */
function hasSubmittedKyc(user) {
  if (!user) return false;
  return Boolean(user.aadhaarVerified) && isProfileComplete(user);
}

module.exports = { isProfileComplete, hasSubmittedKyc, PROFILE_REQUIRED_STRINGS };
