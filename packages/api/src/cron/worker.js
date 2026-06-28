'use strict';

// Side-effect import: validates env via Zod and exits the process on bad config.
const { env } = require('../../config/env.js');

const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const pino = require('pino');
const { createAlerter, createCityResolver, CITY_LLM } = require('@easecab/shared');
const { createRideLifecycleRepository } = require('../../features/rides/rideLifecycle.repository');
const { createRideLifecycleService } = require('../../features/rides/rideLifecycle.service');
const { createBotHealthRepository } = require('../../features/botHealth/botHealth.repository');
const { createStaleWatcher } = require('../../features/botHealth/staleWatcher.service');
const { createCityLlm } = require('../features/cityBackfill/cityLlm');
const { createCityBackfillRepository } = require('../features/cityBackfill/cityBackfill.repository');
const { createCityBackfillService } = require('../features/cityBackfill/cityBackfill.service');

// Aging cycle cadence. The thresholds are 5min/30min/12h, so a 60s tick keeps
// transitions within ~60s of their mark — invisible at these scales. The same
// tick runs the Phase-2.5 bot-feed stale watcher. The live feed feel comes from
// the bot's SSE publish, not this cron.
const TICK_MS = 60 * 1000;

async function main() {
  const logger = pino({ level: 'info' });
  const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
  // Redis client for the stale watcher (supersedes the old "cron = pure DB"
  // decision — see DECISIONS.md 2026-06-01). Read-only use of easecab:bot:* keys.
  const redis = new Redis(env.REDIS_URL);

  const repository = createRideLifecycleRepository({ prisma });
  const service = createRideLifecycleService({ repository, logger });

  const alerter = createAlerter({ redis, logger });
  const botHealthRepository = createBotHealthRepository({ redis });
  const staleWatcher = createStaleWatcher({
    repository: botHealthRepository,
    alerter,
    config: {
      staleAfterMin: env.STALE_AFTER_MIN,
      activeStartHourIST: env.ACTIVE_HOUR_START_IST,
      activeEndHourIST: env.ACTIVE_HOUR_END_IST,
      feedEnabled: env.BOT_FEED_ENABLED,
    },
    logger,
  });

  // City LLM backfill (#14-6) — DORMANT unless GEMINI_API_KEY is set, so the demo
  // box runs without it. Runs every Nth tick (not every 60s): it's an offline,
  // batched sweep that resolves the residual unresolved_city_strings, writes `ai`
  // aliases, and backfills live null-FK rides so the feed reflects them next fetch.
  const backfill = env.GEMINI_API_KEY
    ? createCityBackfillService({
        repo: createCityBackfillRepository({ prisma }),
        llm: createCityLlm({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL, logger }),
        resolver: createCityResolver({ prisma, redis, logger }),
        logger,
      })
    : null;
  if (!backfill) logger.info('city LLM backfill inert (no GEMINI_API_KEY)');
  let tick = 0;

  // One cycle = ride transitions + a bot-feed staleness check (+ the periodic
  // LLM backfill sweep on its slower cadence).
  const runCycle = async () => {
    await service.runTransitions();
    await staleWatcher.check();
    if (backfill && tick % CITY_LLM.SWEEP_EVERY_TICKS === 0) {
      await backfill.sweep();
    }
    tick += 1;
  };

  // Run once on boot so a restart catches up immediately, then on every tick.
  await runCycle();
  const timer = setInterval(runCycle, TICK_MS);

  const shutdown = async (signal) => {
    logger.info({ signal }, 'shutting down ride lifecycle cron');
    clearInterval(timer);
    await prisma.$disconnect().catch(() => {});
    redis.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  logger.info({ tickMs: TICK_MS }, 'ride lifecycle + bot-feed stale watcher cron started');
}

main().catch((err) => {
  // eslint-disable-next-line no-console -- startup fault must reach the operator
  console.error('fatal: ride lifecycle cron failed to start:', err.message);
  process.exit(1);
});
