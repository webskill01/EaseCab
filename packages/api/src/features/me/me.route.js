'use strict';

const express = require('express');
const { contactedListQuerySchema, profileUpdateSchema, imageAttachSchema } = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');
const { clearAuthCookies } = require('../../http/cookies');

/**
 * Authed `/api/v1/me` routes: contacted-rides list (Step 19) + profile read/update
 * and verified-image attach (Step 21b).
 * @param {object} deps
 * @param {ReturnType<import('./me.service').createMeService>} deps.service
 * @param {import('express').RequestHandler} deps.requireAuth
 * @param {boolean} deps.cookieSecure - mirrors config.cookie.secure so the delete
 *   flow clears the auth cookies with the same attributes they were set with.
 */
function createMeRouter({ service, requireAuth, cookieSecure }) {
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

  // DELETE /api/v1/me/account — soft-delete the caller (§7) and log them out by
  // clearing the auth cookies. Restorable by logging back in within 30 days.
  router.delete('/account', async (req, res) => {
    const data = await service.deleteAccount(req.user.id);
    clearAuthCookies(res, { secure: cookieSecure });
    sendSuccess(res, { data });
  });

  return router;
}

module.exports = { createMeRouter };
