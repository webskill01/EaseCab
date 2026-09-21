'use strict';

// Side-effect import: validates the server env via Zod and exits on bad config.
const { serverEnv } = require('../config/serverEnv');

const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const pino = require('pino');
const { PAYMENT_RECONCILE } = require('@easecab/shared');
const { buildApp } = require('./app');
const { createFirebaseIdentity } = require('./lib/firebaseAdmin');
const { createChatStore } = require('./lib/firestoreChat');
const { createPushSender } = require('./lib/fcm');
const { createCashfreeClient, createStubCashfreeClient } = require('./lib/cashfree');
const { createSurepassClient, createStubSurepassClient } = require('./lib/surepass');
const { createR2Client, createStubR2Client } = require('./lib/r2.js');

/**
 * Express server entry point (PM2 `easecab-api`, port 4000). Validates env, builds
 * the shared clients, assembles the app, and listens — with graceful shutdown so
 * PM2 reloads/redeploys drain cleanly. Live-I/O glue: coverage-excluded (.c8rc),
 * exercised by the deploy health check `GET /ping`, mirroring src/cron/worker.js.
 */
async function main() {
  const logger = pino({ level: serverEnv.NODE_ENV === 'production' ? 'info' : 'debug' });

  // Refuse to boot a production server with the Surepass stub on — it would silently
  // pass every KYC verification and bypass the posting gate (security-review M3).
  if (serverEnv.SUREPASS_STUB && serverEnv.NODE_ENV === 'production') {
    logger.error('FATAL: SUREPASS_STUB=true in production — refusing to start (KYC would be bypassed)');
    process.exit(1);
  }
  const prisma = new PrismaClient({ datasources: { db: { url: serverEnv.DATABASE_URL } } });
  const redis = new Redis(serverEnv.REDIS_URL);
  // Dedicated connection for the rides SSE fan-out — once it enters subscriber mode
  // it can't run normal commands, so it must be separate from the main `redis`.
  const subscriber = redis.duplicate();
  // A second dedicated subscriber for the Step-15 push dispatcher (separate from the
  // SSE one so each owns its own channel set cleanly).
  const pushSubscriber = redis.duplicate();

  const config = {
    corsOrigins: serverEnv.CORS_ORIGINS,
    // `secure` defaults to "production only", but COOKIE_SECURE overrides it so the
    // HTTPS investor-demo box (stubs on, NODE_ENV !== production) still gets Secure
    // cookies (Phase 9c). `??` keeps an explicit COOKIE_SECURE=false honoured.
    cookie: {
      secure: serverEnv.COOKIE_SECURE ?? serverEnv.NODE_ENV === 'production',
      adminDomain: serverEnv.ADMIN_COOKIE_DOMAIN,
    },
    jwt: {
      accessSecret: serverEnv.JWT_ACCESS_SECRET,
      refreshSecret: serverEnv.JWT_REFRESH_SECRET,
      accessTtl: serverEnv.JWT_ACCESS_TTL,
      refreshTtl: serverEnv.JWT_REFRESH_TTL,
    },
    adminJwt: {
      accessSecret: serverEnv.ADMIN_JWT_ACCESS_SECRET,
      refreshSecret: serverEnv.ADMIN_JWT_REFRESH_SECRET,
      accessTtl: serverEnv.ADMIN_JWT_ACCESS_TTL,
      refreshTtl: serverEnv.ADMIN_JWT_REFRESH_TTL,
    },
    cashfree: {
      secretKey: serverEnv.CASHFREE_SECRET_KEY,
      // Sent to the browser with each checkout so the web SDK mode always matches the API keys.
      env: serverEnv.CASHFREE_ENV,
      // stub demo mode → the service skips webhook signature verification (see subscription.service).
      stub: serverEnv.CASHFREE_STUB,
    },
    // Fleet control-panel peer sync (Phase 17.5).
    fleet: { syncToken: serverEnv.FLEET_SYNC_TOKEN, peers: serverEnv.FLEET_PEERS },
  };

  const identity = createFirebaseIdentity({
    projectId: serverEnv.FIREBASE_PROJECT_ID,
    clientEmail: serverEnv.FIREBASE_CLIENT_EMAIL,
    privateKey: serverEnv.FIREBASE_PRIVATE_KEY,
  });

  // Firestore chat boundary (Step 14) — same Firebase project, separate named app.
  const chatStore = createChatStore({
    projectId: serverEnv.FIREBASE_PROJECT_ID,
    clientEmail: serverEnv.FIREBASE_CLIENT_EMAIL,
    privateKey: serverEnv.FIREBASE_PRIVATE_KEY,
  });

  // FCM push sender (Step 15) — same Firebase project, separate named app.
  const pushSender = createPushSender({
    projectId: serverEnv.FIREBASE_PROJECT_ID,
    clientEmail: serverEnv.FIREBASE_CLIENT_EMAIL,
    privateKey: serverEnv.FIREBASE_PRIVATE_KEY,
  });

  // Cashfree: deterministic stub until activation (CASHFREE_STUB=true), real client at
  // go-live — swapping is an env change, zero code change (Phase 16.1). FATAL in prod so
  // payments can never be silently bypassed live (mirrors the SUREPASS_STUB/R2_STUB guards).
  if (serverEnv.CASHFREE_STUB && serverEnv.NODE_ENV === 'production') {
    logger.error('FATAL: CASHFREE_STUB=true in production — refusing to start (payments would be bypassed)');
    process.exit(1);
  }
  const cashfree = serverEnv.CASHFREE_STUB
    ? createStubCashfreeClient()
    : createCashfreeClient({
        appId: serverEnv.CASHFREE_APP_ID,
        secretKey: serverEnv.CASHFREE_SECRET_KEY,
        env: serverEnv.CASHFREE_ENV,
        returnUrl: serverEnv.CASHFREE_RETURN_URL,
      });

  // Surepass: deterministic stub until incorporation (SUREPASS_STUB=true), real
  // client at go-live — swapping is an env change, zero code change (Step 12).
  const surepass = serverEnv.SUREPASS_STUB
    ? createStubSurepassClient()
    : createSurepassClient({ token: serverEnv.SUREPASS_TOKEN, baseUrl: serverEnv.SUREPASS_BASE_URL });

  // R2: deterministic stub until the bucket exists (R2_STUB=true), real client at
  // go-live — swapping is an env change, zero code change (Step 21a).
  if (serverEnv.R2_STUB && serverEnv.NODE_ENV === 'production') {
    logger.error('FATAL: R2_STUB=true in production — refusing to start (uploads would be broken)');
    process.exit(1);
  }
  const uploads = serverEnv.R2_STUB
    ? createStubR2Client({ bucket: serverEnv.R2_BUCKET, publicBaseUrl: serverEnv.R2_PUBLIC_BASE_URL })
    : createR2Client({
        accountId: serverEnv.R2_ACCOUNT_ID,
        accessKeyId: serverEnv.R2_ACCESS_KEY_ID,
        secretAccessKey: serverEnv.R2_SECRET_ACCESS_KEY,
        bucket: serverEnv.R2_BUCKET,
        publicBaseUrl: serverEnv.R2_PUBLIC_BASE_URL,
      });

  const app = buildApp({ prisma, redis, logger, config, identity, subscriber, cashfree, surepass, chatStore, pushSender, pushSubscriber, uploads });
  const server = app.listen(serverEnv.PORT, () => {
    logger.info({ port: serverEnv.PORT, env: serverEnv.NODE_ENV }, 'easecab api listening');
  });

  // Payment reconciliation (Phase 16.1): credit paid-but-unconfirmed orders if a webhook
  // was lost. Off in stub mode — the stub reports every order paid.
  async function reconcilePayments() {
    try {
      const credited = await app.locals.subscriptionService.reconcileOpenOrders();
      if (credited > 0) logger.warn({ credited }, 'payment reconcile credited orders the webhook missed');
    } catch (err) {
      logger.error({ err }, 'payment reconcile failed');
    }
  }
  const reconcileTimer = serverEnv.CASHFREE_STUB ? null : setInterval(reconcilePayments, PAYMENT_RECONCILE.INTERVAL_MS);

  const shutdown = (signal) => {
    logger.info({ signal }, 'shutting down api server');
    if (reconcileTimer) clearInterval(reconcileTimer);
    server.close(async () => {
      await app.locals.rideFeed?.close().catch(() => {});
      await app.locals.pushDispatcher?.close().catch(() => {});
      await prisma.$disconnect().catch(() => {});
      subscriber.disconnect();
      pushSubscriber.disconnect();
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
