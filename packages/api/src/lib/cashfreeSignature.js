'use strict';

const crypto = require('node:crypto');

/**
 * Verify a Cashfree PG webhook: base64(HMAC-SHA256(timestamp + rawBody)) keyed with
 * the API SECRET KEY (Cashfree has no separate webhook secret). `rawBody` MUST be the
 * exact bytes received (a Buffer) — a re-serialized object will never match.
 * Returns false (never throws) on missing/malformed input.
 *
 * @param {{ rawBody: Buffer, timestamp: string, signature: string, secretKey: string }} args
 * @returns {boolean}
 */
function verifyWebhookSignature({ rawBody, timestamp, signature, secretKey }) {
  if (!Buffer.isBuffer(rawBody) || typeof timestamp !== 'string' || typeof signature !== 'string' || !timestamp) {
    return false;
  }
  const expected = crypto
    .createHmac('sha256', secretKey)
    .update(Buffer.concat([Buffer.from(timestamp, 'utf8'), rawBody]))
    .digest();
  const given = Buffer.from(signature, 'base64');
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

module.exports = { verifyWebhookSignature };
