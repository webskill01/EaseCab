'use strict';

// Side-effect import: validates env via Zod and exits the process on bad config.
// Must destructure — env.js exports `{ env }`, not the config directly.
const { env } = require('./config/env.js');

const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const pino = require('pino');
const { createCityResolver } = require('@easecab/shared');
const { createRideRepository } = require('./features/ingest/rideRepository');
const { createProcessMessage } = require('./features/ingest/processMessage');
const { createConnection } = require('./features/whatsapp/connection');
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
  const processMessage = createProcessMessage({
    resolver,
    repository,
    cityNames,
    filters: FILTERS,
    logger,
  });

  const sock = await createConnection({
    sessionPath: env.WA_SESSION_PATH,
    targetGroupJid: env.WA_TARGET_GROUP_JID,
    onMessage: processMessage,
    logger,
  });

  const shutdown = async (signal) => {
    logger.info({ signal }, 'shutting down');
    clearInterval(refresh);
    try {
      sock.end(undefined);
    } catch {
      // socket may already be closed — nothing to do
    }
    await prisma.$disconnect().catch(() => {});
    redis.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  logger.info('easecab-bot listening');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('fatal: easecab-bot failed to start:', err.message);
  process.exit(1);
});
