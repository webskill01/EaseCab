'use strict';

const express = require('express');
const {
  adminFounderPaymentsQuerySchema, adminFounderPaymentIdParamSchema, adminFounderPaymentLinkSchema,
} = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Mount /api/v1/admin/founder-payments. Gated by requireAdmin.
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminFounderPayments.service').createAdminFounderPaymentsService>} deps.service
 * @param {import('express').RequestHandler} deps.requireAdmin
 * @returns {import('express').Router}
 */
function createAdminFounderPaymentsRouter({ service, requireAdmin }) {
  const router = express.Router();
  router.use(requireAdmin);

  router.get('/', validate(adminFounderPaymentsQuerySchema, 'query'), async (req, res) => {
    const { items, page, limit, total, unlinked } = await service.list(req.valid.query);
    sendSuccess(res, { data: { payments: items, unlinked }, meta: { page, limit, total } });
  });

  router.post(
    '/:paymentId/link',
    validate(adminFounderPaymentIdParamSchema, 'params'),
    validate(adminFounderPaymentLinkSchema),
    async (req, res) => {
      sendSuccess(res, { data: await service.link(req.valid.params.paymentId, req.valid.body) });
    },
  );

  return router;
}

module.exports = { createAdminFounderPaymentsRouter };
