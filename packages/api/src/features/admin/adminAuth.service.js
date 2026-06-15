'use strict';

const {
  AppError,
  ERROR_CODES,
  ADMIN_ROLE,
  ADMIN_LOGIN_RATE_LIMIT,
  ADMIN_LOGIN_IP_RATE_LIMIT,
} = require('@easecab/shared');

/**
 * Reduce an admin row to client-safe fields (never the passwordHash — §10).
 * @param {object} a
 * @returns {{ id: string, email: string, name: string|null, role: string }}
 */
function toPublicAdmin(a) {
  return { id: a.id, email: a.email, name: a.name ?? null, role: a.role };
}

/**
 * Admin auth business logic (CLAUDE.md §4/§6, Step 24a). Password hashing is injected
 * as `hasher` (the bcryptjs boundary) so the service is unit-testable without bcrypt.
 * Bad email and bad password collapse to ONE generic error (no account enumeration).
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminAuth.repository').createAdminAuthRepository>} deps.repo
 * @param {{ signAccess, signRefresh, verifyRefresh }} deps.jwt - admin lib/jwt instance
 * @param {{ compare(plain: string, hash: string): Promise<boolean> }} deps.hasher
 */
function createAdminAuthService({ repo, jwt, hasher }) {
  function issueTokens(admin) {
    const payload = { sub: admin.id, role: admin.role, email: admin.email, kind: ADMIN_ROLE };
    return { accessToken: jwt.signAccess(payload), refreshToken: jwt.signRefresh(payload) };
  }

  return {
    /** Email+password → throttled bcrypt check → admin tokens. Two throttle layers
     *  (both checked before any DB lookup or bcrypt): a broad per-IP cap (H3, stops
     *  email-spray from one host) then the tighter per-email cap. */
    async login(email, password, ip) {
      const ipCount = await repo.incrementLoginCountByIp(ip, ADMIN_LOGIN_IP_RATE_LIMIT.WINDOW_SEC);
      if (ipCount > ADMIN_LOGIN_IP_RATE_LIMIT.MAX_PER_WINDOW) {
        throw AppError.fromCode(ERROR_CODES.RATE_LIMITED);
      }
      const count = await repo.incrementLoginCount(email, ADMIN_LOGIN_RATE_LIMIT.WINDOW_SEC);
      if (count > ADMIN_LOGIN_RATE_LIMIT.MAX_PER_WINDOW) {
        throw AppError.fromCode(ERROR_CODES.RATE_LIMITED);
      }
      const admin = await repo.findAdminByEmail(email);
      // A missing admin and a wrong password both collapse to one generic 401 (§9 —
      // no account enumeration). bcrypt is only run when a row exists.
      if (!admin || !(await hasher.compare(password, admin.passwordHash))) {
        throw AppError.fromCode(ERROR_CODES.AUTH_REQUIRED);
      }
      return { admin: toPublicAdmin(admin), ...issueTokens(admin) };
    },

    /** Rotate tokens from a valid admin refresh token; re-load the row (catches
     *  deletion / role change since issue). Any problem → AUTH_REQUIRED. */
    async refresh(refreshToken) {
      if (!refreshToken) throw AppError.fromCode(ERROR_CODES.AUTH_REQUIRED);
      let payload;
      try {
        payload = jwt.verifyRefresh(refreshToken);
      } catch {
        throw AppError.fromCode(ERROR_CODES.AUTH_REQUIRED);
      }
      const admin = await repo.findAdminById(payload.sub);
      if (!admin) throw AppError.fromCode(ERROR_CODES.AUTH_REQUIRED);
      return { admin: toPublicAdmin(admin), ...issueTokens(admin) };
    },
  };
}

module.exports = { createAdminAuthService, toPublicAdmin };
