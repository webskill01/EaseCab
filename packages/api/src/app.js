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
const { createPostParser } = require('./features/posted-rides/postedRides.parse');
const { createPostedRidesRouter } = require('./features/posted-rides/postedRides.route');
const { createCityResolver } = require('@easecab/shared');
const { createMeRepository } = require('./features/me/me.repository');
const { createMeService } = require('./features/me/me.service');
const { createMeRouter } = require('./features/me/me.route');
const { createUsersRepository } = require('./features/users/users.repository');
const { createUsersService } = require('./features/users/users.service');
const { createUsersRouter } = require('./features/users/users.route');
const { createChatRepository } = require('./features/chat/chat.repository');
const { createChatService } = require('./features/chat/chat.service');
const { createChatRouter } = require('./features/chat/chat.route');
const { createBlocksRepository } = require('./features/blocks/blocks.repository');
const { createBlocksService } = require('./features/blocks/blocks.service');
const { createBlocksRouter } = require('./features/blocks/blocks.route');
const { createPushRepository } = require('./features/push/push.repository');
const { createPushService } = require('./features/push/push.service');
const { createPushRouter } = require('./features/push/push.route');
const { createPushDispatcher } = require('./features/push/pushDispatcher');
const { createUploadsService } = require('./features/uploads/uploads.service');
const { createUploadsRouter } = require('./features/uploads/uploads.route');
const { createRequireAdmin } = require('./middleware/requireAdmin');
const { createAdminAuthRepository } = require('./features/admin/adminAuth.repository');
const { createAdminAuthService } = require('./features/admin/adminAuth.service');
const { createAdminAuthRouter } = require('./features/admin/adminAuth.route');
const { createAdminVerificationsRepository } = require('./features/admin/adminVerifications.repository');
const { createAdminVerificationsService } = require('./features/admin/adminVerifications.service');
const { createAdminVerificationsRouter } = require('./features/admin/adminVerifications.route');
const { createAdminReportsRepository } = require('./features/admin/adminReports.repository');
const { createAdminReportsService } = require('./features/admin/adminReports.service');
const { createAdminReportsRouter } = require('./features/admin/adminReports.route');
const { createAdminUsersRepository } = require('./features/admin/adminUsers.repository');
const { createAdminUsersService } = require('./features/admin/adminUsers.service');
const { createAdminUsersRouter } = require('./features/admin/adminUsers.route');
const { createAdminCityStringsRepository } = require('./features/admin/adminCityStrings.repository');
const { createAdminCityStringsService } = require('./features/admin/adminCityStrings.service');
const { createAdminCityStringsRouter } = require('./features/admin/adminCityStrings.route');
const { createAdminUnresolvedRidesRepository } = require('./features/admin/adminUnresolvedRides.repository');
const { createAdminUnresolvedRidesService } = require('./features/admin/adminUnresolvedRides.service');
const { createAdminUnresolvedRidesRouter } = require('./features/admin/adminUnresolvedRides.route');
const { createAdminUserReportsRepository } = require('./features/admin/adminUserReports.repository');
const { createAdminUserReportsService } = require('./features/admin/adminUserReports.service');
const { createAdminUserReportsRouter } = require('./features/admin/adminUserReports.route');
const { createAdminStatsRepository } = require('./features/admin/adminStats.repository');
const { createAdminStatsService } = require('./features/admin/adminStats.service');
const { createAdminStatsRouter } = require('./features/admin/adminStats.route');
const { createPasswordHasher } = require('./lib/passwordHasher');

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
 * @param {{ accessSecret, refreshSecret, accessTtl, refreshTtl }} deps.config.adminJwt
 *   - SEPARATE admin JWT secrets/TTLs (Step 24a, §6); a second createJwt instance.
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
 * @param {{ presignPost, presignGet, headObject, publicUrl }} [deps.uploads] - injected
 *   Cloudflare R2 boundary (Step 21a). Optional like chatStore/pushSender — only the
 *   uploads routes touch it, so harnesses that don't exercise uploads may omit it.
 * @returns {import('express').Express}
 */
