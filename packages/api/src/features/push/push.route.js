'use strict';

const express = require('express');
const {
  HTTP_STATUS,
  registerPushTokenSchema,
  unregisterPushTokenSchema,
  pushPreferencesSchema,
} = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Authed push routes: /api/v1/push. Token registration + per-user notification
 * preferences (city opt-in list + the two per-source toggles). The actual city-
 * targeted sending is driven server-side by the push dispatcher, not these routes.
 *
 * @param {object} deps
 * @param {ReturnType<import('./push.service').createPushService>} deps.service
 * @param {import('express').RequestHandler} deps.requireAuth
 * @returns {import('express').Router}
 */
function createPushRouter({ service, requireAuth }) {
  const router = express.Router();
  router.use(requireAuth);

  // POST /api/v1/push/subscriptions — register (upsert) an FCM device token.
  router.post('/subscriptions', validate(registerPushTokenSchema), async (req, res) => {
    const data = await service.registerToken(req.user.id, req.valid.body);
    sendSuccess(res, { data, status: HTTP_STATUS.CREATED });
  });

  // DELETE /api/v1/push/subscriptions — unregister a device token (logout / rotation).
  router.delete('/subscriptions', validate(unregisterPushTokenSchema), async (req, res) => {
    const data = await service.unregisterToken(req.user.id, req.valid.body);
    sendSuccess(res, { data });
  });

  // GET /api/v1/push/preferences — read the caller's notification preferences.
  router.get('/preferences', async (req, res) => {
    const data = await service.getPreferences(req.user.id);
    sendSuccess(res, { data });
  });

  // PATCH /api/v1/push/preferences — update opted-in cities / per-source toggles.
  router.patch('/preferences', validate(pushPreferencesSchema), async (req, res) => {
    const data = await service.updatePreferences(req.user.id, req.valid.body);
    sendSuccess(res, { data });
  });

  return router;
}

module.exports = { createPushRouter };
