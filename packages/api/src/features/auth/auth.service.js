'use strict';

const { AppError, ERROR_CODES, OTP_RATE_LIMIT, TRIAL_DAYS, USER_ROLE } = require('@easecab/shared');

const DAY_MS = 86_400_000;

/**
 * Reduce a Prisma user (+subscription) to the fields safe to return to the client
 * (CLAUDE.md §10 — never leak razorpay ids, phone is the user's own so it's fine).
 * @param {object} user
 * @returns {object}
 */
function toPublicUser(user) {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name ?? null,
    verificationStatus: user.verificationStatus ?? 'none',
    subscription: user.subscription
      ? {
          status: user.subscription.status,
          trialExpiresAt: user.subscription.trialExpiresAt,
          expiresAt: user.subscription.expiresAt ?? null,
        }
      : null,
  };
}

/**
 * Auth business logic (CLAUDE.md §4 service layer). Provider-agnostic except that
 * it calls the injected `identity.verifyOtpToken` — the single Firebase touchpoint
 * (migration boundary). Never logs phone or token (§10).
 *
 * @param {object} deps
 * @param {ReturnType<import('./auth.repository').createAuthRepository>} deps.repo
 * @param {{ signAccess, signRefresh, verifyRefresh }} deps.jwt - from lib/jwt
 * @param {{ verifyOtpToken(idToken: string): Promise<{ phone: string }> }} deps.identity
 * @param {object} deps.config
 */
function createAuthService({ repo, jwt, identity }) {
  function issueTokens(user) {
    const payload = { sub: user.id, role: USER_ROLE };
    return { accessToken: jwt.signAccess(payload), refreshToken: jwt.signRefresh(payload) };
  }

  return {
    /** OUR rate-limit gate (Firebase does the actual send on the client). */
    async requestOtp(phone) {
      const cooldown = await repo.getResendCooldownTtl(phone);
      if (cooldown > 0) {
        throw AppError.fromCode(ERROR_CODES.RATE_LIMITED);
      }
      const count = await repo.incrementOtpCount(phone, OTP_RATE_LIMIT.WINDOW_SEC);
      if (count > OTP_RATE_LIMIT.MAX_PER_HOUR) {
        throw AppError.fromCode(ERROR_CODES.RATE_LIMITED);
      }
      await repo.setResendCooldown(phone, OTP_RATE_LIMIT.RESEND_COOLDOWN_SEC);
      return { sent: true };
    },

    /** Verify the Firebase ID token, upsert the user, issue our cookies' tokens. */
    async verifyOtp(idToken) {
      let phone;
      try {
        ({ phone } = await identity.verifyOtpToken(idToken));
      } catch {
        // Any verification failure collapses to one generic 401 (no detail leak, §9).
        throw AppError.fromCode(ERROR_CODES.AUTH_REQUIRED);
      }

      let user = await repo.findUserByPhone(phone);
      let isNewUser = false;
      if (!user) {
        const trialExpiresAt = new Date(Date.now() + TRIAL_DAYS * DAY_MS);
        user = await repo.createUserWithTrial(phone, trialExpiresAt);
        isNewUser = true;
      } else if (user.isDeleted) {
        user = await repo.restoreUser(user.id);
      }

      return { user, isNewUser, ...issueTokens(user) };
    },

    /** Rotate tokens from a valid refresh cookie; any problem → AUTH_REQUIRED. */
    async refresh(refreshToken) {
      if (!refreshToken) {
        throw AppError.fromCode(ERROR_CODES.AUTH_REQUIRED);
      }
      let payload;
      try {
        payload = jwt.verifyRefresh(refreshToken);
      } catch {
        throw AppError.fromCode(ERROR_CODES.AUTH_REQUIRED);
      }
      const user = await repo.findActiveUserById(payload.sub);
      if (!user) {
        throw AppError.fromCode(ERROR_CODES.AUTH_REQUIRED);
      }
      return issueTokens(user);
    },
  };
}

module.exports = { createAuthService, toPublicUser };
