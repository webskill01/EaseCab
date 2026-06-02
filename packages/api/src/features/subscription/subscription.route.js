'use strict';

const express = require('express');
const { verifyPaymentSchema } = require('@easecab/shared');
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

  // Create / reuse the ₹149 order for the Razorpay checkout popup.
  router.post('/checkout', requireAuth, async (req, res) => {
    const data = await service.createCheckout(req.user.id);
    sendSuccess(res, { data });
  });

  // Client callback after the popup succeeds — instant credit.
  router.post('/verify', requireAuth, validate(verifyPaymentSchema), async (req, res) => {
    const data = await service.verifyPayment(req.valid.body);
    sendSuccess(res, { data });
  });

  // Membership status for the profile UI.
  router.get('/me', requireAuth, async (req, res) => {
    const data = await service.getStatus(req.user.id);
    sendSuccess(res, { data });
  });

  return router;
}

/**
 * The webhook handler — mounted in app.js with express.raw() BEFORE the global JSON
 * parser, because HMAC verification needs the exact bytes Razorpay signed. Always
 * answers 2xx on a verified event (incl. ignored/duplicate) so Razorpay stops
 * retrying; a bad signature throws → 422 via the global error handler.
 *
 * @param {object} deps
 * @param {ReturnType<import('./subscription.service').createSubscriptionService>} deps.service
 * @returns {import('express').RequestHandler}
 */
function createWebhookHandler({ service }) {
  return async function webhookHandler(req, res) {
    const signature = req.headers['x-razorpay-signature'];
    const data = await service.handleWebhook({ rawBody: req.body, signature });
    sendSuccess(res, { data });
  };
}

module.exports = { createSubscriptionRouter, createWebhookHandler };
