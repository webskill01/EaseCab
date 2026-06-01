'use strict';

const { BACKOFF } = require('@easecab/shared');

/**
 * Exponential reconnect delay for a transient (non-logout) disconnect on a slot.
 * Deterministic (no jitter) so the supervisor's behaviour is exactly testable.
 * Capped at BACKOFF.MAX_MS. The supervisor stops retrying after
 * BACKOFF.MAX_ATTEMPTS (then rotates) — this only computes the per-attempt wait.
 *
 * @param {number} attempt - 1-based retry number (1 = first retry)
 * @returns {number} delay in milliseconds
 * @throws {Error} if attempt < 1
 */
function nextDelayMs(attempt) {
  if (!Number.isInteger(attempt) || attempt < 1) {
    throw new Error('nextDelayMs: attempt must be an integer >= 1');
  }
  const delay = BACKOFF.BASE_MS * 2 ** (attempt - 1);
  return Math.min(delay, BACKOFF.MAX_MS);
}

module.exports = { nextDelayMs };
