'use strict';

const crypto = require('node:crypto');
const express = require('express');
const { z } = require('zod');
const { FLEET_FIELDS, FLEET_SYNC_AUTH, HTTP_STATUS, redisKey } = require('@easecab/shared');
const { fixedWindowIncr } = require('../../lib/rateLimit');

// The fleet panel protocol (control-panel/server.js), byte-for-byte in shape.
// DELIBERATE EXCEPTION to the { success, data, error, meta } envelope (CLAUDE.md
// §3.4): fleet panels check `reply.ok === true`, `body.counts` and `bots[].id`, so
// this router must answer in their shape or mirroring silently reports failure.
const BOT_ID = 'easecab';
const MAX_INPUT = 5000;

const numberBody = z.object({ input: z.string().max(MAX_INPUT).default('') });
const ignoreBody = z.object({ phrase: z.string().max(MAX_INPUT).default('') });
const removeBody = z.object({ field: z.enum(Object.keys(FLEET_FIELDS)), value: z.string().min(1).max(MAX_INPUT) });

/** Constant-time token check (both sides hashed so lengths never leak). */
function tokenMatches(given, expected) {
  const a = crypto.createHash('sha256').update(String(given || '')).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * Mount the fleet peer API at /api/v1/fleet (Phase 17.5), so a fleet control panel
 * can list EaseCab in its peers.json as `https://api.easecab.com/api/v1/fleet`.
 * Writes arriving here are applied with `{ mirror: false }` — the sending panel
 * already replays to its own peers. Auth: x-token === FLEET_SYNC_TOKEN (admin role).
 * Rate limit (CLAUDE.md §6): an IP with FLEET_SYNC_AUTH.MAX_FAILURES bad tokens in the window gets 429,
 * checked BEFORE the token so a blocked guesser can't land a hit.
 *
 * @param {object} deps
 * @param {ReturnType<import('../admin/adminBotFilters.service').createAdminBotFiltersService>} deps.service
 * @param {ReturnType<import('../admin/adminBotFilters.repository').createAdminBotFiltersRepository>} deps.repo
 * @param {string} deps.token
 * @param {import('ioredis').Redis} deps.redis
 * @param {{ error: Function }} deps.logger
 * @returns {import('express').Router}
 */
function createFleetSyncRouter({ service, repo, token, redis, logger }) {
  const router = express.Router();

  router.use(async (req, res, next) => {
    try {
      const failKey = redisKey('fleet', 'auth-fail', req.ip);
      if (Number(await redis.get(failKey)) >= FLEET_SYNC_AUTH.MAX_FAILURES) {
        return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({ error: 'Too many failed attempts' });
      }
      if (!tokenMatches(req.headers['x-token'], token)) {
        await fixedWindowIncr(redis, failKey, FLEET_SYNC_AUTH.WINDOW_SEC);
        logger.warn({ ip: req.ip }, 'fleet sync: rejected token');
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Invalid or missing token' });
      }
      return next();
    } catch (err) {
      logger.error({ err: err.message }, 'fleet sync auth check failed');
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal error' });
    }
  });

  // Wrap a handler: Zod-validate the body, answer fleet-shaped errors, never leak internals.
  const handle = (schema, fn) => async (req, res) => {
    const parsed = schema ? schema.safeParse(req.body || {}) : { success: true, data: undefined };
    if (!parsed.success) return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Invalid request' });
    try {
      return res.json(await fn(parsed.data));
    } catch (err) {
      if (err && err.code === 'VALIDATION_ERROR') {
        // Nothing parseable to add (fleet answers ok with nothing added); last required entry → refuse.
        if (err.statusCode === HTTP_STATUS.CONFLICT) return res.status(HTTP_STATUS.CONFLICT).json({ error: err.message });
        return res.json({ ok: true, added: [] });
      }
      logger.error({ err: err.message }, 'fleet sync request failed');
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Internal error' });
    }
  };

  router.get('/api/bots', (_req, res) => res.json({ bots: [{ id: BOT_ID }] }));

  router.get('/api/block/list', handle(null, async () => {
    const rows = await repo.listValues(Object.values(FLEET_FIELDS).map((f) => f.list));
    const data = Object.fromEntries(Object.entries(FLEET_FIELDS).map(([field, { list }]) => (
      [field, rows.filter((r) => r.list === list).map((r) => r.value)]
    )));
    const counts = Object.fromEntries(Object.entries(data).map(([field, values]) => [field, values.length]));
    return { counts, data };
  }));

  const add = (field, key) => async (body) => {
    const { added, duplicates } = await service.add({ list: FLEET_FIELDS[field].list, value: body[key] }, { mirror: false });
    return { ok: true, added, duplicates };
  };
  router.post('/api/block/number', handle(numberBody, add('blockedPhoneNumbers', 'input')));
  router.post('/api/block/sender', handle(numberBody, add('blockedSenders', 'input')));
  router.post('/api/block/ignore', handle(ignoreBody, add('ignoreIfContains', 'phrase')));

  router.post('/api/block/remove', handle(removeBody, async ({ field, value }) => {
    const { removed } = await service.removeByValue(FLEET_FIELDS[field].list, value, { mirror: false });
    return { ok: true, removed };
  }));

  return router;
}

module.exports = { createFleetSyncRouter };
