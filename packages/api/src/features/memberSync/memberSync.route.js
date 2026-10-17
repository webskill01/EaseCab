'use strict';

const crypto = require('node:crypto');
const express = require('express');
const {
  AppError, ERROR_CODES, HTTP_STATUS, MEMBER_SYNC, redisKey,
  membershipsQuerySchema, memberPaymentsQuerySchema,
} = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');
const { fixedWindowIncr } = require('../../lib/rateLimit');

/** Constant-time token check (both sides hashed so lengths never leak). */
function tokenMatches(given, expected) {
  const a = crypto.createHash('sha256').update(String(given || '')).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * Read-only member-sync API for the WhatsApp manager bots, mounted at
 * /api/v1/member-sync only when MEMBER_SYNC_TOKEN is set. Auth: x-token. An IP with
 * AUTH_MAX_FAILURES bad tokens in the window gets 429, checked BEFORE the token so a
 * blocked guesser can't land a hit (CLAUDE.md §6). Separate token from the fleet API
 * on purpose: that one can write block lists, this one can only read.
 *
 * @param {object} deps
 * @param {ReturnType<import('./memberSync.service').createMemberSyncService>} deps.service
 * @param {string} deps.token
 * @param {import('ioredis').Redis} deps.redis
 * @param {{ warn: Function }} deps.logger
 * @returns {import('express').Router}
 */
function createMemberSyncRouter({ service, token, redis, logger }) {
  const router = express.Router();

  router.use(async (req, _res, next) => {
    const failKey = redisKey('member-sync', 'auth-fail', req.ip);
    if (Number(await redis.get(failKey)) >= MEMBER_SYNC.AUTH_MAX_FAILURES) {
      throw AppError.fromCode(ERROR_CODES.RATE_LIMITED);
    }
    if (!tokenMatches(req.headers['x-token'], token)) {
      await fixedWindowIncr(redis, failKey, MEMBER_SYNC.AUTH_WINDOW_SEC);
      logger.warn('member sync: rejected token');
      throw new AppError(ERROR_CODES.AUTH_REQUIRED, 'Invalid or missing token', HTTP_STATUS.UNAUTHORIZED);
    }
    next();
  });

  router.get('/memberships', validate(membershipsQuerySchema, 'query'), async (req, res) => {
    const { now, members, truncated } = await service.listMemberships(req.valid.query);
    sendSuccess(res, { data: { now, members }, meta: { total: members.length, truncated } });
  });

  router.get('/payments', validate(memberPaymentsQuerySchema, 'query'), async (req, res) => {
    const { payments, truncated } = await service.listPayments(req.valid.query);
    sendSuccess(res, { data: { payments }, meta: { total: payments.length, truncated } });
  });

  return router;
}

module.exports = { createMemberSyncRouter };
