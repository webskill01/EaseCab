'use strict';

const crypto = require('node:crypto');
const {
  AppError, ERROR_CODES, HTTP_STATUS, SLOT_STATE, BOT_NUMBERS_KEY, BOT_SESSIONS_CHANGED_CHANNEL, BOT_PAIR_CMD_CHANNEL,
  SESSION_STATUS, PAIR_STATUS, WA_SESSIONS, RIDE_STATS_PERIOD_HOURS, botPairKey, botSlotStatsKey, botSlotGroupsKey,
  botSlotRidesKey, botSlotLagKey, botPairShareKey,
} = require('@easecab/shared');

const LIVE_BY_STATE = Object.freeze({
  [SLOT_STATE.ACTIVE]: SESSION_STATUS.LIVE,
  [SLOT_STATE.CONNECTING]: SESSION_STATUS.CONNECTING,
  [SLOT_STATE.DEGRADED]: SESSION_STATUS.DOWN,
  [SLOT_STATE.BANNED]: SESSION_STATUS.LOGGED_OUT,
  [SLOT_STATE.UNREGISTERED]: SESSION_STATUS.NOT_PAIRED,
  [SLOT_STATE.PAUSED]: SESSION_STATUS.PAUSED,
});

/**
 * Group → app delay over recent saved rides.
 * @param {string[]} samples - ms values from the bot's lag list
 * @returns {?{ median: number, p95: number, max: number, samples: number }}
 */
