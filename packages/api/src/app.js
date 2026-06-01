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
 * @returns {import('express').Express}
 */
function buildApp({ prisma, redis, logger, config, identity, subscriber }) {
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

  app.use('/api/v1', v1);

  // Terminal: unmatched route -> 404, then the single global error handler.
  app.use(notFound);
  app.use(createErrorHandler({ logger }));

  return app;
}

module.exports = { buildApp };
