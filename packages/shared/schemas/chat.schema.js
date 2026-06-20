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
 * Send a message. `messageType` defaults to text. A text message carries a bounded
 * `messageText` (no attachment); an image message carries an `attachmentKey` (an R2
 * key from a `chat_image` presigned upload, re-verified server-side) and no text.
 * The superRefine enforces exactly the right field per type at the validation layer.
 */
const sendMessageSchema = z
  .object({
    messageType: z.enum(Object.values(MESSAGE_TYPE)).default(MESSAGE_TYPE.TEXT),
    messageText: z.string().trim().min(1).max(CHAT.TEXT_MAX).optional(),
    attachmentKey: z.string().trim().min(1).optional(),
  })
  .strict()
  .superRefine((d, ctx) => {
    if (d.messageType === MESSAGE_TYPE.IMAGE) {
      if (!d.attachmentKey) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['attachmentKey'], message: 'attachmentKey is required for an image message' });
      if (d.messageText) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['messageText'], message: 'an image message must not carry text' });
    } else {
      if (!d.messageText) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['messageText'], message: 'messageText is required for a text message' });
      if (d.attachmentKey) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['attachmentKey'], message: 'a text message must not carry an attachment' });
    }
  });

module.exports = { chatOpenSchema, chatIdParamSchema, chatMessagesQuerySchema, sendMessageSchema };
