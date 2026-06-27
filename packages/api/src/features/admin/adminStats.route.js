'use strict';

const express = require('express');
const { sendSuccess } = require('../../http/respond');

/**
 * Mount /api/v1/admin/stats (Step 24a — dashboard). Single read endpoint, gated by
 * requireAdmin (admin JWT cookie → req.admin; never reads the users table — §6).
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminStats.service').createAdminStatsService>} deps.service
 * @param {import('express').RequestHandler} deps.requireAdmin
 * @returns {import('express').Router}
 */
function createAdminStatsRouter({ service, requireAdmin }) {
  const router = express.Router();
  router.use(requireAdmin);

  router.get('/', async (_req, res) => {
    const stats = await service.get();
    sendSuccess(res, { data: { stats } });
  });

  return router;
}

module.exports = { createAdminStatsRouter };
