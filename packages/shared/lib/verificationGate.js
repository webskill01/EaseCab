'use strict';

/**
 * Posting soft gate (Step 13): a user may post a ride once they have submitted at
 * least one KYC doc. The per-doc flags are set by Step 12 on a successful Surepass
 * verification and are never downgraded — so this is independent of the admin
 * badge (verificationStatus). Pure; safe on null/undefined.
 *
 * @param {{ aadhaarVerified?: boolean, dlSubmitted?: boolean, rcSubmitted?: boolean }|null} user
 * @returns {boolean}
 */
function hasSubmittedKyc(user) {
  if (!user) return false;
  return Boolean(user.aadhaarVerified || user.dlSubmitted || user.rcSubmitted);
}

module.exports = { hasSubmittedKyc };
