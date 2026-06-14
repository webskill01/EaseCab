'use strict';

const express = require('express');
const { ADMIN_AUTH_COOKIES, HTTP_STATUS, adminLoginSchema } = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');
const { setAdminAuthCookies, clearAdminAuthCookies } = require('../../http/cookies');

/**
 * Mount /api/v1/admin/auth (Step 24a). Express 5 forwards async rejections to the
 * global error handler, so no wrapper is needed. requireAdmin gates GET /me;
 * login/refresh/logout are reachable without a session.
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminAuth.service').createAdminAuthService>} deps.service
 * @param {{ cookie: { secure: boolean }, adminJwt: { accessTtl: string, refreshTtl: string } }} deps.config
 * @param {import('express').RequestHandler} deps.requireAdmin
 * @returns {import('express').Router}
 */
function createAdminAuthRouter({ service, config, requireAdmin }) {
  const router = express.Router();
  const cookieCfg = {
    secure: config.cookie.secure,
    accessTtl: config.adminJwt.accessTtl,
    refreshTtl: config.adminJwt.refreshTtl,
  };

  // Email+password → throttled bcrypt check → set both admin cookies.
  router.post('/login', validate(adminLoginSchema), async (req, res) => {
    const { admin, accessToken, refreshToken } = await service.login(req.valid.body.email, req.valid.body.password);
    setAdminAuthCookies(res, { accessToken, refreshToken }, cookieCfg);
    sendSuccess(res, { data: { admin }, status: HTTP_STATUS.OK });
  });

  // Rotate from the admin refresh cookie (re-loads the admin_users row).
  router.post('/refresh', async (req, res) => {
    const token = req.cookies && req.cookies[ADMIN_AUTH_COOKIES.REFRESH_TOKEN];
    const { admin, accessToken, refreshToken } = await service.refresh(token);
    setAdminAuthCookies(res, { accessToken, refreshToken }, cookieCfg);
    sendSuccess(res, { data: { admin } });
  });

  // Stateless logout — clear both admin cookies.
  router.post('/logout', (_req, res) => {
    clearAdminAuthCookies(res, { secure: config.cookie.secure });
    sendSuccess(res, { data: { loggedOut: true } });
  });

  // Current admin (AdminGuard probes this on mount).
  router.get('/me', requireAdmin, (req, res) => {
    sendSuccess(res, { data: { admin: req.admin } });
  });

  return router;
}

module.exports = { createAdminAuthRouter };
