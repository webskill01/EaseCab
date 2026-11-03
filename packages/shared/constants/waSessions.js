'use strict';

const { redisKey } = require('./redis');

/**
 * Multi-session WhatsApp management (Phase 25): the admin Sessions tab talks to
 * easecab-bot through these Redis channels/keys. The API never holds a socket; the
 * bot owns every WhatsApp connection and only publishes state.
 */

/** Admin changed wa_sessions (add / rename / pause / remove) → bot reloads its slot list. */
const BOT_SESSIONS_CHANGED_CHANNEL = redisKey('bot', 'sessions', 'changed');
/** Admin asked the bot to start pairing a slot. Payload: { slot, phone? }. */
const BOT_PAIR_CMD_CHANNEL = redisKey('bot', 'pair', 'cmd');

/** @param {string} slot @returns {string} pairing status JSON written by the bot */
const botPairKey = (slot) => redisKey('bot', 'pair', 'state', slot);
/** @param {string} slot @returns {string} hash: processMessage outcome reason -> count */
const botSlotStatsKey = (slot) => redisKey('bot', 'slot_stats', slot);
/** @param {string} slot @returns {string} set of group JIDs this number is in */
const botSlotGroupsKey = (slot) => redisKey('bot', 'slot_groups', slot);
/**
 * Saved rides per pickup city for one slot: `bucket` = hour number (ms / 1h) or 'all'.
 * Hash city id ('unknown' when unresolved) -> count. Rides are deleted at 12h, so the
 * 24h / 7d / 30d views read these instead of the rides table.
 * @param {string} slot @param {number|'all'} bucket @returns {string}
 */
const botSlotRidesKey = (slot, bucket) => redisKey('bot', 'slot_rides', slot, String(bucket));
/** @param {string} tokenHash - sha256 hex of a share token @returns {string} -> slot */
const botPairShareKey = (tokenHash) => redisKey('bot', 'pair_share', tokenHash);

/** Pairing lifecycle shown in the admin panel and on the share page. */
const PAIR_STATUS = Object.freeze({
  STARTING: 'starting', // command received, socket opening
  QR: 'qr', // a QR is ready to scan
  CODE: 'code', // a phone-number pairing code is ready to type in
  PAIRED: 'paired', // linked — the session now ingests
  EXPIRED: 'expired', // nobody scanned within the window
  FAILED: 'failed', // WhatsApp refused / too many reconnects
});

/** Effective session status the admin panel shows (derived by the API). */
const SESSION_STATUS = Object.freeze({
  LIVE: 'live', // connected, bot heartbeat fresh
  CONNECTING: 'connecting', // reconnecting / backoff
  DOWN: 'down', // backoff exhausted, retried each minute
  LOGGED_OUT: 'logged_out', // WhatsApp unlinked it — pair again
  NOT_PAIRED: 'not_paired', // never linked
  PAUSED: 'paused', // admin switched it off
  OFFLINE: 'offline', // bot process not reporting
});

const WA_SESSIONS = Object.freeze({
  NAME_MAX: 40,
  MAX_SESSIONS: 20, // ponytail: ~200 MB RAM each on the 8 GB box; raise with a bigger VPS
  PAIR_WINDOW_MS: 3 * 60 * 1000, // stop showing QRs after this long without a scan
  PAIR_STATE_TTL_SEC: 10 * 60,
  PAIR_MAX_RECONNECTS: 8, // 515 restartRequired right after a scan is normal
  SHARE_TTL_SEC: 30 * 60, // share link lifetime
  SHARE_TOKEN_BYTES: 24,
  LIVE_TICK_MS: 30 * 1000, // bot refreshes each slot's live record this often
  LIVE_STALE_MS: 90 * 1000, // older than this → OFFLINE (bot not running)
  PAIR_PUBLIC_RATE_MAX: 30, // public share-page calls per IP per window
  PAIR_PUBLIC_RATE_WINDOW_SEC: 60,
  HOUR_MS: 60 * 60 * 1000,
  RIDE_STATS_TTL_SEC: 31 * 24 * 60 * 60, // hourly buckets outlive the 30-day view
  RIDE_STATS_UNKNOWN_CITY: 'unknown',
});

/** Ride-analytics windows (rolling, ending now) in hours; null = all time. */
const RIDE_STATS_PERIOD_HOURS = Object.freeze({ day: 24, week: 24 * 7, month: 24 * 30, all: null });

module.exports = {
  BOT_SESSIONS_CHANGED_CHANNEL,
  BOT_PAIR_CMD_CHANNEL,
  botPairKey,
  botSlotStatsKey,
  botSlotGroupsKey,
  botSlotRidesKey,
  botPairShareKey,
  RIDE_STATS_PERIOD_HOURS,
  PAIR_STATUS,
  SESSION_STATUS,
  WA_SESSIONS,
};
