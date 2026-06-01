'use strict';

/**
 * Auth cookie names (CLAUDE.md §3.6 — JWTs live in httpOnly cookies only, never
 * web storage). The API sets/clears these; requireAuth reads the access cookie.
 * Admin uses SEPARATE cookies + secret in its own phase (§6) — do not reuse these
 * for admin auth.
 */
const AUTH_COOKIES = Object.freeze({
  ACCESS_TOKEN: 'ec_at',
  REFRESH_TOKEN: 'ec_rt',
});

module.exports = { AUTH_COOKIES };
