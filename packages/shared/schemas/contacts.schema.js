'use strict';

const { z } = require('zod');
const { CONTACTED } = require('../constants/contacts');

/** GET /api/v1/me/contacted query — cursor keyset pagination (same shape as the feeds). */
const contactedListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(CONTACTED.FEED.MAX_LIMIT).default(CONTACTED.FEED.DEFAULT_LIMIT),
  cursor: z.string().min(1).optional(),
});

module.exports = { contactedListQuerySchema };
