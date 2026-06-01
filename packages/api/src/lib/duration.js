'use strict';

const UNIT_MS = Object.freeze({ s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 });

/**
 * Convert a short duration string (e.g. '15m', '30d') to milliseconds — used to
 * derive cookie `maxAge` from the JWT TTL so the cookie lifetime and the token
 * lifetime share one source of truth (the env TTL). Supports s/m/h/d only.
 *
 * @param {string} value - e.g. '30s', '15m', '2h', '30d'
 * @returns {number} milliseconds
 * @throws {Error} on any unrecognized format
 */
function durationToMs(value) {
  const match = /^(\d+)(s|m|h|d)$/.exec(String(value).trim());
  if (!match) {
    throw new Error(`durationToMs: invalid duration "${value}"`);
  }
  return Number(match[1]) * UNIT_MS[match[2]];
}

module.exports = { durationToMs };