function buildApp({ prisma, redis, logger, config, identity, subscriber, razorpay, surepass, chatStore, pushSender, pushSubscriber, uploads }) {
  const app = express();
  app.disable('x-powered-by');
  // Behind Nginx — trust the first proxy hop so client IP (rate limiting) and
  // protocol (secure-cookie decisions) are read from X-Forwarded-* correctly.
  app.set('trust proxy', 1);

  app.locals.prisma = prisma;
  app.locals.redis = redis;
  app.locals.jwt = createJwt(config.jwt);
  // Admin JWT (Step 24a) — a SECOND createJwt with separate secrets (§6). Optional in
  // buildApp wiring like chatStore/uploads: production ALWAYS supplies config.adminJwt
  // (serverEnvSchema requires ADMIN_JWT_* and exits if absent), so the only callers
  // that omit it are non-admin test harnesses, which simply don't mount /admin/auth.
  if (config.adminJwt) {
    app.locals.adminJwt = createJwt(config.adminJwt);
  }
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
  v1.use('/auth', createAuthRouter({ service: authService, config, requireAuth }));

  // Cities (Step 13) — authed typeahead for the post form + Step-18 filter bar.
  // Built before the admin block so Step-24e can reuse citiesService behind requireAdmin.
  const citiesRepo = createCitiesRepository({ prisma });
  const citiesService = createCitiesService({ repo: citiesRepo, redis });

  // Admin auth (Step 24a) — fully isolated: own JWT secret, own cookies, checks the
  // admin_users table only (CLAUDE.md §6). requireAdmin gates the 24b–24e admin
  // feature routers. Password hashing via the bcryptjs boundary. Mounted only when
  // config.adminJwt is present (always true in production — see app.locals above).
  if (app.locals.adminJwt) {
    const requireAdmin = createRequireAdmin({ jwt: app.locals.adminJwt });
    const adminAuthRepo = createAdminAuthRepository({ prisma, redis });
    const adminAuthService = createAdminAuthService({ repo: adminAuthRepo, jwt: app.locals.adminJwt, hasher: createPasswordHasher() });
    v1.use('/admin/auth', createAdminAuthRouter({ service: adminAuthService, config, requireAdmin }));

    // Dashboard stats (Step 24a) — queue counts + today's ride count for the landing page.
    const adminStatsRepo = createAdminStatsRepository({ prisma });
    const adminStatsService = createAdminStatsService({ repo: adminStatsRepo });
    v1.use('/admin/stats', createAdminStatsRouter({ service: adminStatsService, requireAdmin }));

    // Verifications queue (Step 24b) — submitted DL/RC review + manual driver badge.
    // `uploads` is the optional R2 client (presignGet for private KYC images); when
    // absent (non-admin/test harnesses) image URLs resolve to null, never an error.
    const adminVerificationsRepo = createAdminVerificationsRepository({ prisma });
    const adminVerificationsService = createAdminVerificationsService({ repo: adminVerificationsRepo, r2: uploads });
    v1.use('/admin/verifications', createAdminVerificationsRouter({ service: adminVerificationsService, requireAdmin }));

    // Ride reports moderation (Step 24c) — dismiss/remove on bot + posted-ride reports.
    // r2=uploads presigns the user-supplied screenshot (§12); null when R2 absent.
    const adminReportsRepo = createAdminReportsRepository({ prisma });
    const adminReportsService = createAdminReportsService({ repo: adminReportsRepo, r2: uploads });
    v1.use('/admin/reports', createAdminReportsRouter({ service: adminReportsService, requireAdmin }));

    // User management (Step 24d) — searchable directory + flag-only soft-delete/restore.
    const adminUsersRepo = createAdminUsersRepository({ prisma });
    const adminUsersService = createAdminUsersService({ repo: adminUsersRepo });
    v1.use('/admin/users', createAdminUsersRouter({ service: adminUsersService, requireAdmin }));

    // City-string resolution (Step 24e) — admin clears unresolved_city_strings by
    // writing manual aliases (feeds CityResolverService) or dismissing junk; the
    // /cities sub-route reuses citiesService behind requireAdmin for the picker.
    const adminCityStringsRepo = createAdminCityStringsRepository({ prisma });
    const adminCityStringsService = createAdminCityStringsService({ repo: adminCityStringsRepo });
    v1.use('/admin/city-strings', createAdminCityStringsRouter({ service: adminCityStringsService, citiesService, requireAdmin }));

    // Unresolved-rides queue — live bot rides the CityResolver left without a
    // pickup/drop city; admin fills the missing FK (reusing the /cities picker) or
    // hides the ride. Distinct from city-strings: a per-ride fix, not a resolver alias.
    const adminUnresolvedRidesRepo = createAdminUnresolvedRidesRepository({ prisma });
    const adminUnresolvedRidesService = createAdminUnresolvedRidesService({ repo: adminUnresolvedRidesRepo });
    v1.use('/admin/unresolved-rides', createAdminUnresolvedRidesRouter({ service: adminUnresolvedRidesService, citiesService, requireAdmin }));

    const adminUserReportsService = createAdminUserReportsService({ repo: createAdminUserReportsRepository({ prisma }), r2: uploads });
    v1.use('/admin/user-reports', createAdminUserReportsRouter({ service: adminUserReportsService, requireAdmin }));
  }

  // Uploads (Step 21a) — built early because the report (rides/posted-rides), profile-DP,
  // and image-attach paths all consume its verifyUpload gate. R2 boundary injected as
  // `uploads` (optional); bytes go direct to R2, never here (§8/§12).
  const uploadsService = createUploadsService({ r2: uploads });

  // Rides (Step 10) — authed. One SSE fan-out (backed by `subscriber`) serves all
  // stream clients; start the subscription now and stash it for graceful shutdown.
  const ridesRepo = createRidesRepository({ prisma, redis });
  const ridesService = createRidesService({ repo: ridesRepo, uploads: uploadsService });
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

  // Cities (Step 13) — mount the authed typeahead (citiesService built above).
  v1.use('/cities', createCitiesRouter({ service: citiesService, requireAuth }));

  // Posted rides (Step 13) — authed app-native posts (24h TTL); KYC-gated create,
  // subscription-gated contact. The free-text parser (Step 20) reuses the shared
  // CityResolver + extractors to turn a pasted message into a draft preview.
  const postedRidesRepo = createPostedRidesRepository({ prisma, redis });
  const postedRidesService = createPostedRidesService({ repo: postedRidesRepo, logger, uploads: uploadsService });
  const postParser = createPostParser({
    repo: postedRidesRepo,
    resolver: createCityResolver({ prisma, redis, logger }),
    logger,
  });
  v1.use('/posted-rides', createPostedRidesRouter({ service: postedRidesService, parser: postParser, requireAuth }));

  // Uploads (Step 21a) — authed presigned-POST issuance for DP/car/KYC/report images.
  // Service built above (consumed by the report + me paths); just mount the router here.
  v1.use('/uploads', createUploadsRouter({ service: uploadsService, requireAuth }));

  // My Rides → Contacted (Step 19) + profile read/update + image-attach (Step 21b).
  const meRepo = createMeRepository({ prisma });
  const meService = createMeService({ repo: meRepo, uploads: uploadsService });
  v1.use('/me', createMeRouter({ service: meService, requireAuth, cookieSecure: config.cookie.secure }));

  // Public poster profile (T3-2) — read-only, no PII; opened by tapping another user.
  const usersService = createUsersService({ repo: createUsersRepository({ prisma, redis }), uploads: uploadsService });
  v1.use('/users', createUsersRouter({ service: usersService, requireAuth }));

  // Chat (Step 14) — authed 1:1 chat per verified ride contact. API is the sole
  // writer to both Postgres (durable) and Firestore (realtime, via chatStore).
  const chatRepo = createChatRepository({ prisma, redis });
  const chatService = createChatService({ repo: chatRepo, chatStore, uploads: uploadsService });
  v1.use('/chats', createChatRouter({ service: chatService, requireAuth }));

  // Blocks (P12-4c) — authed user-to-user block; chat-scoped enforcement lives in
  // the chat service (open/send check isBlockedBetween).
  const blocksService = createBlocksService({ repo: createBlocksRepository({ prisma }) });
  v1.use('/blocks', createBlocksRouter({ service: blocksService, requireAuth }));

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
