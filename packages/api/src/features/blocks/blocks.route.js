'use strict';

const express = require('express');
const { HTTP_STATUS, blockCreateSchema, blockParamSchema } = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Authed blocks routes (chat-scoped enforcement lives in the chat service):
 *   GET    /api/v1/blocks            — list the caller's blocked users
 *   POST   /api/v1/blocks            — block a user (idempotent)
 *   DELETE /api/v1/blocks/:blockedId — unblock a user (idempotent)
 *
 * @param {object} deps
 * @param {ReturnType<import('./blocks.service').createBlocksService>} deps.service
 * @param {import('express').RequestHandler} deps.requireAuth
 * @returns {import('express').Router}
 */
function createBlocksRouter({ service, requireAuth }) {
  const router = express.Router();

  router.get('/', requireAuth, async (req, res) => {
    const blocks = await service.listBlocks(req.user.id);
    sendSuccess(res, { data: { blocks } });
  });

  router.post('/', requireAuth, validate(blockCreateSchema), async (req, res) => {
    const data = await service.blockUser(req.user.id, req.valid.body);
    sendSuccess(res, { data, status: HTTP_STATUS.CREATED });
  });

  router.delete('/:blockedId', requireAuth, validate(blockParamSchema, 'params'), async (req, res) => {
    const { blockedId } = req.valid.params;
    await service.unblockUser(req.user.id, blockedId);
    sendSuccess(res, { data: { blockedId } });
  });

  return router;
}

module.exports = { createBlocksRouter };
