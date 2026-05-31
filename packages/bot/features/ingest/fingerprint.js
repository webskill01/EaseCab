'use strict';

/**
 * Deterministic dedup fingerprint for a message. Phone-length digit runs are
 * collapsed to "PHONE" so the same lead with a re-typed number still dedups.
 * NO time bucket — dedup window is enforced by the 12h ride_fingerprints TTL.
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

  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 32-bit
  }
  return `fp-${Math.abs(hash).toString(36)}`;
}

module.exports = { fingerprint };
