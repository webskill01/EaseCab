'use strict';

const express = require('express');
const { citySearchQuerySchema, citiesNearestQuerySchema } = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Authed city typeahead: GET /api/v1/cities?q=&limit= . Powers the post-a-ride
 * form and the Step-18 feed filter bar. Read-only; the whole app is members-only,
 * so it sits behind requireAuth like the rest of /api/v1.
 *
 * @param {object} deps
 * @param {ReturnType<import('./cities.service').createCitiesService>} deps.service
 * @param {import('express').RequestHandler} deps.requireAuth
 * @returns {import('express').Router}
 */
function createCitiesRouter({ service, requireAuth }) {
  const router = express.Router();
  // GET /api/v1/cities/nearest?lat=&lng= — geo → suggested alert city (Step 23).
  router.get('/nearest', requireAuth, validate(citiesNearestQuerySchema, 'query'), async (req, res) => {
    const data = await service.nearestCity(req.valid.query);
    sendSuccess(res, { data });
  });
  router.get('/', requireAuth, validate(citySearchQuerySchema, 'query'), async (req, res) => {
    const data = await service.searchCities(req.valid.query);
    sendSuccess(res, { data });
  });
  return router;
}

module.exports = { createCitiesRouter };
