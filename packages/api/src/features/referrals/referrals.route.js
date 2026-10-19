'use strict';

const express = require('express');
const { referralClaimSchema } = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Authed referral routes (Phase 22):
 *   GET  /api/v1/referrals       — Refer & Earn overview
 *   POST /api/v1/referrals/claim — name your referrer by mobile number
 *
 * @param {object} deps
 * @param {ReturnType<import('./referrals.service').createReferralsService>} deps.service
 * @param {import('express').RequestHandler} deps.requireAuth
 */
function createReferralsRouter({ service, requireAuth }) {
  const router = express.Router();
  router.use(requireAuth);

  router.get('/', async (req, res) => {
    sendSuccess(res, { data: await service.overview(req.user.id) });
  });

  router.post('/claim', validate(referralClaimSchema), async (req, res) => {
    sendSuccess(res, { data: await service.claim(req.user.id, req.valid.body) });
  });

  return router;
}

module.exports = { createReferralsRouter };
