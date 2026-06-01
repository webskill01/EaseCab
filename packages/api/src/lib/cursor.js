'use strict';

const { AppError, ERROR_CODES } = require('@easecab/shared');

/**
 * Opaque keyset-pagination cursor codec (CLAUDE.md §8 — cursor-based pagination).
 * The cursor encodes the last row's sort key `(receivedAt, id)` as base64url JSON.
 * It is deliberately opaque to clients: they echo back `meta.nextCursor` verbatim,
 * never construct it. A tampered/garbage cursor decodes to VALIDATION_ERROR (422)
 * rather than leaking an internal error or being silently ignored.
 *
 * @param {object} key
 * @param {Date|string} key.receivedAt - Ride.receivedAt of the last row on the page
 * @param {string} key.id - Ride.id of the last row on the page
 * @returns {string} base64url token
 */
function encodeCursor({ receivedAt, id }) {
  const r = receivedAt instanceof Date ? receivedAt.toISOString() : receivedAt;
  return Buffer.from(JSON.stringify({ r, i: id })).toString('base64url');
}

/**
 * Decode an opaque cursor back to its keyset. Any malformed input — bad base64,
 * non-JSON, wrong shape, or unparseable date — throws AppError(VALIDATION_ERROR).
 *
 * @param {string} token
 * @returns {{ receivedAt: Date, id: string }}
 * @throws {AppError} VALIDATION_ERROR on any decode failure
 */
function decodeCursor(token) {
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(String(token), 'base64url').toString('utf8'));
  } catch {
    throw AppError.fromCode(ERROR_CODES.VALIDATION_ERROR);
  }
  const isShape =
    parsed && typeof parsed === 'object' && typeof parsed.r === 'string' && typeof parsed.i === 'string' && parsed.i.length > 0;
  if (!isShape) {
    throw AppError.fromCode(ERROR_CODES.VALIDATION_ERROR);
  }
  const receivedAt = new Date(parsed.r);
  if (Number.isNaN(receivedAt.getTime())) {
    throw AppError.fromCode(ERROR_CODES.VALIDATION_ERROR);
  }
  return { receivedAt, id: parsed.i };
}

module.exports = { encodeCursor, decodeCursor };
