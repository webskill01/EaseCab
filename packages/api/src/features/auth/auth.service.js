'use strict';

const crypto = require('node:crypto');
const { AppError, ERROR_CODES, OTP_RATE_LIMIT, OTP_CHANNEL, OTP_SESSION, TRIAL_DAYS, USER_ROLE } = require('@easecab/shared');

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

/** Constant-time compare for the reviewer test code (never a plain ===). */
function codesMatch(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/**
 * Auth business logic (CLAUDE.md §4 service layer). Two OTP paths (Phase 16.5):
 * `identity.verifyOtpToken` (Firebase, legacy) and `smsOtp` (2Factor, server-side,
 * present only when OTP_PROVIDER=twofactor). Never logs phone, code or token (§10).
 *
 * @param {object} deps
 * @param {ReturnType<import('./auth.repository').createAuthRepository>} deps.repo
 * @param {{ signAccess, signRefresh, verifyRefresh }} deps.jwt - from lib/jwt
 * @param {{ verifyOtpToken(idToken: string): Promise<{ phone: string }>, mintCustomToken(uid: string): Promise<string> }} deps.identity
 * @param {?ReturnType<import('../../lib/twoFactor').createTwoFactorClient>} [deps.smsOtp]
 * @param {?{ phone: string, code: string }} [deps.testLogin] - Play-reviewer number that
 *   skips the SMS and accepts a fixed code (replaces the Firebase console test number).
 */
function createAuthService({ repo, jwt, identity, smsOtp = null, testLogin = null }) {
  const isTestPhone = (phone) => Boolean(testLogin) && phone === testLogin.phone;

  function issueTokens(user) {
    const payload = { sub: user.id, role: USER_ROLE };
    return { accessToken: jwt.signAccess(payload), refreshToken: jwt.signRefresh(payload) };
  }

  /** Upsert the user for a proven phone (trial if new, restore if soft-deleted). */
  async function signIn(phone) {
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
  }

  async function phoneFromFirebase(idToken) {
    try {
      return (await identity.verifyOtpToken(idToken)).phone;
    } catch {
      // Any verification failure collapses to one generic 401 (no detail leak, §9).
      throw AppError.fromCode(ERROR_CODES.AUTH_REQUIRED);
    }
  }

  /** Check phone+code against the bound 2Factor session (or the reviewer code). */
  async function checkSmsCode(phone, otp) {
    if (!smsOtp) throw AppError.fromCode(ERROR_CODES.AUTH_REQUIRED);
    const attempts = await repo.incrementVerifyAttempts(phone, OTP_SESSION.VERIFY_WINDOW_SEC);
    if (attempts > OTP_SESSION.MAX_VERIFY_ATTEMPTS) throw AppError.fromCode(ERROR_CODES.RATE_LIMITED);
    if (isTestPhone(phone)) {
      if (!codesMatch(otp, testLogin.code)) throw AppError.fromCode(ERROR_CODES.AUTH_REQUIRED);
      return;
    }
    const sessionId = await repo.getOtpSession(phone);
    if (!sessionId || !(await smsOtp.verifyOtp(sessionId, otp))) {
      throw AppError.fromCode(ERROR_CODES.AUTH_REQUIRED);
    }
    await repo.deleteOtpSession(phone);
  }

  return {
    /**
     * OUR rate-limit gate, then (2Factor mode) the send itself.
     * @returns {Promise<{ sent: true, channel: string }>} channel tells the client
     *   whether to run Firebase itself or just collect the code.
     */
    async requestOtp(phone) {
      const cooldown = await repo.getResendCooldownTtl(phone);
      if (cooldown > 0) {
        throw AppError.fromCode(ERROR_CODES.RATE_LIMITED);
      }
      const count = await repo.incrementOtpCount(phone, OTP_RATE_LIMIT.WINDOW_SEC);
      // Arm the cooldown on EVERY attempt (including a capped one) so a caller that
      // has hit the hourly limit still can't hammer the endpoint faster than the
      // resend interval.
      await repo.setResendCooldown(phone, OTP_RATE_LIMIT.RESEND_COOLDOWN_SEC);
      if (count > OTP_RATE_LIMIT.MAX_PER_HOUR) {
        throw AppError.fromCode(ERROR_CODES.RATE_LIMITED);
      }
      if (!smsOtp) return { sent: true, channel: OTP_CHANNEL.FIREBASE };
      if (!isTestPhone(phone)) {
        const sessionId = await smsOtp.sendOtp(phone);
        await repo.saveOtpSession(phone, sessionId, OTP_SESSION.SESSION_TTL_SEC);
      }
      return { sent: true, channel: OTP_CHANNEL.SERVER };
    },

    /**
     * Prove the phone (Firebase ID token OR phone+code), upsert the user, issue tokens.
     * @param {{ idToken: string } | { phone: string, otp: string }} body
     */
    async verifyOtp(body) {
      if (body.idToken) return signIn(await phoneFromFirebase(body.idToken));
      await checkSmsCode(body.phone, body.otp);
      return signIn(body.phone);
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

    /**
     * Issue a Firebase custom token for the caller so the client can sign in to
     * Firebase and SUBSCRIBE to its chat docs read-only (Step 22). The uid carried
     * by the token is our user id, which the firestore.rules match on.
     */
    async mintFirebaseToken(userId) {
      return { token: await identity.mintCustomToken(userId) };
    },
  };
}

module.exports = { createAuthService, toPublicUser };
