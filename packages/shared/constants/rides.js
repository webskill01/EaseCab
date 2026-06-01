'use strict';

/**
 * Ride lifecycle timings — single source of truth for the bot's ride writes and
 * the Phase-7 cron transitions. Durations only (no magic numbers in app code,
 * CLAUDE.md §5). Fingerprint TTL was changed 48h -> 12h on 2026-05-31 (see
 * DECISIONS.md); keep this in sync with that decision.
 */
const RIDE_TIMING = Object.freeze({
  BOOKED_AFTER_MIN: 5, // fresh -> booked after 5 min (age since Ride.receivedAt)
  FEED_TTL_MIN: 30, // fresh ride stays in the feed for 30 min -> Ride.expiresAt
  HARD_DELETE_HRS: 12, // ride row hard-deleted after 12h -> Ride.dbDeleteAt
  FINGERPRINT_TTL_HRS: 12, // dedup fingerprint lives 12h from first sight
});

/**
 * Rides feed pagination bounds (CLAUDE.md §8 — every list endpoint paginated from
 * day one; cursor-based). Consumed by the Step-10 ridesListQuerySchema + service.
 */
const RIDES_FEED = Object.freeze({
  DEFAULT_LIMIT: 20, // page size when the client omits `limit`
  MAX_LIMIT: 50, // hard ceiling so a client can't request an unbounded page
});

module.exports = { RIDE_TIMING, RIDES_FEED };
