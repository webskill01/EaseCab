'use strict';

const express = require('express');
const { HTTP_STATUS, chatOpenSchema, chatIdParamSchema, chatMessagesQuerySchema, sendMessageSchema } = require('@easecab/shared');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../http/respond');

/**
 * Authed chat routes: /api/v1/chats. Opening is gated on a prior verified contact;
 * sending is blocked once the ride expires (read-only) — both enforced in the
 * service. Express 5 forwards async rejections to the global error handler.
 *
 * @param {object} deps
 * @param {ReturnType<import('./chat.service').createChatService>} deps.service
 * @param {import('express').RequestHandler} deps.requireAuth
 * @returns {import('express').Router}
 */
function createChatRouter({ service, requireAuth }) {
  const router = express.Router();
  router.use(requireAuth);

  // POST /api/v1/chats — open (or return) the 1:1 chat for a posted ride.
  router.post('/', validate(chatOpenSchema), async (req, res) => {
    const data = await service.openChat(req.user.id, req.valid.body);
    sendSuccess(res, { data, status: HTTP_STATUS.CREATED });
  });

  // GET /api/v1/chats — the caller's chats (either role).
  router.get('/', async (req, res) => {
    const { chats } = await service.listChats(req.user.id);
    sendSuccess(res, { data: { chats } });
  });

  // GET /api/v1/chats/:id/messages — participant-gated message history.
  router.get('/:id/messages', validate(chatIdParamSchema, 'params'), validate(chatMessagesQuerySchema, 'query'), async (req, res) => {
    const { messages, nextCursor } = await service.listMessages(req.user.id, req.valid.params.id, req.valid.query);
    sendSuccess(res, { data: { messages }, meta: { nextCursor } });
  });

  // POST /api/v1/chats/:id/messages — send a text message (mirrors to Firestore).
  router.post('/:id/messages', validate(chatIdParamSchema, 'params'), validate(sendMessageSchema), async (req, res) => {
    const data = await service.sendMessage(req.user.id, req.valid.params.id, req.valid.body);
    sendSuccess(res, { data, status: HTTP_STATUS.CREATED });
  });

  // POST /api/v1/chats/:id/read — mark the caller's inbound messages read (receipts).
  router.post('/:id/read', validate(chatIdParamSchema, 'params'), async (req, res) => {
    const data = await service.markRead(req.user.id, req.valid.params.id);
    sendSuccess(res, { data, status: HTTP_STATUS.CREATED });
  });

  // POST /api/v1/chats/:id/presence — heartbeat; stamps the caller's lastActiveAt.
  router.post('/:id/presence', validate(chatIdParamSchema, 'params'), async (req, res) => {
    const data = await service.touchPresence(req.user.id, req.valid.params.id);
    sendSuccess(res, { data, status: HTTP_STATUS.CREATED });
  });

  return router;
}

module.exports = { createChatRouter };
