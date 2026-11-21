'use strict';

const express = require('express');
const { adminFuelQuerySchema, adminFuelStationPatchSchema, fuelStationIdParamSchema } = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Mount /api/v1/admin/fuel (Phase 30). Gated by requireAdmin.
 *   GET   /?tab=pending|reports&page&limit
 *   PATCH /stations/:id  { status?, hasCng?, hasPetrol?, hasDiesel? }
 *
 * @param {{ service: ReturnType<import('./adminFuel.service').createAdminFuelService>, requireAdmin: import('express').RequestHandler }} deps
 * @returns {import('express').Router}
 */
function createAdminFuelRouter({ service, requireAdmin }) {
  const router = express.Router();
  router.use(requireAdmin);

  router.get('/', validate(adminFuelQuerySchema, 'query'), async (req, res) => {
    const { stations, counts, page, limit, total } = await service.list(req.valid.query);
    sendSuccess(res, { data: { stations, counts }, meta: { page, limit, total } });
  });

  router.patch('/stations/:id', validate(fuelStationIdParamSchema, 'params'), validate(adminFuelStationPatchSchema), async (req, res) => {
    sendSuccess(res, { data: { station: await service.decide(req.valid.params.id, req.valid.body) } });
  });

  return router;
}

module.exports = { createAdminFuelRouter };
