'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const pinoHttp = require('pino-http');

const { sendSuccess } = require('./http/respond');
const { createJwt } = require('./lib/jwt');
const { requestContext } = require('./middleware/requestContext');
const { createRequireAuth } = require('./middleware/requireAuth');
const { notFound } = require('./middleware/notFound');
const { createErrorHandler } = require('./middleware/errorHandler');
const { createAuthRepository } = require('./features/auth/auth.repository');
const { createAuthService } = require('./features/auth/auth.service');
const { createAuthRouter } = require('./features/auth/auth.route');
const { createRidesRepository } = require('./features/rides/rides.repository');
const { createRidesService } = require('./features/rides/rides.service');
const { createRideFeed } = require('./features/rides/rideFeed');
const { createRidesRouter } = require('./features/rides/rides.route');
const { createSubscriptionRepository } = require('./features/subscription/subscription.repository');
const { createSubscriptionService } = require('./features/subscription/subscription.service');
const { createSubscriptionRouter, createWebhookHandler } = require('./features/subscription/subscription.route');
const { createVerificationRepository } = require('./features/verification/verification.repository');
const { createVerificationService } = require('./features/verification/verification.service');
const { createVerificationRouter } = require('./features/verification/verification.route');
const { createCitiesRepository } = require('./features/cities/cities.repository');
const { createCitiesService } = require('./features/cities/cities.service');
const { createCitiesRouter } = require('./features/cities/cities.route');
const { createPostedRidesRepository } = require('./features/posted-rides/postedRides.repository');
const { createPostedRidesService } = require('./features/posted-rides/postedRides.service');
const { createPostedRidesRouter } = require('./features/posted-rides/postedRides.route');
const { createChatRepository } = require('./features/chat/chat.repository');
const { createChatService } = require('./features/chat/chat.service');
const { createChatRouter } = require('./features/chat/chat.route');
const { createPushRepository } = require('./features/push/push.repository');
const { createPushService } = require('./features/push/push.service');
const { createPushRouter } = require('./features/push/push.route');
const { createPushDispatcher } = require('./features/push/pushDispatcher');

/**
 * Assemble the Express application — pure wiring, no `listen` (server.js owns the
 * socket; tests drive the returned app via supertest). Everything is injected so
 * nothing here reads env or creates a connection (CLAUDE.md layering + testability).
 *
 * Shared deps (prisma, redis, jwt) are stashed on `app.locals` so the route
 * factories added in Steps 9–10 (`app.use('/api/v1', ...)`) reuse a single
 * instance of each. Step 8 mounts only `/ping` + an empty `/api/v1` router.
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 * @param {import('ioredis').Redis} deps.redis
 * @param {import('pino').Logger} deps.logger
 * @param {object} deps.config
 * @param {string[]} deps.config.corsOrigins
 * @param {{ secure: boolean }} deps.config.cookie
 * @param {{ accessSecret, refreshSecret, accessTtl, refreshTtl }} deps.config.jwt
 * @param {{ verifyOtpToken(idToken: string): Promise<{ phone: string }> }} deps.identity
 * @param {import('ioredis').Redis} deps.subscriber - dedicated redis subscriber
 *   (a `redis.duplicate()`) backing the rides SSE fan-out; a subscriber-mode
 *   connection can't run normal commands, so it must be separate from `redis`.
 * @param {{ createOrder(args): Promise<{ id: string }> }} deps.razorpay - injected
 *   Razorpay vendor boundary (Step 11); the subscription service depends only on
 *   this interface, never on the SDK.
 * @param {{ generateAadhaarOtp, submitAadhaarOtp, verifyDl, verifyRc }} deps.surepass
 *   - injected Surepass KYC vendor boundary (Step 12); stub until incorporation.
 * @param {{ createChatDoc, appendMessage }} [deps.chatStore] - injected Firestore
 *   chat boundary (Step 14); the API is the sole writer to Firestore. Only the chat
 *   routes touch it, so other deploy/test harnesses may omit it.
 * @param {{ sendToTokens }} [deps.pushSender] - injected FCM boundary (Step 15).
 *   Only the push dispatcher uses it; harnesses that don't exercise dispatch omit it.
 * @param {import('ioredis').Redis} [deps.pushSubscriber] - dedicated subscriber
 *   (a second `redis.duplicate()`) backing the live city-targeted push fan-out. The
 *   dispatcher starts only when BOTH pushSubscriber and pushSender are provided.
 * @returns {import('express').Express}
 */
