'use strict';

/**
 * The Contabo VPS Redis is a SHARED box (~12 other PM2 bots run on it). EaseCab
 * MUST namespace every key under this prefix to avoid collisions (DECISIONS.md
 * 2026-05-30). Always build keys via redisKey() — never concatenate by hand.
 */
const REDIS_PREFIX = 'easecab:';

/**
 * Build a namespaced Redis key from one or more parts.
 * @param {...string} parts - non-empty string segments, joined by ':'
 * @returns {string} e.g. redisKey('otp', '9876543210') -> 'easecab:otp:9876543210'
 * @throws {Error} if no parts are given or any part is not a non-empty string
 */
function redisKey(...parts) {
  if (parts.length === 0) {
    throw new Error('redisKey requires at least one part');
  }
  for (const part of parts) {
    if (typeof part !== 'string' || part.length === 0) {
      throw new Error('redisKey parts must each be a non-empty string');
    }
  }
  return REDIS_PREFIX + parts.join(':');
}

module.exports = { REDIS_PREFIX, redisKey };
