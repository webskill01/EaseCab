'use strict';

/**
 * User-facing ride/post report limits. The report reasons themselves are the
 * shared REPORT_REASON enum (see constants/enums.js). REMARKS_MAX bounds the
 * optional free-text remark a reporter can attach.
 */
const REPORT = Object.freeze({
  REMARKS_MAX: 500,
});

/**
 * Reporting a USER (verified poster) — anti-abuse limits (P13-12 #5).
 * - MAX_PER_DAY / WINDOW_SEC: per-reporter fixed-window cap, stops one account
 *   mass-reporting many users.
 * - AUTOHIDE_THRESHOLD: distinct reporters needed before the target is auto-flagged
 *   (User.flaggedAt set → posted rides hidden pending admin review). Dedup is enforced
 *   in the DB (one report per reporter per target), so this counts DISTINCT reporters.
 */
const USER_REPORT = Object.freeze({
  MAX_PER_DAY: 10,
  WINDOW_SEC: 86400,
  AUTOHIDE_THRESHOLD: 3,
});

module.exports = { REPORT, USER_REPORT };
