'use strict';

const { z } = require('zod');
const { MESSAGE_TYPE } = require('../constants/enums');
const { CHAT } = require('../constants/chat');

/** Open a chat for a posted ride. The initiator is the authed caller (from JWT). */
const chatOpenSchema = z.object({ postedRideId: z.string().uuid() }).strict();

/** Chat id path param — must be a UUID (matches Chat.id @db.Uuid). */
const chatIdParamSchema = z.object({ id: z.string().uuid() });

/** Message-history query — cursor keyset pagination (same shape as the ride feeds). */
const chatMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(CHAT.MESSAGES.MAX_LIMIT).default(CHAT.MESSAGES.DEFAULT_LIMIT),
  cursor: z.string().min(1).optional(),
});

/**
 * Send a text message. `messageType` defaults to text; image is rejected until R2
 * presigned upload lands (Step 22) — the refine keeps the 400 at the validation
 * layer so the service never sees an image. `messageText` is required + bounded.
 */
const sendMessageSchema = z
  .object({
    messageType: z.enum(Object.values(MESSAGE_TYPE)).default(MESSAGE_TYPE.TEXT),
    messageText: z.string().trim().min(1).max(CHAT.TEXT_MAX),
  })
  .strict()
  .refine((d) => d.messageType === MESSAGE_TYPE.TEXT, {
    path: ['messageType'],
    message: 'image messages are not yet supported',
  });

module.exports = { chatOpenSchema, chatIdParamSchema, chatMessagesQuerySchema, sendMessageSchema };
