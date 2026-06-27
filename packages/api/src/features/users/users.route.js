'use strict';

const express = require('express');
const { userIdParamSchema, userReportCreateSchema, HTTP_STATUS } = require('@easecab/shared');
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

  // POST /api/v1/users/:id/report — flag a user (P13-12 #5). Dedup + daily cap +
  // ≥threshold distinct reporters auto-hides their posts pending admin review.
  router.post('/:id/report', validate(userIdParamSchema, 'params'), validate(userReportCreateSchema), async (req, res) => {
    const data = await service.reportUser({
      reporterId: req.user.id,
      reportedUserId: req.valid.params.id,
      ...req.valid.body,
    });
    sendSuccess(res, { data, status: HTTP_STATUS.CREATED });
  });

  return router;
}

module.exports = { createUsersRouter };
