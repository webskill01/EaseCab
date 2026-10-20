'use strict';

const express = require('express');
const { z } = require('zod');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');
const { createSyncTokenGate } = require('../memberSync/memberSync.route');

// Empty `since` = every day since launch (the finance panel's first pull).
const dailyQuerySchema = z.object({
  since: z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
});

/**
 * Read-only daily earnings for the EaseCab Finance panel, mounted at
 * /api/v1/finance-sync only when FINANCE_SYNC_TOKEN is set. Auth: x-token, same
 * brute-force gate as member-sync. Reuses the admin stats daily series, so the panel
 * and the admin dashboard always agree.
 *
 * @param {object} deps
 * @param {ReturnType<import('../admin/adminStats.repository').createAdminStatsRepository>} deps.repo
 * @param {string} deps.token
 * @param {import('ioredis').Redis} deps.redis
 * @param {{ warn: Function }} deps.logger
 * @returns {import('express').Router}
 */
function createFinanceSyncRouter({ repo, token, redis, logger }) {
  const router = express.Router();
  router.use(createSyncTokenGate({ name: 'finance-sync', token, redis, logger }));

  router.get('/daily', validate(dailyQuerySchema, 'query'), async (req, res) => {
    const since = req.valid.query.since || '';
    // growthDaily days are IST calendar dates at UTC midnight, so the ISO date is the IST day.
    const data = (await repo.growthDaily())
      .map((r) => ({ ...r, day: r.day.toISOString().slice(0, 10) }))
      .filter((r) => r.day >= since);
    sendSuccess(res, { data, meta: { total: data.length } });
  });

  return router;
}

module.exports = { createFinanceSyncRouter };
