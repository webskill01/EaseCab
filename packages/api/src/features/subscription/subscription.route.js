'use strict';

const express = require('express');
const { verifyPaymentSchema, paymentsListQuerySchema } = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Authed subscription routes: /checkout, /verify, /me. The webhook is mounted
 * SEPARATELY (raw body, before global express.json) — see createWebhookHandler.
 *
 * @param {object} deps
 * @param {ReturnType<import('./subscription.service').createSubscriptionService>} deps.service
 * @param {import('express').RequestHandler} deps.requireAuth
 * @returns {import('express').Router}
 */
function createSubscriptionRouter({ service, requireAuth }) {
  const router = express.Router();

  // Create / reuse the ₹149 Cashfree order; returns the payment_session_id for checkout.
  router.post('/checkout', requireAuth, async (req, res) => {
    const data = await service.createCheckout(req.user.id);
    sendSuccess(res, { data });
  });

  // Client callback after checkout closes — server re-fetches the order, instant credit.
  router.post('/verify', requireAuth, validate(verifyPaymentSchema), async (req, res) => {
    const data = await service.verifyPayment({ userId: req.user.id, orderId: req.valid.body.orderId });
    sendSuccess(res, { data });
  });

  // Membership status for the profile UI.
  router.get('/me', requireAuth, async (req, res) => {
    const data = await service.getStatus(req.user.id);
    sendSuccess(res, { data });
  });

  // Captured-payment history for the membership screen (Step 21d) — cursor-paginated.
  router.get('/payments', requireAuth, validate(paymentsListQuerySchema, 'query'), async (req, res) => {
    const { payments, nextCursor } = await service.listPayments({ userId: req.user.id, ...req.valid.query });
    sendSuccess(res, { data: { payments }, meta: { nextCursor } });
  });

  return router;
}

/**
 * The webhook handler — mounted in app.js with express.raw() BEFORE the global JSON
 * parser, because HMAC verification needs the exact bytes Cashfree signed. Always
 * answers 2xx on a verified event (incl. ignored/duplicate) so Cashfree stops
 * retrying; a bad signature throws → 422 via the global error handler.
 *
 * @param {object} deps
 * @param {ReturnType<import('./subscription.service').createSubscriptionService>} deps.service
 * @returns {import('express').RequestHandler}
 */
function createWebhookHandler({ service }) {
  return async function webhookHandler(req, res) {
    const data = await service.handleWebhook({
      ip: req.ip,
      rawBody: req.body,
      timestamp: req.headers['x-webhook-timestamp'],
      signature: req.headers['x-webhook-signature'],
    });
    sendSuccess(res, { data });
  };
}

module.exports = { createSubscriptionRouter, createWebhookHandler };
