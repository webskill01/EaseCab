'use strict';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // India Standard Time = UTC+5:30
const MS_PER_MIN = 60 * 1000;

/**
 * Hour-of-day in IST for an epoch-ms instant. Computed explicitly (not via local
 * TZ) because the VPS may run in UTC while the group + operator are India-based.
 * @param {number} now - epoch ms
 * @returns {number} 0–23
 */
function istHour(now) {
  return new Date(now + IST_OFFSET_MS).getUTCHours();
}

/**
 * Decide whether the bot feed is STALE (Phase 2.5 6b). Pure — `now` and config
 * are injected. Distinguishes "feed is down" from "group is just quiet" with a
 * fixed threshold gated to active hours; a genuinely quiet night never alerts.
 *
 * @param {object} args
 * @param {?number} args.lastIngestAt - epoch ms of the last ride write (null/0 = none)
 * @param {number} args.now - epoch ms
 * @param {number} args.staleAfterMin - minutes without ingest before STALE
 * @param {number} args.activeStartHourIST - inclusive window start (IST hour)
 * @param {number} args.activeEndHourIST - exclusive window end (IST hour)
 * @param {boolean} args.feedEnabled - BOT_FEED_ENABLED
 * @returns {{ stale: boolean, reason: string }}
 */
function decideStale({ lastIngestAt, now, staleAfterMin, activeStartHourIST, activeEndHourIST, feedEnabled }) {
  if (!feedEnabled) {
    return { stale: false, reason: 'feed_disabled' };
  }
  const hour = istHour(now);
  if (hour < activeStartHourIST || hour >= activeEndHourIST) {
    return { stale: false, reason: 'inactive_hours' };
  }
  if (!lastIngestAt) {
    return { stale: true, reason: 'no_ingest_yet' };
  }
  if (now - lastIngestAt > staleAfterMin * MS_PER_MIN) {
    return { stale: true, reason: 'stale' };
  }
  return { stale: false, reason: 'fresh' };
}

module.exports = { decideStale, istHour };
