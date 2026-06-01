'use strict';

const { createHash } = require('node:crypto');

/**
 * Deterministic dedup fingerprint for a message. Phone-length digit runs are
 * collapsed to "PHONE" so the same lead with a re-typed number still dedups.
 * NO time bucket — dedup window is enforced by the 12h ride_fingerprints TTL.
 *
 * Uses a 64-bit slice of SHA-1 (not a MAC — just a dedup key). The previous
 * 32-bit djb2 had a ~2.1B key space (50% birthday collision near 65k distinct
 * messages, and trivially craftable collisions to suppress a target ride);
 * 64 bits pushes the collision space to ~1.8e19 and makes collisions
 * non-craftable. Same input → same output (so existing rows stay valid until
 * they age out of the 12h window).
 * @param {string} text
 * @returns {string} fingerprint, or '' for empty input
 */
function fingerprint(text) {
  if (!text) return '';
  const normalized = text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/\d{10,}/g, 'PHONE')
    .trim()
    .substring(0, 300);

  const digest = createHash('sha1').update(normalized).digest('hex').slice(0, 16);
  return `fp-${digest}`;
}

module.exports = { fingerprint };