function delayStats(samples) {
  const v = (samples || []).map(Number).filter((n) => n >= 0).sort((a, b) => a - b);
  if (!v.length) return null;
  const at = (q) => v[Math.min(v.length - 1, Math.floor(q * v.length))];
  return { median: at(0.5), p95: at(0.95), max: v[v.length - 1], samples: v.length };
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const parse = (s) => {
  try {
    return s ? JSON.parse(s) : null;
  } catch {
    return null; // a corrupt record reads as "no record"
  }
};

/**
 * What the admin sees for one session. The bot rewrites each slot's live record every
 * LIVE_TICK_MS; an old record means the bot process isn't running (OFFLINE).
 * @param {{ enabled: boolean, phone: ?string }} row
 * @param {?{ state: string, at?: number }} live
 * @param {number} now
 * @returns {string} a SESSION_STATUS
 */
function deriveStatus(row, live, now) {
  if (!row.enabled) return SESSION_STATUS.PAUSED;
  if (!live || !live.at || now - live.at > WA_SESSIONS.LIVE_STALE_MS) {
    return row.phone ? SESSION_STATUS.OFFLINE : SESSION_STATUS.NOT_PAIRED;
  }
  return LIVE_BY_STATE[live.state] || SESSION_STATUS.OFFLINE;
}

/**
 * Admin WhatsApp sessions (Phase 25). The bot owns every socket; this service reads
 * the state the bot writes to Redis and sends it commands over pub/sub.
 * @param {object} deps
 * @param {ReturnType<import('./adminWaSessions.repository').createAdminWaSessionsRepository>} deps.repo
 * @param {import('ioredis').Redis} deps.redis
 * @param {{ warn: Function }} deps.logger
 */
function createAdminWaSessionsService({ repo, redis, logger }) {
  async function notify(channel, payload) {
    try {
      await redis.publish(channel, payload);
    } catch (err) {
      logger.warn({ err: err.message, channel }, 'wa sessions publish failed');
      if (channel === BOT_PAIR_CMD_CHANNEL) throw err; // pairing has no backstop refresh
    }
  }

  async function mustFind(id) {
    const row = await repo.findById(id);
    if (!row) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
    return row;
  }

  /** Per-session group counts: total, and groups no other session is in. */
  async function groupCounts(slots) {
    const keys = slots.map(botSlotGroupsKey);
    const [union, ...per] = await Promise.all([
      keys.length ? redis.sunion(...keys) : [],
      ...keys.map((k, i) => redis.sdiff(k, ...keys.filter((_, j) => j !== i))),
      ...keys.map((k) => redis.scard(k)),
    ]);
    const unique = per.slice(0, keys.length);
    const totals = per.slice(keys.length);
    return { all: union.length, bySlot: slots.map((_, i) => ({ total: totals[i], unique: unique[i].length })) };
  }

  /**
   * Saved rides per pickup city over the last `hours` hourly buckets (null = all time).
   * @returns {Promise<{ total: number, byCity: Record<string, number> }>}
   */
  async function sumRides(slot, hours) {
    const hourNow = Math.floor(Date.now() / WA_SESSIONS.HOUR_MS);
    const keys = hours === null
      ? [botSlotRidesKey(slot, 'all')]
      : Array.from({ length: hours }, (_, i) => botSlotRidesKey(slot, hourNow - i));
    const byCity = {};
    let total = 0;
    for (const h of await Promise.all(keys.map((k) => redis.hgetall(k)))) {
      for (const [city, n] of Object.entries(h || {})) {
        byCity[city] = (byCity[city] || 0) + Number(n);
        total += Number(n);
      }
    }
    return { total, byCity };
  }

  /** Start pairing a session; `phone` → pairing code instead of a QR. */
  async function startPairing(slot, phone) {
    await redis.set(botPairKey(slot), JSON.stringify({ status: PAIR_STATUS.STARTING, updatedAt: Date.now() }),
      'EX', WA_SESSIONS.PAIR_STATE_TTL_SEC);
    await notify(BOT_PAIR_CMD_CHANNEL, JSON.stringify({ slot, ...(phone ? { phone } : {}) }));
    return { status: PAIR_STATUS.STARTING };
  }

  /** @returns {Promise<object>} the bot's pairing progress for a slot (status null = none) */
  async function pairState(slot) {
    return parse(await redis.get(botPairKey(slot))) || { status: null };
  }

  return {
    deriveStatus,

    /** Every session with live status + stats, plus fleet totals. */
    async list() {
      const now = Date.now();
      const rows = await repo.list();
      const slots = rows.map((r) => r.slot);
      const [liveMap, rides24h, groups, stats, lags] = await Promise.all([
        redis.hgetall(BOT_NUMBERS_KEY),
        Promise.all(slots.map((s) => sumRides(s, RIDE_STATS_PERIOD_HOURS.day))),
        groupCounts(slots),
        Promise.all(slots.map((s) => redis.hgetall(botSlotStatsKey(s)))),
        Promise.all(slots.map((s) => redis.lrange(botSlotLagKey(s), 0, -1))),
      ]);
      const sessions = rows.map((row, i) => {
        const live = parse((liveMap || {})[row.slot]);
        return {
          ...row,
          status: deriveStatus(row, live, now),
          lastMsgAt: live ? live.lastMsgAt : null,
          statusSince: live ? live.since : null,
          reconnects: live ? live.reconnects || 0 : 0,
          botStartedAt: live ? live.bootAt || null : null,
          groups: groups.bySlot[i],
          rides24h: rides24h[i].total,
          delay: delayStats(lags[i]),
          outcomes: Object.fromEntries(Object.entries(stats[i] || {}).map(([k, v]) => [k, Number(v)])),
        };
      });
      return { sessions, totals: { groups: groups.all, max: WA_SESSIONS.MAX_SESSIONS } };
    },

    async create({ name }) {
      if ((await repo.count()) >= WA_SESSIONS.MAX_SESSIONS) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Session limit reached', HTTP_STATUS.CONFLICT);
      }
      const row = await repo.create({ slot: `wa-${crypto.randomBytes(4).toString('hex')}`, name });
      await notify(BOT_SESSIONS_CHANGED_CHANNEL, 'changed');
      return row;
    },

    async update(id, data) {
      const row = await repo.update(id, data);
      if (!row) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      if (data.enabled !== undefined) await notify(BOT_SESSIONS_CHANGED_CHANNEL, 'changed');
      return row;
    },

    /** Delete: the bot logs the number out and moves its session dir aside. */
    async remove(id) {
      const row = await repo.remove(id);
      if (!row) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      await notify(BOT_SESSIONS_CHANGED_CHANNEL, 'changed');
      await redis.del(botSlotStatsKey(row.slot), botSlotGroupsKey(row.slot), botPairKey(row.slot),
        botSlotRidesKey(row.slot, 'all'), botSlotLagKey(row.slot));
      await redis.hdel(BOT_NUMBERS_KEY, row.slot);
      return { id };
    },

    /** Rides per pickup city over a rolling window (oracle-panel style). */
    async analytics(id, period) {
      const { slot } = await mustFind(id);
      const hours = RIDE_STATS_PERIOD_HOURS[period];
      const { total, byCity } = await sumRides(slot, hours);
      const names = await repo.cityNames(Object.keys(byCity).filter((c) => c !== WA_SESSIONS.RIDE_STATS_UNKNOWN_CITY));
      const cities = Object.entries(byCity)
        .map(([c, count]) => ({ city: names[c] || null, count }))
        .sort((a, b) => b.count - a.count);
      const until = Date.now();
      return { period, total, cities, from: hours === null ? null : until - hours * WA_SESSIONS.HOUR_MS, until };
    },

    /** Clear a session's ride counts (hourly + all-time + the all-time column). */
    async resetAnalytics(id) {
      const { slot } = await mustFind(id);
      const hourNow = Math.floor(Date.now() / WA_SESSIONS.HOUR_MS);
      const span = WA_SESSIONS.RIDE_STATS_TTL_SEC / 3600; // every bucket that can still exist
      await redis.del(botSlotRidesKey(slot, 'all'), ...Array.from({ length: span }, (_, i) => botSlotRidesKey(slot, hourNow - i)));
      await repo.update(id, { ridesSaved: 0 });
      return { id };
    },

    /** Groups this number is in, with names the bot has recorded. */
    async groups(id) {
      const { slot } = await mustFind(id);
      const jids = await redis.smembers(botSlotGroupsKey(slot));
      const known = new Map((jids.length ? await repo.groupsByJid(jids) : []).map((g) => [g.jid, g]));
      return jids
        .map((jid) => known.get(jid) || { jid, name: null, participants: null, enabled: true })
        .sort((a, b) => (!a.name - !b.name) || (a.name || '').localeCompare(b.name || '')); // unnamed last
    },

    async pair(id, phone) {
      return startPairing((await mustFind(id)).slot, phone);
    },

    async pairStatus(id) {
      return pairState((await mustFind(id)).slot);
    },

    /** One-time-style share link for someone else to scan (valid SHARE_TTL_SEC). */
    async share(id) {
      const { slot } = await mustFind(id);
      const token = crypto.randomBytes(WA_SESSIONS.SHARE_TOKEN_BYTES).toString('base64url');
      await redis.set(botPairShareKey(sha256(token)), slot, 'EX', WA_SESSIONS.SHARE_TTL_SEC);
      return { token, expiresAt: Date.now() + WA_SESSIONS.SHARE_TTL_SEC * 1000 };
    },

    /** Public share page: resolve a token to its session (NOT_FOUND when expired). */
    async byShareToken(token) {
      const slot = await redis.get(botPairShareKey(sha256(token)));
      const row = slot ? await repo.findBySlot(slot) : null;
      if (!row) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      return row;
    },

    async publicStatus(token) {
      const row = await this.byShareToken(token);
      const { status, qrSvg, code, updatedAt } = await pairState(row.slot);
      // Linked → the link is used up (it could otherwise re-pair over a live session).
      if (status === PAIR_STATUS.PAIRED) await redis.del(botPairShareKey(sha256(token)));
      return { name: row.name, status, qrSvg, code, updatedAt };
    },

    async publicPair(token, phone) {
      const row = await this.byShareToken(token);
      const live = parse(await redis.hget(BOT_NUMBERS_KEY, row.slot));
      if (deriveStatus(row, live, Date.now()) === SESSION_STATUS.LIVE) {
        throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'This session is already linked', HTTP_STATUS.CONFLICT);
      }
      return startPairing(row.slot, phone);
    },
  };
}

module.exports = { createAdminWaSessionsService, deriveStatus, delayStats };
