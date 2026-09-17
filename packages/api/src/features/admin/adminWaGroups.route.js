'use strict';

const express = require('express');
const {
  adminWaGroupsQuerySchema, adminWaGroupToggleSchema, adminWaGroupBulkSchema, adminWaGroupIdParamSchema,
} = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Mount /api/v1/admin/wa-groups (Phase 18). Gated by requireAdmin. Lists the
 * groups easecab-bot has discovered and switches which ones it reads rides from.
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminWaGroups.service').createAdminWaGroupsService>} deps.service
 * @param {import('express').RequestHandler} deps.requireAdmin
 * @returns {import('express').Router}
 */
function createAdminWaGroupsRouter({ service, requireAdmin }) {
  const router = express.Router();
  router.use(requireAdmin);

  router.get('/', validate(adminWaGroupsQuerySchema, 'query'), async (req, res) => {
    const { items, page, limit, total, counts } = await service.list(req.valid.query);
    sendSuccess(res, { data: { groups: items, counts }, meta: { page, limit, total } });
  });

  // Declared before /:id so "bulk" is never read as an id.
  router.post('/bulk', validate(adminWaGroupBulkSchema), async (req, res) => {
    sendSuccess(res, { data: await service.bulk(req.valid.body) });
  });

  router.patch(
    '/:id',
    validate(adminWaGroupIdParamSchema, 'params'),
    validate(adminWaGroupToggleSchema),
    async (req, res) => {
      sendSuccess(res, { data: { group: await service.toggle(req.valid.params.id, req.valid.body.enabled) } });
    },
  );

  return router;
}

module.exports = { createAdminWaGroupsRouter };
