'use strict';

const express = require('express');
const { AUTH_COOKIES, HTTP_STATUS } = require('@easecab/shared');
const { sendOtpSchema, verifyOtpSchema } = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');
const { setAuthCookies, clearAuthCookies } = require('../../http/cookies');
const { toPublicUser } = require('./auth.service');

/**
 * Mount the /api/v1/auth routes. Express 5 forwards rejected promises from async
 * handlers to the global error handler automatically (the reason Step 8 chose
 * Express 5) — so no asyncHandler wrapper is needed.
 *
 * @param {object} deps
 * @param {ReturnType<import('./auth.service').createAuthService>} deps.service
 * @param {{ cookie: { secure: boolean }, jwt: { accessTtl: string, refreshTtl: string } }} deps.config
 * @param {import('express').RequestHandler} deps.requireAuth - gate for the authed
 *   firebase-token route (the OTP routes stay public).
 * @returns {import('express').Router}
 */
function createAuthRouter({ service, config, requireAuth }) {
  const router = express.Router();
  const cookieCfg = {
    secure: config.cookie.secure,
    accessTtl: config.jwt.accessTtl,
    refreshTtl: config.jwt.refreshTtl,
  };

  // OUR rate-limit gate only; the client triggers the Firebase send after a 200.
  router.post('/send-otp', validate(sendOtpSchema), async (req, res) => {
    const data = await service.requestOtp(req.valid.body.phone);
    sendSuccess(res, { data });
  });

  // Verify Firebase ID token → upsert user (trial if new) → set cookies.
  router.post('/verify-otp', validate(verifyOtpSchema), async (req, res) => {
    const { user, isNewUser, accessToken, refreshToken } = await service.verifyOtp(req.valid.body.idToken);
    setAuthCookies(res, { accessToken, refreshToken }, cookieCfg);
    sendSuccess(res, {
      data: { user: toPublicUser(user) },
      status: isNewUser ? HTTP_STATUS.CREATED : HTTP_STATUS.OK,
    });
  });

  // Rotate from the refresh cookie.
  router.post('/refresh', async (req, res) => {
    const token = req.cookies && req.cookies[AUTH_COOKIES.REFRESH_TOKEN];
    const { accessToken, refreshToken } = await service.refresh(token);
    setAuthCookies(res, { accessToken, refreshToken }, cookieCfg);
    sendSuccess(res, { data: { refreshed: true } });
  });

  // Stateless logout — clear both cookies (CLAUDE.md §3.6).
  router.post('/logout', (_req, res) => {
    clearAuthCookies(res, { secure: config.cookie.secure });
    sendSuccess(res, { data: { loggedOut: true } });
  });

  // Firebase custom token for client-side Firestore chat reads (Step 22) — authed;
  // uid == our user id so the firestore.rules participant match applies.
  router.post('/firebase-token', requireAuth, async (req, res) => {
    const data = await service.mintFirebaseToken(req.user.id);
    sendSuccess(res, { data, status: HTTP_STATUS.CREATED });
  });

  return router;
}

module.exports = { createAuthRouter };
