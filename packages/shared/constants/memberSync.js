'use strict';

/**
 * Member-sync API (manager bots read who paid on the app). Read-only, token-guarded.
 * MAX_ROWS caps one response; the whole paying base is a few thousand rows, so a
 * snapshot fits in one call and `meta.truncated` says when it would not.
 */
const MEMBER_SYNC = Object.freeze({
  MAX_ROWS: 10000,
  MAX_PHONES: 500,
  AUTH_MAX_FAILURES: 20,
  AUTH_WINDOW_SEC: 3600,
  PAISE_PER_RUPEE: 100,
  PHONE_PREFIX: '+91',
  PHONE_DIGITS: 10,
});

module.exports = { MEMBER_SYNC };
