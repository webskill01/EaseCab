'use strict';

const express = require('express');
const {
  ridesListQuerySchema, postedRidesListQuerySchema, groupModeUpdateSchema, groupSummaryQuerySchema,
} = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Mount /api/v1/group-mode (Phase 31). Authed; the service enforces the paywall on
 * everything that carries phone numbers.
 * @param {{ service: ReturnType<import('./groupMode.service').createGroupModeService>, requireAuth: import('express').RequestHandler }} deps
 * @returns {import('express').Router}
 */
function createGroupModeRouter({ service, requireAuth }) {
  const router = express.Router();
  router.use(requireAuth);

  router.get('/settings', async (req, res) => {
    sendSuccess(res, { data: await service.getSettings(req.user.id) });
  });
  router.put('/settings', validate(groupModeUpdateSchema), async (req, res) => {
    sendSuccess(res, { data: await service.saveSettings(req.user.id, req.valid.body) });
  });
  router.get('/rides', validate(ridesListQuerySchema, 'query'), async (req, res) => {
    const { rides, nextCursor } = await service.listRides(req.user.id, req.valid.query);
    sendSuccess(res, { data: { rides }, meta: { nextCursor } });
  });
  router.get('/duties', validate(postedRidesListQuerySchema, 'query'), async (req, res) => {
    const { posts, nextCursor } = await service.listDuties(req.user.id, req.valid.query);
    sendSuccess(res, { data: { posts }, meta: { nextCursor } });
  });
  router.get('/summary', validate(groupSummaryQuerySchema, 'query'), async (req, res) => {
    sendSuccess(res, { data: { groups: await service.summary(req.user.id, req.valid.query.g) } });
  });
  return router;
}

module.exports = { createGroupModeRouter };
