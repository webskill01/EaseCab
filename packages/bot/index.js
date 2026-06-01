'use strict';

// Side-effect import: validates env via Zod and exits the process on bad config.
// Must destructure — env.js exports `{ env }`, not the config directly.
const { env } = require('./config/env.js');

const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const pino = require('pino');
const { DisconnectReason } = require('@whiskeysockets/baileys');
const { createCityResolver, createAlerter } = require('@easecab/shared');
const { createRideRepository } = require('./features/ingest/rideRepository');
const { createProcessMessage } = require('./features/ingest/processMessage');
const { createHeartbeat } = require('./features/health/recordHeartbeat');
const { createConnection } = require('./features/whatsapp/connection');
const { createSlotRegistry } = require('./features/whatsapp/slotRegistry');
const { createNumberPool } = require('./features/whatsapp/numberPool');
const { FILTERS } = require('./config/filters');

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
  }, CITY_REFRESH_MS);

  const resolver = createCityResolver({ prisma, redis, logger });
  const repository = createRideRepository({ prisma, redis, logger });
  const heartbeat = createHeartbeat({ redis, logger });
  const processMessage = createProcessMessage({
    resolver,
    repository,
    cityNames,
    filters: FILTERS,
    heartbeat,
    logger,
  });

  // Number-pool supervisor (Phase 2.5 6a): manages failover/rotation across the
  // configured slots; createConnection is the per-slot live-socket factory.
  const alerter = createAlerter({ redis, logger });
  const registry = createSlotRegistry({ sessionPath: env.WA_SESSION_PATH, slots: env.WA_NUMBERS });
  const pool = createNumberPool({
    slots: env.WA_NUMBERS,
    targetGroupJid: env.WA_TARGET_GROUP_JID,
    onMessage: processMessage,
    logger,
    redis,
    alerter,
    registry,
    connectionFactory: createConnection,
    loggedOutCode: DisconnectReason.loggedOut,
  });
  pool.start();

  const shutdown = async (signal) => {
    logger.info({ signal }, 'shutting down');
    clearInterval(refresh);
    try {
      pool.stop();
    } catch {
      // pool may already be stopped — nothing to do
    }
    await prisma.$disconnect().catch(() => {});
    redis.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  logger.info({ slots: env.WA_NUMBERS.length }, 'easecab-bot listening (number pool active)');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('fatal: easecab-bot failed to start:', err.message);
  process.exit(1);
});
