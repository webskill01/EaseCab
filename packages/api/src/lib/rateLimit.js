'use strict';

/**
 * Atomic fixed-window counter (security-review H3). One server-side Redis script:
 * INCR the key, then set the window TTL ONLY when the key currently has none
 * (TTL < 0 — i.e. the first hit of a window, or a healed orphan left by an old
 * crash). This gives a FIXED window (the expiry isn't pushed forward on every
 * call, so the cap is a hard "N per window" not a slidable one) AND removes the
 * INCR-then-EXPIRE crash gap that could orphan a key — both in a single atomic
 * round-trip.
 */
const FIXED_WINDOW_INCR =
  "local n = redis.call('INCR', KEYS[1]); if redis.call('TTL', KEYS[1]) < 0 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return n";

/**
 * Increment a fixed-window rate-limit counter atomically.
 * @param {import('ioredis').Redis} redis
 * @param {string} key - the fully-namespaced counter key
 * @param {number} windowSec - window length in seconds
 * @returns {Promise<number>} the new count within the window
 */
async function fixedWindowIncr(redis, key, windowSec) {
  return redis.eval(FIXED_WINDOW_INCR, 1, key, windowSec);
}

module.exports = { fixedWindowIncr, FIXED_WINDOW_INCR };
