'use strict';

const express = require('express');
const { uploadPresignSchema } = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Authed uploads routes: /api/v1/uploads. Issues presigned POSTs only — the actual
 * bytes go straight to R2, never through the API (CLAUDE.md §8/§12). NOT verification-
 * gated: a user must be able to upload their DP to COMPLETE verification (L1).
 *
 * @param {object} deps
 * @param {ReturnType<import('./uploads.service').createUploadsService>} deps.service
 * @param {import('express').RequestHandler} deps.requireAuth
 * @returns {import('express').Router}
 */
function createUploadsRouter({ service, requireAuth }) {
  const router = express.Router();

  router.post('/presign', requireAuth, validate(uploadPresignSchema), async (req, res) => {
    const data = await service.presign({ userId: req.user.id, ...req.valid.body });
    sendSuccess(res, { data });
  });

  return router;
}

module.exports = { createUploadsRouter };
