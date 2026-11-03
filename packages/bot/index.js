'use strict';

// Side-effect import: validates env via Zod and exits the process on bad config.
// Must destructure — env.js exports `{ env }`, not the config directly.
const { env } = require('./config/env.js');

const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const pino = require('pino');
const { DisconnectReason } = require('@whiskeysockets/baileys');
const {
  createCityResolver, createAlerter, createTelegramNotifier, BOT_FILTERS_CHANGED_CHANNEL, BOT_GROUPS_CHANGED_CHANNEL,
  BOT_HEALTH, BOT_LOST_MSGS_KEY, BOT_SESSIONS_CHANGED_CHANNEL, BOT_PAIR_CMD_CHANNEL, botSlotStatsKey, botSlotGroupsKey,
  botSlotRidesKey, botSlotLagKey, WA_SESSIONS,
} = require('@easecab/shared');
const { createRideRepository } = require('./features/ingest/rideRepository');
const { createProcessMessage } = require('./features/ingest/processMessage');
const { createHeartbeat } = require('./features/health/recordHeartbeat');
const { createConnection, getLostGroupMessageCount } = require('./features/whatsapp/connection');
const { createSlotRegistry } = require('./features/whatsapp/slotRegistry');
const { createNumberPool } = require('./features/whatsapp/numberPool');
const { createFilterStore } = require('./features/filters/filterStore');
const { createGroupStore } = require('./features/groups/groupStore');
const { createSessionStore } = require('./features/sessions/sessionStore');
const { createPairingManager, moveAside } = require('./features/sessions/pairingManager');

const CITY_REFRESH_MS = 5 * 60 * 1000; // re-pull the city vocab every 5 min

/**
 * Load the extraction vocabulary: every active city's canonical name plus all of
 * its aliases. Aliases are included so extractCities can DETECT alias spellings
 * in a message (e.g. "gurgaon"); the resolver then maps the detected fragment to
 * a canonical id. (Refines the plan's "canonicalName only" — see PROGRESS.md.)
 * @param {PrismaClient} prisma
 * @returns {Promise<string[]>}
 */
async function loadCityVocab(prisma) {
  const cities = await prisma.city.findMany({
    where: { isActive: true },
    select: { canonicalName: true, aliases: { select: { aliasText: true } } },
  });
  const vocab = [];
  for (const c of cities) {
    vocab.push(c.canonicalName);
    for (const a of c.aliases) vocab.push(a.aliasText);
  }
  return vocab;
}

