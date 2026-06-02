'use strict';

// Side-effect import: validates the server env via Zod and exits on bad config.
const { serverEnv } = require('../config/serverEnv');

const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const pino = require('pino');
const { buildApp } = require('./app');
const { createFirebaseIdentity } = require('./lib/firebaseAdmin');
const { createRazorpayClient } = require('./lib/razorpay');
const { createSurepassClient, createStubSurepassClient } = require('./lib/surepass');

/**
 * Express server entry point (PM2 `easecab-api`, port 4000). Validates env, builds
 * the shared clients, assembles the app, and listens — with graceful shutdown so
 * PM2 reloads/redeploys drain cleanly. Live-I/O glue: coverage-excluded (.c8rc),
 * exercised by the deploy health check `GET /ping`, mirroring src/cron/worker.js.
 */
async function main() {
  const logger = pino({ level: serverEnv.NODE_ENV === 'production' ? 'info' : 'debug' });
  const prisma = new PrismaClient({ datasources: { db: { url: serverEnv.DATABASE_URL } } });
  const redis = new Redis(serverEnv.REDIS_URL);
  // Dedicated connection for the rides SSE fan-out — once it enters subscriber mode
  // it can't run normal commands, so it must be separate from the main `redis`.
  const subscriber = redis.duplicate();

  const config = {
    corsOrigins: serverEnv.CORS_ORIGINS,
    cookie: { secure: serverEnv.NODE_ENV === 'production' },
    jwt: {
      accessSecret: serverEnv.JWT_ACCESS_SECRET,
      refreshSecret: serverEnv.JWT_REFRESH_SECRET,
      accessTtl: serverEnv.JWT_ACCESS_TTL,
      refreshTtl: serverEnv.JWT_REFRESH_TTL,
    },
    razorpay: {
      keyId: serverEnv.RAZORPAY_KEY_ID,
      keySecret: serverEnv.RAZORPAY_KEY_SECRET,
      webhookSecret: serverEnv.RAZORPAY_WEBHOOK_SECRET,
    },
  };

  const identity = createFirebaseIdentity({
    projectId: serverEnv.FIREBASE_PROJECT_ID,
    clientEmail: serverEnv.FIREBASE_CLIENT_EMAIL,
    privateKey: serverEnv.FIREBASE_PRIVATE_KEY,
  });

  const razorpay = createRazorpayClient({
    keyId: serverEnv.RAZORPAY_KEY_ID,
    keySecret: serverEnv.RAZORPAY_KEY_SECRET,
  });

  // Surepass: deterministic stub until incorporation (SUREPASS_STUB=true), real
  // client at go-live — swapping is an env change, zero code change (Step 12).
  const surepass = serverEnv.SUREPASS_STUB
    ? createStubSurepassClient()
    : createSurepassClient({ token: serverEnv.SUREPASS_TOKEN, baseUrl: serverEnv.SUREPASS_BASE_URL });

  const app = buildApp({ prisma, redis, logger, config, identity, subscriber, razorpay, surepass });
  const server = app.listen(serverEnv.PORT, () => {
    logger.info({ port: serverEnv.PORT, env: serverEnv.NODE_ENV }, 'easecab api listening');
  });

  const shutdown = (signal) => {
    logger.info({ signal }, 'shutting down api server');
    server.close(async () => {
      await app.locals.rideFeed?.close().catch(() => {});
      await prisma.$disconnect().catch(() => {});
      subscriber.disconnect();
      redis.disconnect();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console -- startup fault must reach the operator
  console.error('fatal: api server failed to start:', err.message);
  process.exit(1);
});
