'use strict';

const { AppError, ERROR_CODES, ADMIN_AUTH_COOKIES } = require('@easecab/shared');

/**
 * Admin auth gate (CLAUDE.md §6, Step 24a) — verifies the admin access cookie with
 * the ADMIN JWT secret, so a user token (signed with the user secret) fails here.
 * On success attaches `req.admin = { id, role, email }` from the claims (fast path;
 * the refresh route re-validates against the admin_users table). Every failure —
 * missing cookie, bad signature, expired token — collapses to one generic
 * AppError(AUTH_REQUIRED); the underlying jwt error is never surfaced (§9).
 *
 * @param {object} deps
 * @param {{ verifyAccess(token: string): object }} deps.jwt - admin createJwt instance
 * @returns {import('express').RequestHandler}
 */
function createRequireAdmin({ jwt }) {
  return function requireAdmin(req, _res, next) {
    const token = req.cookies && req.cookies[ADMIN_AUTH_COOKIES.ACCESS_TOKEN];
    if (!token) {
      next(AppError.fromCode(ERROR_CODES.AUTH_REQUIRED));
      return;
    }
    try {
      const payload = jwt.verifyAccess(token);
      req.admin = { id: payload.sub, role: payload.role, email: payload.email };
      next();
    } catch {
      // Expired / tampered / wrong-secret — all collapse to one generic 401.
      next(AppError.fromCode(ERROR_CODES.AUTH_REQUIRED));
    }
  };
}

module.exports = { createRequireAdmin };
