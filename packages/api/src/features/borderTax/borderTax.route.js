'use strict';

const express = require('express');
const {
  HTTP_STATUS, borderTaxCreateSchema, borderTaxCaptchaSchema, borderTaxFareSchema, borderTaxEventSchema, borderTaxIdParamSchema, borderTaxListQuerySchema,
} = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Authed border-tax routes (Phase 26, members only). The worker drives the portal; the app
 * polls GET /:id for the live step, a captcha (only when OCR missed) and finally the bank hand-off.
 *   POST /api/v1/border-tax              — new filing (queued)
 *   GET  /api/v1/border-tax              — caller's filings, cursor-paginated
 *   GET  /api/v1/border-tax/states       — { live } states open for new filings (admin can pause one)
 *   GET  /api/v1/border-tax/:id          — one filing + live { step, captcha, deadline, handoff }
 *   POST /api/v1/border-tax/:id/captcha  — driver's captcha answer
 *   POST /api/v1/border-tax/:id/captcha/refresh — driver wants a new captcha image
 *   POST /api/v1/border-tax/:id/fare     — { confirm } the real amount before Pay Online (lock)
 *   POST /api/v1/border-tax/:id/event    — { type } QR-screen step (qr_shown, pay_tapped, left_app, returned)
 *   POST /api/v1/border-tax/:id/cancel   — cancel while filling
 *   POST /api/v1/border-tax/:id/unlock   — clear the vehicle's pending-payment lock (vehicle_pending failures)
 *   GET  /api/v1/border-tax/:id/receipt  — { url } presigned link to the receipt PDF (in-app QR filings)
 *
 * @param {object} deps
 * @param {ReturnType<import('./borderTax.service').createBorderTaxService>} deps.service
 * @param {import('express').RequestHandler} deps.requireAuth
 * @returns {import('express').Router}
 */
function createBorderTaxRouter({ service, requireAuth }) {
  const router = express.Router();
  router.use(requireAuth);
  const idParam = validate(borderTaxIdParamSchema, 'params');

  router.post('/', validate(borderTaxCreateSchema), async (req, res) => {
    const filing = await service.create(req.user.id, req.valid.body);
    sendSuccess(res, { data: { filing }, status: HTTP_STATUS.CREATED });
  });

  router.get('/', validate(borderTaxListQuerySchema, 'query'), async (req, res) => {
    const { filings, nextCursor } = await service.list(req.user.id, req.valid.query);
    sendSuccess(res, { data: { filings }, meta: { nextCursor } });
  });

  router.get('/states', async (req, res) => {
    sendSuccess(res, { data: { live: await service.liveStates(), down: await service.downSites() } });
  });

  router.get('/:id', idParam, async (req, res) => {
    sendSuccess(res, { data: { filing: await service.get(req.user.id, req.valid.params.id) } });
  });

  router.post('/:id/captcha', idParam, validate(borderTaxCaptchaSchema), async (req, res) => {
    await service.answerCaptcha(req.user.id, req.valid.params.id, req.valid.body.answer);
    sendSuccess(res, { data: { id: req.valid.params.id } });
  });

  router.post('/:id/captcha/refresh', idParam, async (req, res) => {
    await service.refreshCaptcha(req.user.id, req.valid.params.id);
    sendSuccess(res, { data: { id: req.valid.params.id } });
  });

  router.post('/:id/fare', idParam, validate(borderTaxFareSchema), async (req, res) => {
    await service.answerFare(req.user.id, req.valid.params.id, req.valid.body.confirm);
    sendSuccess(res, { data: { id: req.valid.params.id } });
  });

  router.post('/:id/event', idParam, validate(borderTaxEventSchema), async (req, res) => {
    await service.payEvent(req.user.id, req.valid.params.id, req.valid.body.type);
    sendSuccess(res, { data: { id: req.valid.params.id } });
  });

  router.get('/:id/receipt', idParam, async (req, res) => {
    sendSuccess(res, { data: await service.receipt(req.user.id, req.valid.params.id) });
  });

  router.post('/:id/unlock', idParam, async (req, res) => {
    sendSuccess(res, { data: { unlock: await service.requestUnlock(req.user.id, req.valid.params.id) } });
  });

  router.post('/:id/cancel', idParam, async (req, res) => {
    await service.cancel(req.user.id, req.valid.params.id);
    sendSuccess(res, { data: { id: req.valid.params.id } });
  });

  return router;
}

module.exports = { createBorderTaxRouter };
