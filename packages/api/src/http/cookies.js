'use strict';

const { AUTH_COOKIES, ADMIN_AUTH_COOKIES } = require('@easecab/shared');
const { durationToMs } = require('../lib/duration');

/**
 * Shared cookie attributes (CLAUDE.md §3.6 — JWTs live in httpOnly cookies only).
 * sameSite:'lax' is correct for cross-SUBDOMAIN calls (easecab.com → api.easecab.com
 * are same-site under the eTLD+1), while still blocking cross-site CSRF. `secure`
 * is on in production, off in dev/test so plain-http localhost works.
 *
 * `domain` is optional and used ONLY by the admin cookies (security-review M2): in
 * production it is set to the parent domain (e.g. `.easecab.com`) so the admin cookie
 * is sent to admin.easecab.com too, letting the Next middleware route-gate read it.
 * Omitted in dev/test → host-only cookie (shared across localhost ports already).
 * @param {boolean} secure
 * @param {string} [domain]
 */
function baseOpts(secure, domain) {
  const opts = { httpOnly: true, secure, sameSite: 'lax', path: '/' };
  if (domain) opts.domain = domain;
  return opts;
}

/**
 * Set the access + refresh cookies. Cookie maxAge is derived from the JWT TTLs so
 * the cookie and token expire together.
 * @param {import('express').Response} res
 * @param {{ accessToken: string, refreshToken: string }} tokens
 * @param {{ secure: boolean, accessTtl: string, refreshTtl: string }} cfg
 */
function setAuthCookies(res, { accessToken, refreshToken }, { secure, accessTtl, refreshTtl }) {
  res.cookie(AUTH_COOKIES.ACCESS_TOKEN, accessToken, { ...baseOpts(secure), maxAge: durationToMs(accessTtl) });
  res.cookie(AUTH_COOKIES.REFRESH_TOKEN, refreshToken, { ...baseOpts(secure), maxAge: durationToMs(refreshTtl) });
}

/**
 * Clear both auth cookies. Attributes must match those used to set them or the
 * browser keeps the cookie.
 * @param {import('express').Response} res
 * @param {{ secure: boolean }} cfg
 */
function clearAuthCookies(res, { secure }) {
  res.clearCookie(AUTH_COOKIES.ACCESS_TOKEN, baseOpts(secure));
  res.clearCookie(AUTH_COOKIES.REFRESH_TOKEN, baseOpts(secure));
}

/**
 * Admin variants of setAuthCookies/clearAuthCookies (Step 24a) — identical
 * attributes, but the ADMIN cookie names (CLAUDE.md §6). Kept as separate functions
 * so neither auth flow can touch the other's cookies by accident.
 * @param {import('express').Response} res
 * @param {{ accessToken: string, refreshToken: string }} tokens
 * @param {{ secure: boolean, accessTtl: string, refreshTtl: string, domain?: string }} cfg
 */
function setAdminAuthCookies(res, { accessToken, refreshToken }, { secure, accessTtl, refreshTtl, domain }) {
  res.cookie(ADMIN_AUTH_COOKIES.ACCESS_TOKEN, accessToken, { ...baseOpts(secure, domain), maxAge: durationToMs(accessTtl) });
  res.cookie(ADMIN_AUTH_COOKIES.REFRESH_TOKEN, refreshToken, { ...baseOpts(secure, domain), maxAge: durationToMs(refreshTtl) });
}

/**
 * Clear both admin auth cookies (attributes — incl. domain — must match those used
 * to set them, or the browser keeps the cookie).
 * @param {import('express').Response} res
 * @param {{ secure: boolean, domain?: string }} cfg
 */
function clearAdminAuthCookies(res, { secure, domain }) {
  res.clearCookie(ADMIN_AUTH_COOKIES.ACCESS_TOKEN, baseOpts(secure, domain));
  res.clearCookie(ADMIN_AUTH_COOKIES.REFRESH_TOKEN, baseOpts(secure, domain));
}

module.exports = { setAuthCookies, clearAuthCookies, setAdminAuthCookies, clearAdminAuthCookies };
