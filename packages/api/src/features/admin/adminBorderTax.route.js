'use strict';

const express = require('express');
const {
  adminBorderTaxQuerySchema, adminBorderTaxStateParamSchema, adminBorderTaxStateSchema, borderTaxIdParamSchema,
} = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Mount /api/v1/admin/border-tax (Phase 26.8). Gated by requireAdmin.
 *   GET   /                    — filings (offset) + byStatus totals
 *   GET   /states              — live states with their on/off switch
 *   PATCH /states/:stateCd     — { paused } switch a state off/on for new filings
 *   GET   /:id/receipt         — { url } presigned receipt PDF
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminBorderTax.service').createAdminBorderTaxService>} deps.service
 * @param {import('express').RequestHandler} deps.requireAdmin
 * @returns {import('express').Router}
 */
function createAdminBorderTaxRouter({ service, requireAdmin }) {
  const router = express.Router();
  router.use(requireAdmin);

  router.get('/', validate(adminBorderTaxQuerySchema, 'query'), async (req, res) => {
    const { items, total, byStatus, page, limit } = await service.list(req.valid.query);
    sendSuccess(res, { data: { filings: items, byStatus }, meta: { page, limit, total } });
  });

  router.get('/states', async (req, res) => {
    sendSuccess(res, { data: { states: await service.states() } });
  });

  router.patch('/states/:stateCd', validate(adminBorderTaxStateParamSchema, 'params'), validate(adminBorderTaxStateSchema), async (req, res) => {
    sendSuccess(res, { data: await service.setPaused(req.valid.params.stateCd, req.valid.body.paused) });
  });

  router.get('/:id/receipt', validate(borderTaxIdParamSchema, 'params'), async (req, res) => {
    sendSuccess(res, { data: await service.receipt(req.valid.params.id) });
  });

  return router;
}

module.exports = { createAdminBorderTaxRouter };
