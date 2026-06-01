'use strict';

const { AppError, ERROR_CODES, AUTH_COOKIES } = require('@easecab/shared');

/**
 * Build the auth gate middleware (CLAUDE.md §3.6 — JWT read from the httpOnly
 * cookie only, never a header/body/query). On success it attaches a minimal
 * `req.user` ({ id, role }) for downstream handlers. Any failure — missing cookie,
 * bad signature, expired token — maps to a single generic AppError(AUTH_REQUIRED);
 * the underlying jwt error is never surfaced to the client (§9).
 *
 * @param {object} deps
 * @param {{ verifyAccess(token: string): object }} deps.jwt - from lib/jwt createJwt
 * @returns {import('express').RequestHandler}
 */
function createRequireAuth({ jwt }) {
  return function requireAuth(req, _res, next) {
    const token = req.cookies && req.cookies[AUTH_COOKIES.ACCESS_TOKEN];
    if (!token) {
      next(AppError.fromCode(ERROR_CODES.AUTH_REQUIRED));
      return;
    }
    try {
      const payload = jwt.verifyAccess(token);
      req.user = { id: payload.sub, role: payload.role };
      next();
    } catch {
      // Expired / tampered / malformed — all collapse to one generic 401.
      next(AppError.fromCode(ERROR_CODES.AUTH_REQUIRED));
    }
  };
}

module.exports = { createRequireAuth };
