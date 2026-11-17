'use strict';

const { AppError, ERROR_CODES, AUTH_COOKIES } = require('@easecab/shared');
const { isCurrentSession } = require('../features/auth/auth.service');

/**
 * Build the auth gate middleware (CLAUDE.md §3.6 — JWT read from the httpOnly
 * cookie only, never a header/body/query). On success it attaches a minimal
 * `req.user` ({ id, role }) for downstream handlers. Any failure — missing cookie,
 * bad signature, expired token — maps to a single generic AppError(AUTH_REQUIRED);
 * the underlying jwt error is never surfaced to the client (§9).
 *
 * @param {object} deps
 * @param {{ verifyAccess(token: string): object }} deps.jwt - from lib/jwt createJwt
 * @param {?(userId: string) => Promise<?string>} [deps.getSessionId] - single-device
 *   check: a token from a device that has since been replaced by a newer login → 401.
 * @returns {import('express').RequestHandler}
 */
function createRequireAuth({ jwt, getSessionId = null }) {
  return async function requireAuth(req, _res, next) {
    const token = req.cookies && req.cookies[AUTH_COOKIES.ACCESS_TOKEN];
    if (!token) {
      next(AppError.fromCode(ERROR_CODES.AUTH_REQUIRED));
      return;
    }
    let payload;
    try {
      payload = jwt.verifyAccess(token);
    } catch {
      // Expired / tampered / malformed — all collapse to one generic 401.
      next(AppError.fromCode(ERROR_CODES.AUTH_REQUIRED));
      return;
    }
    try {
      if (getSessionId && !isCurrentSession(await getSessionId(payload.sub), payload.sid)) {
        next(AppError.fromCode(ERROR_CODES.AUTH_REQUIRED)); // logged in on another device
        return;
      }
    } catch (err) {
      next(err); // Redis down → global handler (500), never a silent pass
      return;
    }
    req.user = { id: payload.sub, role: payload.role };
    next();
  };
}

module.exports = { createRequireAuth };
