'use strict';

// Side-effect import: validates env via Zod and exits the process on bad config.
const { env } = require('../../config/env.js');

const { PrismaClient } = require('@prisma/client');
const pino = require('pino');
const { createRideLifecycleRepository } = require('../../features/rides/rideLifecycle.repository');
const { createRideLifecycleService } = require('../../features/rides/rideLifecycle.service');

// Aging cycle cadence. The thresholds are 5min/30min/12h, so a 60s tick keeps
// transitions within ~60s of their mark — invisible at these scales. The live
// feed feel comes from the bot's SSE publish, not this cron.
const TICK_MS = 60 * 1000;

async function main() {
  const logger = pino({ level: 'info' });
  const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });

  const repository = createRideLifecycleRepository({ prisma });
  const service = createRideLifecycleService({ repository, logger });

  // Run once on boot so a restart catches up immediately, then on every tick.
  await service.runTransitions();
  const timer = setInterval(() => {
    service.runTransitions();
  }, TICK_MS);

  const shutdown = async (signal) => {
    logger.info({ signal }, 'shutting down ride lifecycle cron');
    clearInterval(timer);
    await prisma.$disconnect().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  logger.info({ tickMs: TICK_MS }, 'ride lifecycle cron started');
}

main().catch((err) => {
  // eslint-disable-next-line no-console -- startup fault must reach the operator
  console.error('fatal: ride lifecycle cron failed to start:', err.message);
  process.exit(1);
});
