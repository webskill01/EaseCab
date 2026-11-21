'use strict';

const express = require('express');
const {
  HTTP_STATUS, AppError, ERROR_CODES, FUEL, redisKey,
  fuelNearbyQuerySchema, fuelRouteQuerySchema, fuelStationCreateSchema, fuelReportCreateSchema, fuelStationIdParamSchema,
} = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');
const { fixedWindowIncr } = require('../../lib/rateLimit');

/** Per-user fixed-window cap (CLAUDE.md §6 — Redis rate limits on public endpoints). */
function perUserLimit(redis, name, max, windowSec) {
  return async (req, _res, next) => {
    const n = await fixedWindowIncr(redis, redisKey('rl', 'fuel', name, req.user.id), windowSec);
    if (n > max) {
      next(AppError.fromCode(ERROR_CODES.RATE_LIMITED));
      return;
    }
    next();
  };
}

/**
 * Fuel station finder (Phase 30), all authed:
 *   GET  /api/v1/fuel/stations?lat&lng&fuel&radiusKm — nearest stations
 *   GET  /api/v1/fuel/route?(fromCityId|fromLat&fromLng)&toCityId&fuel — pumps along the road
 *   POST /api/v1/fuel/stations                       — add a missing station (pending)
 *   POST /api/v1/fuel/stations/:id/reports           — CNG yes / CNG no / closed
 *
 * @param {{ service: ReturnType<import('./fuel.service').createFuelService>, requireAuth: import('express').RequestHandler, redis: import('ioredis').Redis }} deps
 * @returns {import('express').Router}
 */
function createFuelRouter({ service, requireAuth, redis }) {
  const router = express.Router();
  router.use(requireAuth);

  router.get('/stations', validate(fuelNearbyQuerySchema, 'query'), async (req, res) => {
    sendSuccess(res, { data: { stations: await service.nearby(req.valid.query) } });
  });

  router.get(
    '/route',
    validate(fuelRouteQuerySchema, 'query'),
    perUserLimit(redis, 'route', FUEL.ROUTES_PER_HOUR, FUEL.RATE_WINDOW_HOUR_SEC),
    async (req, res) => {
      sendSuccess(res, { data: await service.alongRoute(req.valid.query) });
    },
  );

  router.post(
    '/stations',
    validate(fuelStationCreateSchema),
    perUserLimit(redis, 'add', FUEL.ADDS_PER_DAY, FUEL.RATE_WINDOW_DAY_SEC),
    async (req, res) => {
      const station = await service.addStation(req.user.id, req.valid.body);
      sendSuccess(res, { data: { station }, status: HTTP_STATUS.CREATED });
    },
  );

  router.post(
    '/stations/:id/reports',
    validate(fuelStationIdParamSchema, 'params'),
    validate(fuelReportCreateSchema),
    perUserLimit(redis, 'report', FUEL.REPORTS_PER_HOUR, FUEL.RATE_WINDOW_HOUR_SEC),
    async (req, res) => {
      const data = await service.report(req.user.id, req.valid.params.id, req.valid.body.kind);
      sendSuccess(res, { data, status: HTTP_STATUS.CREATED });
    },
  );

  return router;
}

module.exports = { createFuelRouter };
