'use strict';

const express = require('express');
const { userIdParamSchema } = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Authed public-user routes: /api/v1/users. Read-only poster profile (T3-2) — the
 * screen a user opens by tapping another driver (e.g. from a chat header). Phone and
 * PII are never projected (§3.10); soft-deleted users 404.
 *
 * @param {object} deps
 * @param {ReturnType<import('./users.service').createUsersService>} deps.service
 * @param {import('express').RequestHandler} deps.requireAuth
 * @returns {import('express').Router}
 */
function createUsersRouter({ service, requireAuth }) {
  const router = express.Router();
  router.use(requireAuth);

  // GET /api/v1/users/:id/profile — public poster profile.
  router.get('/:id/profile', validate(userIdParamSchema, 'params'), async (req, res) => {
    const data = await service.getPublicProfile(req.valid.params.id);
    sendSuccess(res, { data });
  });

  return router;
}

module.exports = { createUsersRouter };
