'use strict';

const express = require('express');
const { adminReferralsQuerySchema } = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Mount /api/v1/admin/referrals (read-only). Gated by requireAdmin.
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminReferrals.service').createAdminReferralsService>} deps.service
 * @param {import('express').RequestHandler} deps.requireAdmin
 * @returns {import('express').Router}
 */
function createAdminReferralsRouter({ service, requireAdmin }) {
  const router = express.Router();
  router.use(requireAdmin);

  router.get('/', validate(adminReferralsQuerySchema, 'query'), async (req, res) => {
    const { items, page, limit, total, summary, rollout } = await service.list(req.valid.query);
    sendSuccess(res, { data: { referrals: items, summary, rollout }, meta: { page, limit, total } });
  });

  return router;
}

module.exports = { createAdminReferralsRouter };
