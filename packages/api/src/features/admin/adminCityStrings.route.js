'use strict';

const express = require('express');
const {
  adminCityStringsQuerySchema, adminCityStringActionSchema, adminCityStringIdParamSchema,
  citySearchQuerySchema,
} = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Mount /api/v1/admin/city-strings (Step 24e). Gated by requireAdmin (admin JWT
 * cookie → req.admin; never reads the users table for auth — §6). Offset
 * pagination (§8). The /cities sub-route reuses the existing city typeahead so the
 * admin can pick a resolution target behind the admin gate.
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminCityStrings.service').createAdminCityStringsService>} deps.service
 * @param {ReturnType<import('../cities/cities.service').createCitiesService>} deps.citiesService
 * @param {import('express').RequestHandler} deps.requireAdmin
 * @returns {import('express').Router}
 */
function createAdminCityStringsRouter({ service, citiesService, requireAdmin }) {
  const router = express.Router();
  router.use(requireAdmin);

  // City typeahead for the resolution picker (admin-gated reuse of citiesService).
  router.get('/cities', validate(citySearchQuerySchema, 'query'), async (req, res) => {
    const data = await citiesService.searchCities(req.valid.query);
    sendSuccess(res, { data });
  });

  // Unreviewed city-string queue.
  router.get('/', validate(adminCityStringsQuerySchema, 'query'), async (req, res) => {
    const { items, page, limit, total } = await service.list(req.valid.query);
    sendSuccess(res, { data: { cityStrings: items }, meta: { page, limit, total } });
  });

  // Resolve (alias → city) or dismiss a string.
  router.patch(
    '/:id',
    validate(adminCityStringIdParamSchema, 'params'),
    validate(adminCityStringActionSchema),
    async (req, res) => {
      const result = await service.act(req.valid.params.id, req.valid.body);
      sendSuccess(res, { data: result });
    },
  );

  return router;
}

module.exports = { createAdminCityStringsRouter };
