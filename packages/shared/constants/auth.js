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

/**
 * OTP request limits enforced by OUR /send-otp gate in Redis (CLAUDE.md §6),
 * independent of Firebase's own throttling. MAX_PER_HOUR requests per phone per
 * rolling WINDOW_SEC; RESEND_COOLDOWN_SEC minimum gap between consecutive sends.
 */
const OTP_RATE_LIMIT = Object.freeze({
  MAX_PER_HOUR: 3,
  WINDOW_SEC: 3600,
  RESEND_COOLDOWN_SEC: 30,
});

/** Full-access trial length granted on first sign-in (CLAUDE.md §1). */
const TRIAL_DAYS = 7;

/** Role embedded in the user JWT payload (requireAuth → req.user.role). Admin is separate (§6). */
const USER_ROLE = 'user';

module.exports = { AUTH_COOKIES, OTP_RATE_LIMIT, TRIAL_DAYS, USER_ROLE };
