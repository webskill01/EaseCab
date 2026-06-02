'use strict';

const { redisKey, VERIFICATION, VERIFICATION_STATUS } = require('@easecab/shared');
const { fixedWindowIncr } = require('../../lib/rateLimit');

/** docType → the denormalized boolean flag it flips on the User row. */
const DOC_FLAG = Object.freeze({ aadhaar: 'aadhaarVerified', dl: 'dlSubmitted', rc: 'rcSubmitted' });

/**
 * Verification data access (CLAUDE.md §4 — Prisma + Redis only, no policy). The
 * rate-limit DECISION (is the count over the cap?) lives in the service; this layer
 * just returns the count.
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 * @param {import('ioredis').Redis} deps.redis
 */
function createVerificationRepository({ prisma, redis }) {
  return {
    /** Atomic fixed-window OTP-generation counter for a user; returns the new count. */
    async incrAadhaarOtpAttempts(userId) {
      return fixedWindowIncr(redis, redisKey('verifyotp', userId), VERIFICATION.AADHAAR_OTP_WINDOW_SEC);
    },

    /** Atomic fixed-window DL/RC verify counter (Surepass is charged per call; H1). */
    async incrDocVerifyAttempts(userId, docType) {
      return fixedWindowIncr(redis, redisKey('verifydoc', docType, userId), VERIFICATION.DOC_VERIFY_WINDOW_SEC);
    },

    /**
     * One tx: insert the submission row (status submitted), flip the per-doc User
     * flag, and promote verificationStatus none→submitted (never downgrades an
     * already approved/rejected user). The doc NUMBER is never stored (§10).
     *
     * The H3 partial-unique `(user_id, doc_type) WHERE status='submitted'` makes a
     * second in-flight submission for the same doc throw P2002 inside the tx → the
     * whole tx rolls back → we treat it as an idempotent no-op (the flag is already
     * set from the first submission). Re-submission after rejection is allowed.
     * @returns {Promise<{ recorded: boolean, reason?: string }>}
     */
    async recordVerification({ userId, docType, surepassRef, verifiedName }) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.verificationSubmission.create({
            data: { userId, docType, status: VERIFICATION_STATUS.SUBMITTED, surepassRef, verifiedName },
          });
          await tx.user.update({ where: { id: userId }, data: { [DOC_FLAG[docType]]: true } });
          await tx.user.updateMany({
            where: { id: userId, verificationStatus: VERIFICATION_STATUS.NONE },
            data: { verificationStatus: VERIFICATION_STATUS.SUBMITTED },
          });
        });
        return { recorded: true };
      } catch (err) {
        if (err && err.code === 'P2002') return { recorded: false, reason: 'duplicate_pending' };
        throw err;
      }
    },

    /** The four verification fields for GET /me. */
    async getVerificationStatus(userId) {
      return prisma.user.findUnique({
        where: { id: userId },
        select: { aadhaarVerified: true, dlSubmitted: true, rcSubmitted: true, verificationStatus: true },
      });
    },
  };
}

module.exports = { createVerificationRepository };
