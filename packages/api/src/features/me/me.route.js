'use strict';

const express = require('express');
const { contactedListQuerySchema } = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Authed `/api/v1/me` routes. Today: the caller's contacted-rides list (Step 19).
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

  return router;
}

module.exports = { createMeRouter };
