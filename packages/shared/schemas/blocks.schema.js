'use strict';

const { z } = require('zod');

/**
 * Block a user (P12-4c). `blockedId` is the target user's id — the blocker is the
 * authed caller (from JWT), never the body. `.strict()` rejects unknown keys.
 */
const blockCreateSchema = z.object({ blockedId: z.string().uuid() }).strict();

module.exports = { blockCreateSchema };