function buildApp({ prisma, redis, logger, config, identity, subscriber, razorpay, surepass, chatStore, pushSender, pushSubscriber }) {
  const app = express();
  app.disable('x-powered-by');
  // Behind Nginx — trust the first proxy hop so client IP (rate limiting) and
  // protocol (secure-cookie decisions) are read from X-Forwarded-* correctly.
  app.set('trust proxy', 1);

  app.locals.prisma = prisma;
  app.locals.redis = redis;
  app.locals.jwt = createJwt(config.jwt);
  app.locals.config = config;

  // requestId first so every log line + error envelope can carry it.
  app.use(requestContext);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id,
      // Health probes are high-frequency noise — don't log them.
      autoLogging: { ignore: (req) => req.url === '/ping' },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      // Minimal serializers — NEVER log headers/cookies (JWT + PII, §10).
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins, credentials: true }));

  // Subscription service (Step 11). The webhook must read the RAW body for HMAC, so
  // it is mounted with express.raw() BEFORE the global express.json() below.
  const subscriptionRepo = createSubscriptionRepository({ prisma, redis });
  const subscriptionService = createSubscriptionService({ repo: subscriptionRepo, razorpay, config });
  app.use(
    '/api/v1/subscriptions/webhook',
    express.raw({ type: '*/*', limit: '100kb' }),
    createWebhookHandler({ service: subscriptionService }),
  );

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // Deploy health check — root path, OUTSIDE /api/v1 (CLAUDE.md §11 probes /ping).
  app.get('/ping', (_req, res) => sendSuccess(res, { data: { status: 'ok' } }));

  // Shared cookie auth gate for the protected routers (auth routes are public).
  const requireAuth = createRequireAuth({ jwt: app.locals.jwt });

  // Versioned API surface.
  const v1 = express.Router();

  // Auth (Step 9) — public.
  const authRepo = createAuthRepository({ prisma, redis });
  const authService = createAuthService({ repo: authRepo, jwt: app.locals.jwt, identity, config });
  v1.use('/auth', createAuthRouter({ service: authService, config }));

  // Rides (Step 10) — authed. One SSE fan-out (backed by `subscriber`) serves all
  // stream clients; start the subscription now and stash it for graceful shutdown.
  const ridesRepo = createRidesRepository({ prisma, redis });
  const ridesService = createRidesService({ repo: ridesRepo });
  const rideFeed = createRideFeed({ subscriber, repo: ridesRepo, logger });
  rideFeed.start().catch((err) => logger.error({ err: err.message }, 'rides SSE subscribe failed'));
  app.locals.rideFeed = rideFeed;
  v1.use('/rides', createRidesRouter({ service: ridesService, feed: rideFeed, requireAuth }));

  // Subscriptions (Step 11) — authed checkout/verify/me (webhook mounted above).
  v1.use('/subscriptions', createSubscriptionRouter({ service: subscriptionService, requireAuth }));

  // Verification (Step 12) — authed Surepass KYC flows (aadhaar otp/verify, dl, rc, me).
  const verificationRepo = createVerificationRepository({ prisma, redis });
  const verificationService = createVerificationService({ repo: verificationRepo, surepass });
  v1.use('/verification', createVerificationRouter({ service: verificationService, requireAuth }));

  // Cities (Step 13) — authed typeahead for the post form + Step-18 filter bar.
  const citiesRepo = createCitiesRepository({ prisma });
  const citiesService = createCitiesService({ repo: citiesRepo });
  v1.use('/cities', createCitiesRouter({ service: citiesService, requireAuth }));

  // Posted rides (Step 13) — authed app-native posts (24h TTL); KYC-gated create,
  // subscription-gated contact.
  const postedRidesRepo = createPostedRidesRepository({ prisma, redis });
  const postedRidesService = createPostedRidesService({ repo: postedRidesRepo, logger });
  v1.use('/posted-rides', createPostedRidesRouter({ service: postedRidesService, requireAuth }));

  // Chat (Step 14) — authed 1:1 chat per verified ride contact. API is the sole
  // writer to both Postgres (durable) and Firestore (realtime, via chatStore).
  const chatRepo = createChatRepository({ prisma });
  const chatService = createChatService({ repo: chatRepo, chatStore });
  v1.use('/chats', createChatRouter({ service: chatService, requireAuth }));

  // Push (Step 15) — authed FCM token registration + per-source notification
  // preferences. The live city-targeted fan-out runs via a dedicated subscriber,
  // started only when BOTH it and the FCM sender are provided (other harnesses omit
  // them, exactly like chatStore — the routes themselves never touch pushSender).
  const pushRepo = createPushRepository({ prisma });
  const pushService = createPushService({ repo: pushRepo, pushSender });
  v1.use('/push', createPushRouter({ service: pushService, requireAuth }));
  if (pushSubscriber && pushSender) {
    const pushDispatcher = createPushDispatcher({ subscriber: pushSubscriber, service: pushService, logger });
    pushDispatcher.start().catch((err) => logger.error({ err: err.message }, 'push dispatcher subscribe failed'));
    app.locals.pushDispatcher = pushDispatcher;
  }

  app.use('/api/v1', v1);

  // Terminal: unmatched route -> 404, then the single global error handler.
  app.use(notFound);
  app.use(createErrorHandler({ logger }));

  return app;
}

module.exports = { buildApp };
