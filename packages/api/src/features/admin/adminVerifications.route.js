'use strict';

const express = require('express');
const {
  adminVerificationsQuerySchema,
  adminReviewActionSchema,
  adminBadgeSchema,
  adminSubmissionIdParamSchema,
  adminUserIdParamSchema,
} = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Mount /api/v1/admin/verifications (Step 24b). Every route is gated by requireAdmin
 * (admin JWT cookie → req.admin; never reads the users table — §6). Offset pagination
 * is acceptable for admin (§8). `/badge/:userId` is declared before `/:id` so the
 * two-segment path wins cleanly.
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminVerifications.service').createAdminVerificationsService>} deps.service
 * @param {import('express').RequestHandler} deps.requireAdmin
 * @returns {import('express').Router}
 */
function createAdminVerificationsRouter({ service, requireAdmin }) {
  const router = express.Router();
  router.use(requireAdmin);

  // Submitted DL/RC queue with presigned image URLs.
  router.get('/', validate(adminVerificationsQuerySchema, 'query'), async (req, res) => {
    const { items, page, limit, total } = await service.list(req.valid.query);
    sendSuccess(res, { data: { verifications: items }, meta: { page, limit, total } });
  });

  // Manual verified-driver badge toggle (User.verificationStatus).
  router.patch(
    '/badge/:userId',
    validate(adminUserIdParamSchema, 'params'),
    validate(adminBadgeSchema),
    async (req, res) => {
      await service.setBadge(req.valid.params.userId, req.valid.body);
      sendSuccess(res, { data: { updated: true } });
    },
  );

  // Per-document approve/reject.
  router.patch(
    '/:id',
    validate(adminSubmissionIdParamSchema, 'params'),
    validate(adminReviewActionSchema),
    async (req, res) => {
      const updated = await service.review(req.valid.params.id, req.valid.body, req.admin.id);
      sendSuccess(res, { data: { verification: { id: updated.id, status: updated.status, reviewedAt: updated.reviewedAt } } });
    },
  );

  return router;
}

module.exports = { createAdminVerificationsRouter };
