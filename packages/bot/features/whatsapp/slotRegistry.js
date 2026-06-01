'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Default pairing check: a slot is paired iff its session dir holds a
 * `creds.json` whose `registered` flag is true (Baileys sets this once the
 * number completes QR pairing). Any fs/JSON error → treated as unpaired (false)
 * so a missing or half-written session dir is simply skipped, never crashes.
 * @param {string} dir - the slot's session directory
 * @returns {boolean}
 */
function defaultIsPaired(dir) {
  try {
    const raw = fs.readFileSync(path.join(dir, 'creds.json'), 'utf8');
    return Boolean(JSON.parse(raw).registered);
  } catch {
    return false;
  }
}

/**
 * Track the WhatsApp number pool as opaque slot labels (no PII) mapped to
 * per-slot session directories. Eligibility = "this slot is already paired", so
 * the operator can start with ONE number and add backups later by simply pairing
 * a new session dir — no code/config rewrite, and an unpaired listed slot is
 * skipped (not treated as a failure). See PHASES.md Phase 2.5 Step 6a.
 *
 * @param {object} deps
 * @param {string} deps.sessionPath - root dir holding one subdir per slot
 * @param {string[]} deps.slots - ordered slot labels (priority order)
 * @param {(dir: string) => boolean} [deps.isPaired] - injectable for tests
 * @returns {{ sessionDirFor: (slot: string) => string, eligibleSlots: () => string[] }}
 */
function createSlotRegistry({ sessionPath, slots, isPaired = defaultIsPaired }) {
  /**
   * Absolute session directory for a slot label.
   * @param {string} slot
   * @returns {string}
   */
  function sessionDirFor(slot) {
    return path.join(sessionPath, slot);
  }

  /**
   * The subset of `slots` whose session dir is paired, in priority order.
   * Re-evaluated on each call so a slot paired at runtime becomes eligible
   * without a restart (powers all-exhausted auto-recovery).
   * @returns {string[]}
   */
  function eligibleSlots() {
    return slots.filter((slot) => isPaired(sessionDirFor(slot)));
  }

  return { sessionDirFor, eligibleSlots };
}

module.exports = { createSlotRegistry, defaultIsPaired };
