'use strict';

const express = require('express');
const { HTTP_STATUS, blockCreateSchema } = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Authed blocks route: POST /api/v1/blocks. Blocks a user (chat-scoped enforcement
 * lives in the chat service). Idempotent. Unblock is deferred (no UI yet).
 *
 * @param {object} deps
 * @param {ReturnType<import('./blocks.service').createBlocksService>} deps.service
 * @param {import('express').RequestHandler} deps.requireAuth
 * @returns {import('express').Router}
 */
function createBlocksRouter({ service, requireAuth }) {
  const router = express.Router();
  router.post('/', requireAuth, validate(blockCreateSchema), async (req, res) => {
    const data = await service.blockUser(req.user.id, req.valid.body);
    sendSuccess(res, { data, status: HTTP_STATUS.CREATED });
  });
  return router;
}

module.exports = { createBlocksRouter };
