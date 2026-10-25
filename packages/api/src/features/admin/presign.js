'use strict';

/**
 * Best-effort presigner for admin views: a missing key or absent/erroring R2 boundary
 * yields null, never an error (an image must not break a list). DPs are stored as their
 * public CDN URL (me.service), not a key, so an http(s) value is returned as is.
 *
 * @param {{ presignGet(args: { key: string }): Promise<string> }} [r2]
 * @returns {(key: string | null | undefined) => Promise<string | null>}
 */
function createPresign(r2) {
  return async function presign(key) {
    if (!key) return null;
    if (/^https?:\/\//.test(key)) return key;
    if (!r2) return null;
    try {
      return await r2.presignGet({ key });
    } catch {
      return null;
    }
  };
}

module.exports = { createPresign };
