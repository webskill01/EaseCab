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

// Pub/sub channel: easecab-bot publishes here after a new ride is committed;
// the Phase-3 SSE endpoint subscribes and fans the ride out to clients.
const RIDES_NEW_CHANNEL = redisKey('rides', 'new');

// Pub/sub channel: the API publishes here after an app-posted ride is created
// (Step 15) so the push dispatcher can fire a city-targeted notification — the
// posted-ride analogue of RIDES_NEW_CHANNEL (which carries bot rides).
const POSTED_RIDES_NEW_CHANNEL = redisKey('posted-rides', 'new');

module.exports = { REDIS_PREFIX, redisKey, RIDES_NEW_CHANNEL, POSTED_RIDES_NEW_CHANNEL };
