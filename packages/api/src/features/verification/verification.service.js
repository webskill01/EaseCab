'use strict';

const { AppError, ERROR_CODES, VERIFICATION, VERIFICATION_DOC_TYPE } = require('@easecab/shared');

/**
 * Verification business logic (CLAUDE.md §4). Surepass is injected (vendor boundary);
 * each verify call funnels a SUCCESSFUL Surepass result into repo.recordVerification.
 * A failed Surepass result maps to VALIDATION_ERROR (422) — generic to the user, no
 * vendor detail leaked (§9). Doc numbers/OTPs are never logged or persisted (§10).
 *
 * @param {object} deps
 * @param {ReturnType<import('./verification.repository').createVerificationRepository>} deps.repo
 * @param {{ generateAadhaarOtp, submitAadhaarOtp, verifyDl, verifyRc }} deps.surepass
 */
function createVerificationService({ repo, surepass }) {
  return {
    /** Step 1 of Aadhaar — rate-limited OTP generation. Returns the Surepass clientId. */
    async startAadhaar(userId, { aadhaarNumber }) {
      const attempts = await repo.incrAadhaarOtpAttempts(userId);
      if (attempts > VERIFICATION.AADHAAR_OTP_MAX_PER_HOUR) {
        throw AppError.fromCode(ERROR_CODES.RATE_LIMITED);
      }
      const { clientId } = await surepass.generateAadhaarOtp({ aadhaar: aadhaarNumber });
      return { clientId };
    },

    /** Step 2 of Aadhaar — submit OTP; on success flip aadhaarVerified + store last4. */
    async verifyAadhaar(userId, { clientId, otp }) {
      const result = await surepass.submitAadhaarOtp({ clientId, otp });
      if (!result.success) throw AppError.fromCode(ERROR_CODES.VALIDATION_ERROR);
      await repo.recordVerification({
        userId, docType: VERIFICATION_DOC_TYPE.AADHAAR, surepassRef: clientId, verifiedName: result.name,
        userFields: { aadhaarLast4: result.last4 },
      });
      // Demographics are returned for editable profile PREFILL only — never persisted here (§10).
      return {
        docType: VERIFICATION_DOC_TYPE.AADHAAR, verified: true,
        name: result.name, dob: result.dob, gender: result.gender, address: result.address,
      };
    },

    /** DL verification (single Surepass call), rate-limited per user (H1). */
    async verifyDl(userId, { dlNumber, dob }) {
      const attempts = await repo.incrDocVerifyAttempts(userId, VERIFICATION_DOC_TYPE.DL);
      if (attempts > VERIFICATION.DOC_VERIFY_MAX_PER_HOUR) {
        throw AppError.fromCode(ERROR_CODES.RATE_LIMITED);
      }
      const result = await surepass.verifyDl({ dlNumber, dob });
      if (!result.success) throw AppError.fromCode(ERROR_CODES.VALIDATION_ERROR);
      await repo.recordVerification({
        userId, docType: VERIFICATION_DOC_TYPE.DL, surepassRef: result.ref, verifiedName: result.name,
      });
      // Official DL details surfaced for display; not persisted (only the flag + masked ref are).
      return { docType: VERIFICATION_DOC_TYPE.DL, verified: true, name: result.name, validUpto: result.validUpto, cov: result.cov };
    },

    /** RC verification (single Surepass call), rate-limited per user (H1). */
    async verifyRc(userId, { rcNumber }) {
      const attempts = await repo.incrDocVerifyAttempts(userId, VERIFICATION_DOC_TYPE.RC);
      if (attempts > VERIFICATION.DOC_VERIFY_MAX_PER_HOUR) {
        throw AppError.fromCode(ERROR_CODES.RATE_LIMITED);
      }
      const result = await surepass.verifyRc({ rcNumber });
      if (!result.success) throw AppError.fromCode(ERROR_CODES.VALIDATION_ERROR);
      await repo.recordVerification({
        userId, docType: VERIFICATION_DOC_TYPE.RC, surepassRef: result.ref, verifiedName: result.name,
        userFields: { carMake: result.make, carModel: result.model, carRegNo: result.regNo },
      });
      return { docType: VERIFICATION_DOC_TYPE.RC, verified: true, owner: result.name, make: result.make, model: result.model, regNo: result.regNo };
    },

    /** Verification snapshot for the profile UI. */
    async getStatus(userId) {
      return repo.getVerificationStatus(userId);
    },
  };
}

module.exports = { createVerificationService };
