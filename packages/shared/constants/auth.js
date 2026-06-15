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
 * Admin auth cookies (CLAUDE.md §6) — SEPARATE names + secret from the user cookies
 * above so a user token can never be replayed as admin or vice-versa. The admin API
 * sets/clears these; requireAdmin reads the access cookie.
 */
const ADMIN_AUTH_COOKIES = Object.freeze({
  ACCESS_TOKEN: 'ec_admin_at',
  REFRESH_TOKEN: 'ec_admin_rt',
});

/**
 * Coarse "is an admin" marker embedded in the admin JWT payload (`kind`). The fine
 * DB role (super|reviewer) rides alongside it as `role`. Distinct from USER_ROLE so
 * the two token families are unambiguous.
 */
const ADMIN_ROLE = 'admin';

/**
 * Admin login throttle (CLAUDE.md §6) — password auth needs brute-force defence.
 * Fixed window per email, enforced in Redis via lib/rateLimit (mirrors OTP_RATE_LIMIT).
 */
const ADMIN_LOGIN_RATE_LIMIT = Object.freeze({
  MAX_PER_WINDOW: 5,
  WINDOW_SEC: 900,
});

/**
 * Admin login throttle, SECOND layer — keyed on client IP (security-review H3).
 * The per-email cap above is trivially bypassed by spraying many emails from one
 * host (each email allows 5 bcrypt attempts before locking). This caps TOTAL login
 * attempts from a single IP per window regardless of which email is tried. The cap
 * is higher than the per-email one so a few admins behind one office NAT can still
 * retry, while a credential-spray bot is stopped. Read from req.ip (Express
 * `trust proxy` is set → real client IP from X-Forwarded-For behind Nginx).
 */
const ADMIN_LOGIN_IP_RATE_LIMIT = Object.freeze({
  MAX_PER_WINDOW: 30,
  WINDOW_SEC: 900,
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

module.exports = {
  AUTH_COOKIES,
  OTP_RATE_LIMIT,
  TRIAL_DAYS,
  USER_ROLE,
  ADMIN_AUTH_COOKIES,
  ADMIN_ROLE,
  ADMIN_LOGIN_RATE_LIMIT,
  ADMIN_LOGIN_IP_RATE_LIMIT,
};
