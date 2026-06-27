'use strict';

const express = require('express');
const {
  adminUnresolvedRidesQuerySchema, adminUnresolvedRideActionSchema,
  adminUnresolvedRideIdParamSchema, citySearchQuerySchema,
} = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Mount /api/v1/admin/unresolved-rides. Gated by requireAdmin (admin JWT cookie →
 * req.admin; never reads the users table for auth — §6). Offset pagination (§8).
 * The /cities sub-route reuses the existing typeahead so the admin can pick a city
 * to fill a missing pickup/drop endpoint behind the admin gate.
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminUnresolvedRides.service').createAdminUnresolvedRidesService>} deps.service
 * @param {ReturnType<import('../cities/cities.service').createCitiesService>} deps.citiesService
 * @param {import('express').RequestHandler} deps.requireAdmin
 * @returns {import('express').Router}
 */
function createAdminUnresolvedRidesRouter({ service, citiesService, requireAdmin }) {
  const router = express.Router();
  router.use(requireAdmin);

  // City typeahead for the resolution picker (admin-gated reuse of citiesService).
  router.get('/cities', validate(citySearchQuerySchema, 'query'), async (req, res) => {
    const data = await citiesService.searchCities(req.valid.query);
    sendSuccess(res, { data });
  });

  // Live rides missing a pickup/drop city.
  router.get('/', validate(adminUnresolvedRidesQuerySchema, 'query'), async (req, res) => {
    const { items, page, limit, total } = await service.list(req.valid.query);
    sendSuccess(res, { data: { rides: items }, meta: { page, limit, total } });
  });

  // Set a missing city (side + cityId) or hide the ride.
  router.patch(
    '/:id',
    validate(adminUnresolvedRideIdParamSchema, 'params'),
    validate(adminUnresolvedRideActionSchema),
    async (req, res) => {
      const result = await service.act(req.valid.params.id, req.valid.body);
      sendSuccess(res, { data: result });
    },
  );

  return router;
}

module.exports = { createAdminUnresolvedRidesRouter };
