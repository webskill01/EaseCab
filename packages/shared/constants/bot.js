'use strict';

const { redisKey } = require('./redis');

/**
 * Bot resilience constants (Phase 2.5) — shared by @easecab/bot (number pool,
 * heartbeat, alerts) and @easecab/api (cron stale watcher). Frozen value sets +
 * namespaced Redis keys; no magic strings/numbers in app code (CLAUDE.md §5).
 * The bot feed is a temporary bridge — see PHASES.md Phase 2.5 + DECISIONS.md.
 */

/** Lifecycle state of one WhatsApp number slot in the pool. */
const SLOT_STATE = Object.freeze({
  ACTIVE: 'active', // currently connected and ingesting
  BANNED: 'banned', // WhatsApp logged it out (definitive) — rotated away from
  DEGRADED: 'degraded', // exhausted reconnect backoff without a clean logout — rotated away from
  UNREGISTERED: 'unregistered', // listed but its session dir is not paired yet — skipped
});

/** Operational events the bot/cron raise to the admin alert surface. */
const ALERT_EVENT = Object.freeze({
  NUMBER_BANNED: 'number_banned', // a slot was logged out
  FAILOVER: 'failover', // rotated from one slot to another
  FEED_STALE: 'feed_stale', // no ride ingested within the stale window (active hours)
  ALL_EXHAUSTED: 'all_exhausted', // no eligible slot left — feed is dark (sev-1)
});

/** Alert severities. SEV1 = page-worthy (feed fully dark). */
const ALERT_SEV = Object.freeze({
  INFO: 'info',
  WARN: 'warn',
  SEV1: 'sev1',
});

/**
 * Default health thresholds. STALE/active-hours are env-overridable on the cron;
 * these are the fallback defaults + the bot-side timers. Hours are IST (the
 * operator + group are India-based); the stale decision computes IST explicitly.
 */
const BOT_HEALTH = Object.freeze({
  STALE_AFTER_MIN: 20, // flag STALE when no ride landed in this many minutes (active hours)
  ACTIVE_HOUR_START_IST: 6, // inclusive — watcher only flags stale within [start, end)
  ACTIVE_HOUR_END_IST: 23, // exclusive
  RESCAN_MS: 60 * 1000, // when all slots exhausted, re-scan for a newly-paired slot this often
  CONNECT_TIMEOUT_MS: 60 * 1000, // a slot that never reaches 'open' in this window = a failed attempt
});

/** Reconnect backoff for transient (non-logout) disconnects on one slot. */
const BACKOFF = Object.freeze({
  BASE_MS: 1000, // first retry delay
  MAX_MS: 5 * 60 * 1000, // cap
  MAX_ATTEMPTS: 5, // after this many transient retries on a slot, mark it degraded + rotate
});

// Redis keys (shared box — always namespaced via redisKey, DECISIONS.md 2026-05-30).
const BOT_NUMBERS_KEY = redisKey('bot', 'numbers'); // hash: slot -> {state,lastCode,since}
const BOT_LAST_INGEST_KEY = redisKey('bot', 'last_ingest_at'); // epoch ms of the last ride write
const BOT_ALERTS_KEY = redisKey('bot', 'alerts'); // hash: event -> {sev,since,detail?}

module.exports = {
  SLOT_STATE,
  ALERT_EVENT,
  ALERT_SEV,
  BOT_HEALTH,
  BACKOFF,
  BOT_NUMBERS_KEY,
  BOT_LAST_INGEST_KEY,
  BOT_ALERTS_KEY,
};
