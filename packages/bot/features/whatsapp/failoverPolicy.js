'use strict';

/**
 * Decide what the supervisor does when a slot's connection closes (Phase 2.5
 * 6a). Pure — Baileys' `DisconnectReason.loggedOut` is passed in as
 * `loggedOutCode` so this module has no Baileys dependency and is fully testable.
 *
 * Policy (locked 2026-06-01):
 *   - logout            -> rotate, mark the slot BANNED (definitive).
 *   - transient, < max  -> reconnect the SAME slot (caller applies backoff).
 *   - transient, >= max  -> rotate, mark the slot DEGRADED (soft-ban / dead line).
 *
 * @param {object} args
 * @param {number|undefined} args.code - disconnect status code (may be undefined)
 * @param {number} args.attempt - 1-based transient retry count on this slot
 * @param {number} args.maxAttempts - BACKOFF.MAX_ATTEMPTS
 * @param {number} args.loggedOutCode - DisconnectReason.loggedOut (401)
 * @returns {{ action: 'reconnect'|'rotate', ban: boolean, degrade: boolean }}
 */
function decideOnClose({ code, attempt, maxAttempts, loggedOutCode }) {
  if (code === loggedOutCode) {
    return { action: 'rotate', ban: true, degrade: false };
  }
  if (attempt < maxAttempts) {
    return { action: 'reconnect', ban: false, degrade: false };
  }
  return { action: 'rotate', ban: false, degrade: true };
}

module.exports = { decideOnClose };
