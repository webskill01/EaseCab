'use strict';

/**
 * Verification doc types — matches the Prisma `VerificationDocType` enum + the
 * VerificationSubmission.docType column (CLAUDE.md §5, no magic strings).
 */
const VERIFICATION_DOC_TYPE = Object.freeze({
  AADHAAR: 'aadhaar',
  DL: 'dl',
  RC: 'rc',
});

/**
 * Verification rate-limit policy. Aadhaar OTP generation is the costly/abusable
 * step (Surepass charges per call) — cap it like the auth OTP gate (§6).
 */
const VERIFICATION = Object.freeze({
  AADHAAR_OTP_MAX_PER_HOUR: 3,
  AADHAAR_OTP_WINDOW_SEC: 3600,
});

module.exports = { VERIFICATION_DOC_TYPE, VERIFICATION };