async function main() {
  const logger = pino({ level: 'info' });

  // Kill switch (Phase 2.5 6d): when disabled the bot ingests nothing. Stay
  // alive (idle) so PM2 doesn't treat a clean exit as a crash and restart-loop.
  if (!env.BOT_FEED_ENABLED) {
    logger.warn('BOT_FEED_ENABLED=false — bot feed disabled; not ingesting');
    const idle = setInterval(() => {}, 1 << 30);
    const stopIdle = () => {
      clearInterval(idle);
      process.exit(0);
    };
    process.on('SIGINT', stopIdle);
    process.on('SIGTERM', stopIdle);
    return;
  }

  const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
  const redis = new Redis(env.REDIS_URL);

  // Filter lists live in bot_filter_entries (Phase 17.3), group on/off switches in
  // wa_groups (Phase 18). start() throws on an unreadable table, which exits the
  // process: never ingest unfiltered or blind.
  const filterStore = createFilterStore({ prisma, logger });
  await filterStore.start();
  const groupStore = createGroupStore({ prisma, logger });
  await groupStore.start();
  // Which numbers run = wa_sessions (Phase 25, admin Sessions tab); WA_NUMBERS only seeds it once.
  const sessionStore = createSessionStore({ prisma, logger, seedSlots: env.WA_NUMBERS });
  await sessionStore.start();

  // Hold the vocab in a stable array reference and mutate it in place on refresh,
  // so the processMessage closure always sees the latest cities without re-wiring.
  const cityNames = await loadCityVocab(prisma);
  logger.info({ count: cityNames.length }, 'city vocab loaded');
  const refresh = setInterval(async () => {
    try {
      const fresh = await loadCityVocab(prisma);
      cityNames.length = 0;
      cityNames.push(...fresh);
    } catch (err) {
      logger.warn({ err: err.message }, 'city vocab refresh failed; keeping previous');
    }
    // ponytail: backstop for a publish missed while Redis was down; worst case a
    // filter or group switch lands CITY_REFRESH_MS late.
    await filterStore.reload();
    await groupStore.reload();
    await onSessionsChanged().catch((err) => logger.warn({ err: err.message }, 'session refresh failed'));
  }, CITY_REFRESH_MS);

  const resolver = createCityResolver({ prisma, redis, logger });
  const repository = createRideRepository({ prisma, redis, logger });
  const heartbeat = createHeartbeat({ redis, logger });
  const ingest = createProcessMessage({
    resolver,
    repository,
    cityNames,
    filters: filterStore.filters,
    heartbeat,
    logger,
  });
  // Per-session outcome counters for the admin Sessions tab (best-effort).
  const processMessage = async (m) => {
    const result = await ingest(m);
    if (m.botId) {
      const tx = redis.multi().hincrby(botSlotStatsKey(m.botId), result.reason, 1);
      if (result.saved) {
        const city = result.ride.pickupCityId || WA_SESSIONS.RIDE_STATS_UNKNOWN_CITY;
        const hourKey = botSlotRidesKey(m.botId, Math.floor(Date.now() / WA_SESSIONS.HOUR_MS));
        tx.hincrby(hourKey, city, 1).expire(hourKey, WA_SESSIONS.RIDE_STATS_TTL_SEC)
          .hincrby(botSlotRidesKey(m.botId, 'all'), city, 1);
        if (m.sentAt) {
          const lagKey = botSlotLagKey(m.botId); // WhatsApp send → saved + published to the app
          tx.lpush(lagKey, Math.max(0, Date.now() - m.sentAt)).ltrim(lagKey, 0, WA_SESSIONS.LAG_SAMPLES - 1);
        }
      }
      tx.exec().catch((err) => logger.warn({ err: err.message }, 'could not count session outcome'));
    }
    return result;
  };

  // Number-pool supervisor (Phase 2.5 6a): manages failover/rotation across the
  // configured slots; createConnection is the per-slot live-socket factory.
  const notify = createTelegramNotifier({
    token: env.TELEGRAM_ALERT_BOT_TOKEN, chatId: env.TELEGRAM_ALERT_CHAT_ID, logger,
  });
  const alerter = createAlerter({ redis, logger, notify });
  const registry = createSlotRegistry({ sessionPath: env.WA_SESSION_PATH, slots: sessionStore.enabledSlots });
  const busy = new Set(); // slots a pairing run owns
  const pool = createNumberPool({
    groups: groupStore,
    onMessage: processMessage,
    logger,
    redis,
    alerter,
    registry,
    connectionFactory: createConnection,
    loggedOutCode: DisconnectReason.loggedOut,
    busy,
    onPhone: (slot, phone) => sessionStore.notePhone(slot, phone),
    onGroups: (slot, jids) => {
      const key = botSlotGroupsKey(slot);
      const tx = redis.multi().del(key);
      if (jids.length) tx.sadd(key, ...jids);
      tx.exec().catch((err) => logger.warn({ err: err.message, slot }, 'could not store session groups'));
    },
  });
  pool.start();
  const pairing = createPairingManager({
    redis, logger, registry, pool, busy, sessions: sessionStore, connectionFactory: createConnection,
  });

  /** Admin added / renamed / paused / removed a session: apply it now. */
  async function onSessionsChanged() {
    const { removed } = await sessionStore.reload();
    for (const slot of removed) {
      await pool.release(slot, { logout: true });
      moveAside(registry.sessionDirFor(slot), 'removed');
    }
    pool.rescan(); // stops paused slots, starts resumed ones
  }

  // The admin API publishes on every change; apply it immediately.
  const subscriber = redis.duplicate();
  subscriber.on('message', (channel, payload) => {
    if (channel === BOT_GROUPS_CHANGED_CHANNEL) return groupStore.reload();
    if (channel === BOT_FILTERS_CHANGED_CHANNEL) return filterStore.reload();
    const run = channel === BOT_PAIR_CMD_CHANNEL
      ? Promise.resolve().then(() => pairing.handle(JSON.parse(payload))) // bad JSON → caught below
      : onSessionsChanged();
    return run.catch((err) => logger.error({ err: err.message, channel }, 'session command failed'));
  });
  await subscriber.subscribe(
    BOT_FILTERS_CHANGED_CHANNEL, BOT_GROUPS_CHANGED_CHANNEL, BOT_SESSIONS_CHANGED_CHANNEL, BOT_PAIR_CMD_CHANNEL,
  );

  // Diagnostic for the group-only shouldIgnoreJid trade-off (connection.js): how many
  // group messages arrived as "unavailable" placeholders and were never recovered.
  const lostLog = setInterval(() => {
    const lostGroupMessages = getLostGroupMessageCount();
    logger.info({ lostGroupMessages }, 'lost group messages (since start)');
    redis.set(BOT_LOST_MSGS_KEY, String(lostGroupMessages))
      .catch((err) => logger.warn({ err: err.message }, 'could not store lost-message count'));
  }, BOT_HEALTH.LOST_MSG_LOG_MS);

  const shutdown = async (signal) => {
    logger.info({ signal }, 'shutting down');
    clearInterval(refresh);
    clearInterval(lostLog);
    try {
      pool.stop();
    } catch {
      // pool may already be stopped — nothing to do
    }
    await prisma.$disconnect().catch(() => {});
    subscriber.disconnect();
    redis.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  logger.info({ slots: sessionStore.enabledSlots().length }, 'easecab-bot listening to all enabled groups (number pool active)');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('fatal: easecab-bot failed to start:', err.message);
  process.exit(1);
});
