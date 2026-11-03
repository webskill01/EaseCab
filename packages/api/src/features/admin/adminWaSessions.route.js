'use strict';

const express = require('express');
const {
  AppError, ERROR_CODES, HTTP_STATUS, WA_SESSIONS, redisKey,
  adminWaSessionCreateSchema, adminWaSessionUpdateSchema, adminWaSessionIdParamSchema,
  waPairStartSchema, waPairTokenParamSchema, adminWaSessionAnalyticsQuerySchema,
} = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');
const { fixedWindowIncr } = require('../../lib/rateLimit');

const byId = validate(adminWaSessionIdParamSchema, 'params');

/**
 * Mount /api/v1/admin/wa-sessions (Phase 25). Gated by requireAdmin. Add, name, pause,
 * remove and pair the WhatsApp numbers easecab-bot reads rides from.
 * @param {object} deps
 * @param {ReturnType<import('./adminWaSessions.service').createAdminWaSessionsService>} deps.service
 * @param {import('express').RequestHandler} deps.requireAdmin
 * @returns {import('express').Router}
 */
function createAdminWaSessionsRouter({ service, requireAdmin }) {
  const router = express.Router();
  router.use(requireAdmin);

  router.get('/', async (_req, res) => {
    sendSuccess(res, { data: await service.list() });
  });
  router.post('/', validate(adminWaSessionCreateSchema), async (req, res) => {
    sendSuccess(res, { status: HTTP_STATUS.CREATED, data: { session: await service.create(req.valid.body) } });
  });
  router.patch('/:id', byId, validate(adminWaSessionUpdateSchema), async (req, res) => {
    sendSuccess(res, { data: { session: await service.update(req.valid.params.id, req.valid.body) } });
  });
  router.delete('/:id', byId, async (req, res) => {
    sendSuccess(res, { data: await service.remove(req.valid.params.id) });
  });
  router.post('/:id/pair', byId, validate(waPairStartSchema), async (req, res) => {
    sendSuccess(res, { data: await service.pair(req.valid.params.id, req.valid.body.phone) });
  });
  router.get('/:id/pair', byId, async (req, res) => {
    sendSuccess(res, { data: await service.pairStatus(req.valid.params.id) });
  });
  router.post('/:id/share', byId, async (req, res) => {
    sendSuccess(res, { data: await service.share(req.valid.params.id) });
  });
  router.get('/:id/analytics', byId, validate(adminWaSessionAnalyticsQuerySchema, 'query'), async (req, res) => {
    sendSuccess(res, { data: await service.analytics(req.valid.params.id, req.valid.query.period) });
  });
  router.post('/:id/analytics/reset', byId, async (req, res) => {
    sendSuccess(res, { data: await service.resetAnalytics(req.valid.params.id) });
  });
  router.get('/:id/groups', byId, async (req, res) => {
    sendSuccess(res, { data: { groups: await service.groups(req.valid.params.id) } });
  });
  return router;
}

/**
 * Mount /api/v1/wa-pair (Phase 25): the public share page someone scans from, no
 * login. The unguessable token (sha256-stored, SHARE_TTL_SEC) is the only credential;
 * IP rate-limited so tokens can't be brute-forced.
 * @param {{ service: object, redis: import('ioredis').Redis }} deps
 * @returns {import('express').Router}
 */
function createWaPairPublicRouter({ service, redis }) {
  const router = express.Router();
  router.use(async (req, _res, next) => {
    const hits = await fixedWindowIncr(redis, redisKey('rl', 'wa-pair', req.ip), WA_SESSIONS.PAIR_PUBLIC_RATE_WINDOW_SEC);
    if (hits > WA_SESSIONS.PAIR_PUBLIC_RATE_MAX) throw AppError.fromCode(ERROR_CODES.RATE_LIMITED);
    next();
  });
  const byToken = validate(waPairTokenParamSchema, 'params');

  router.get('/:token', byToken, async (req, res) => {
    sendSuccess(res, { data: await service.publicStatus(req.valid.params.token) });
  });
  router.post('/:token', byToken, validate(waPairStartSchema), async (req, res) => {
    sendSuccess(res, { data: await service.publicPair(req.valid.params.token, req.valid.body.phone) });
  });
  return router;
}

module.exports = { createAdminWaSessionsRouter, createWaPairPublicRouter };
