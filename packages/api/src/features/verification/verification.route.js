'use strict';

const express = require('express');
const { aadhaarOtpSchema, aadhaarVerifySchema, dlSchema, rcSchema } = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Authed verification routes: /api/v1/verification (all require the user cookie).
 * Aadhaar is two steps (otp → verify); DL and RC are single calls. The service
 * owns Surepass + the rate limit; the router only validates + shapes the response.
 *
 * @param {object} deps
 * @param {ReturnType<import('./verification.service').createVerificationService>} deps.service
 * @param {import('express').RequestHandler} deps.requireAuth
 * @returns {import('express').Router}
 */
function createVerificationRouter({ service, requireAuth }) {
  const router = express.Router();

  router.post('/aadhaar/otp', requireAuth, validate(aadhaarOtpSchema), async (req, res) => {
    const data = await service.startAadhaar(req.user.id, req.valid.body);
    sendSuccess(res, { data });
  });

  router.post('/aadhaar/verify', requireAuth, validate(aadhaarVerifySchema), async (req, res) => {
    const data = await service.verifyAadhaar(req.user.id, req.valid.body);
    sendSuccess(res, { data });
  });

  router.post('/dl', requireAuth, validate(dlSchema), async (req, res) => {
    const data = await service.verifyDl(req.user.id, req.valid.body);
    sendSuccess(res, { data });
  });

  router.post('/rc', requireAuth, validate(rcSchema), async (req, res) => {
    const data = await service.verifyRc(req.user.id, req.valid.body);
    sendSuccess(res, { data });
  });

  router.get('/me', requireAuth, async (req, res) => {
    const data = await service.getStatus(req.user.id);
    sendSuccess(res, { data });
  });

  return router;
}

module.exports = { createVerificationRouter };
