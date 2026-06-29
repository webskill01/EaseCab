'use strict';

const express = require('express');
const { HTTP_STATUS, postedRideCreateSchema, postedRideParseSchema, postedRidesListQuerySchema, postedRideIdParamSchema, reportCreateSchema } = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Authed posted-rides routes: /api/v1/posted-rides. Create is verification-gated,
 * contact is subscription-gated (both enforced in the service). Express 5 forwards
 * async rejections to the global error handler — no wrapper needed.
 *
 * @param {object} deps
 * @param {ReturnType<import('./postedRides.service').createPostedRidesService>} deps.service
 * @param {ReturnType<import('./postedRides.parse').createPostParser>} deps.parser
 * @param {import('express').RequestHandler} deps.requireAuth
 * @returns {import('express').Router}
 */
function createPostedRidesRouter({ service, parser, requireAuth }) {
  const router = express.Router();
  router.use(requireAuth);

  // POST /api/v1/posted-rides — create a 24h post (verification-gated).
  router.post('/', validate(postedRideCreateSchema), async (req, res) => {
    const data = await service.createPost(req.user.id, req.valid.body);
    sendSuccess(res, { data, status: HTTP_STATUS.CREATED });
  });

  // POST /api/v1/posted-rides/parse — read-only free-text → draft preview (Step 20).
  // Auth only; NOT verification-gated — the soft gate fires at create.
  router.post('/parse', validate(postedRideParseSchema), async (req, res) => {
    const data = await parser.parse(req.valid.body.text);
    sendSuccess(res, { data });
  });

  // GET /api/v1/posted-rides — public masked feed, cursor-paginated.
  router.get('/', validate(postedRidesListQuerySchema, 'query'), async (req, res) => {
    const { posts, nextCursor } = await service.listFeed(req.valid.query);
    sendSuccess(res, { data: { posts }, meta: { nextCursor } });
  });

  // GET /api/v1/posted-rides/mine — the caller's own posts. Literal path before params.
  router.get('/mine', async (req, res) => {
    const { posts } = await service.listMine(req.user.id);
    sendSuccess(res, { data: { posts } });
  });

  // POST /api/v1/posted-rides/:id/close — owner marks done.
  router.post('/:id/close', validate(postedRideIdParamSchema, 'params'), async (req, res) => {
    const data = await service.closePost({ userId: req.user.id, postedRideId: req.valid.params.id });
    sendSuccess(res, { data });
  });

  // DELETE /api/v1/posted-rides/:id — owner soft-deletes.
  router.delete('/:id', validate(postedRideIdParamSchema, 'params'), async (req, res) => {
    const data = await service.removePost({ userId: req.user.id, postedRideId: req.valid.params.id });
    sendSuccess(res, { data });
  });

  // POST /api/v1/posted-rides/:id/contact — subscription-gated phone reveal.
  router.post('/:id/contact', validate(postedRideIdParamSchema, 'params'), async (req, res) => {
    const data = await service.contactPost({ userId: req.user.id, postedRideId: req.valid.params.id });
    sendSuccess(res, { data });
  });

  // POST /api/v1/posted-rides/:id/contact/log — record the contact into the Contacted
  // tab, fired only when the user taps Call/WhatsApp (not on opening the reveal sheet).
  router.post('/:id/contact/log', validate(postedRideIdParamSchema, 'params'), async (req, res) => {
    const data = await service.logContactPost({ userId: req.user.id, postedRideId: req.valid.params.id });
    sendSuccess(res, { data });
  });

  // POST /api/v1/posted-rides/:id/report — file a report against a posted ride (admin queue, 24c).
  router.post('/:id/report', validate(postedRideIdParamSchema, 'params'), validate(reportCreateSchema), async (req, res) => {
    const data = await service.reportPost({ userId: req.user.id, postedRideId: req.valid.params.id, ...req.valid.body });
    sendSuccess(res, { data, status: HTTP_STATUS.CREATED });
  });

  return router;
}

module.exports = { createPostedRidesRouter };
