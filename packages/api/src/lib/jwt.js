'use strict';

const jsonwebtoken = require('jsonwebtoken');

/**
 * JWT factory for the user auth flow (CLAUDE.md §3.6 — tokens live in httpOnly
 * cookies; this module only signs/verifies them). Access and refresh tokens use
 * SEPARATE secrets, so a refresh token can never be replayed as an access token.
 * Admin tokens get their own factory + secret in the admin phase (§6).
 *
 * Verify functions throw the underlying jsonwebtoken error (TokenExpiredError /
 * JsonWebTokenError) on any failure — callers (requireAuth) map that to an
 * AppError(AUTH_REQUIRED). Signing/verifying never logs the token or secret.
 *
 * @param {object} config
 * @param {string} config.accessSecret - >= 32 chars (enforced by serverEnvSchema)
 * @param {string} config.refreshSecret - >= 32 chars
 * @param {string|number} config.accessTtl - e.g. '15m'
 * @param {string|number} config.refreshTtl - e.g. '30d'
 * @returns {{
 *   signAccess(payload: object): string,
 *   signRefresh(payload: object): string,
 *   verifyAccess(token: string): object,
 *   verifyRefresh(token: string): object,
 * }}
 */
function createJwt({ accessSecret, refreshSecret, accessTtl, refreshTtl }) {
  return {
    signAccess(payload) {
      return jsonwebtoken.sign(payload, accessSecret, { expiresIn: accessTtl });
    },
    signRefresh(payload) {
      return jsonwebtoken.sign(payload, refreshSecret, { expiresIn: refreshTtl });
    },
    verifyAccess(token) {
      return jsonwebtoken.verify(token, accessSecret);
    },
    verifyRefresh(token) {
      return jsonwebtoken.verify(token, refreshSecret);
    },
  };
}

module.exports = { createJwt };
