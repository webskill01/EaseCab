'use strict';

const express = require('express');
const {
  adminReportsQuerySchema,
  adminReportActionSchema,
  adminReportIdParamSchema,
} = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Mount /api/v1/admin/reports (Step 24c). Every route is gated by requireAdmin
 * (admin JWT cookie → req.admin; never reads the users table — §6). Offset pagination
 * is acceptable for admin (§8).
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminReports.service').createAdminReportsService>} deps.service
 * @param {import('express').RequestHandler} deps.requireAdmin
 * @returns {import('express').Router}
 */
function createAdminReportsRouter({ service, requireAdmin }) {
  const router = express.Router();
  router.use(requireAdmin);

  // Open/resolved reports queue.
  router.get('/', validate(adminReportsQuerySchema, 'query'), async (req, res) => {
    const { items, page, limit, total } = await service.list(req.valid.query);
    sendSuccess(res, { data: { reports: items }, meta: { page, limit, total } });
  });

  // Dismiss or remove (cascade-resolves all open reports on the same target).
  router.patch(
    '/:id',
    validate(adminReportIdParamSchema, 'params'),
    validate(adminReportActionSchema),
    async (req, res) => {
      const result = await service.review(req.valid.params.id, req.valid.body, req.admin.id);
      sendSuccess(res, { data: { report: result } });
    },
  );

  return router;
}

module.exports = { createAdminReportsRouter };
