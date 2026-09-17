'use strict';

const express = require('express');
const {
  adminBotFiltersQuerySchema, adminBotFilterCreateSchema, adminBotFilterIdParamSchema, HTTP_STATUS,
} = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Mount /api/v1/admin/bot-filters (Phase 17.4). Gated by requireAdmin. CRUD over
 * bot_filter_entries; the service notifies easecab-bot after every write.
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminBotFilters.service').createAdminBotFiltersService>} deps.service
 * @param {import('express').RequestHandler} deps.requireAdmin
 * @returns {import('express').Router}
 */
function createAdminBotFiltersRouter({ service, requireAdmin }) {
  const router = express.Router();
  router.use(requireAdmin);

  router.get('/', validate(adminBotFiltersQuerySchema, 'query'), async (req, res) => {
    const { items, page, limit, total } = await service.list(req.valid.query);
    sendSuccess(res, { data: { entries: items }, meta: { page, limit, total } });
  });

  router.post('/', validate(adminBotFilterCreateSchema), async (req, res) => {
    const data = await service.add(req.valid.body);
    sendSuccess(res, { data, status: HTTP_STATUS.CREATED });
  });

  router.delete('/:id', validate(adminBotFilterIdParamSchema, 'params'), async (req, res) => {
    const data = await service.remove(req.valid.params.id);
    sendSuccess(res, { data });
  });

  return router;
}

module.exports = { createAdminBotFiltersRouter };
