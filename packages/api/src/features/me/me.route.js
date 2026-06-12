'use strict';

const express = require('express');
const { contactedListQuerySchema, profileUpdateSchema, imageAttachSchema } = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Authed `/api/v1/me` routes: contacted-rides list (Step 19) + profile read/update
 * and verified-image attach (Step 21b).
 * @param {object} deps
 * @param {ReturnType<import('./me.service').createMeService>} deps.service
 * @param {import('express').RequestHandler} deps.requireAuth
 */
function createMeRouter({ service, requireAuth }) {
  const router = express.Router();
  router.use(requireAuth);

  // GET /api/v1/me/contacted — bot + posted contacts merged, cursor-paginated.
  router.get('/contacted', validate(contactedListQuerySchema, 'query'), async (req, res) => {
    const { contacts, nextCursor } = await service.listContacted({ userId: req.user.id, ...req.valid.query });
    sendSuccess(res, { data: { contacts }, meta: { nextCursor } });
  });

  // GET /api/v1/me/profile — full profile + verification snapshot for the profile screen.
  router.get('/profile', async (req, res) => {
    const data = await service.getProfile(req.user.id);
    sendSuccess(res, { data });
  });

  // PATCH /api/v1/me/profile — update editable fields (+ optional DP via verifyUpload).
  router.patch('/profile', validate(profileUpdateSchema), async (req, res) => {
    const data = await service.updateProfile(req.user.id, req.valid.body);
    sendSuccess(res, { data });
  });

  // POST /api/v1/me/uploads — attach a verified upload key to its purpose's User field.
  router.post('/uploads', validate(imageAttachSchema), async (req, res) => {
    const data = await service.attachImage(req.user.id, req.valid.body);
    sendSuccess(res, { data });
  });

  return router;
}

module.exports = { createMeRouter };
