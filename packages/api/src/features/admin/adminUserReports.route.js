'use strict';

const express = require('express');
const {
  adminUserReportsQuerySchema,
  adminUserReportActionSchema,
  adminUserReportUserIdParamSchema,
} = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Mount /api/v1/admin/user-reports (P13-13 #5). Every route is gated by requireAdmin
 * (admin JWT cookie → req.admin; never reads the users table — §6). Offset pagination
 * is acceptable for admin (§8).
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminUserReports.service').createAdminUserReportsService>} deps.service
 * @param {import('express').RequestHandler} deps.requireAdmin
 * @returns {import('express').Router}
 */
function createAdminUserReportsRouter({ service, requireAdmin }) {
  const router = express.Router();
  router.use(requireAdmin);

  // Reported/flagged users with their open reports.
  router.get('/', validate(adminUserReportsQuerySchema, 'query'), async (req, res) => {
    const { items, page, limit, total } = await service.list(req.valid.query);
    sendSuccess(res, { data: { users: items }, meta: { page, limit, total } });
  });

  // Reinstate (clear flaggedAt) or uphold; resolves all the user's open reports.
  router.patch(
    '/:userId',
    validate(adminUserReportUserIdParamSchema, 'params'),
    validate(adminUserReportActionSchema),
    async (req, res) => {
      const result = await service.review(req.valid.params.userId, req.valid.body, req.admin.id);
      sendSuccess(res, { data: { review: result } });
    },
  );

  return router;
}

module.exports = { createAdminUserReportsRouter };
