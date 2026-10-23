'use strict';

const express = require('express');
const { adminComplimentaryCreateSchema, adminComplimentaryUserParamSchema, HTTP_STATUS } = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Mount /api/v1/admin/complimentary (free members). Gated by requireAdmin.
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminComplimentary.service').createAdminComplimentaryService>} deps.service
 * @param {import('express').RequestHandler} deps.requireAdmin
 * @returns {import('express').Router}
 */
function createAdminComplimentaryRouter({ service, requireAdmin }) {
  const router = express.Router();
  router.use(requireAdmin);

  router.get('/', async (_req, res) => {
    sendSuccess(res, { data: { members: await service.list() } });
  });

  router.post('/', validate(adminComplimentaryCreateSchema), async (req, res) => {
    sendSuccess(res, { data: await service.add(req.valid.body, req.admin.id), status: HTTP_STATUS.CREATED });
  });

  router.delete('/:userId', validate(adminComplimentaryUserParamSchema, 'params'), async (req, res) => {
    await service.remove(req.valid.params.userId);
    sendSuccess(res, { data: { removed: true } });
  });

  return router;
}

module.exports = { createAdminComplimentaryRouter };
