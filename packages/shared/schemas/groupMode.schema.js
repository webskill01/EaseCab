'use strict';

const { z } = require('zod');
const { GROUP_MODE } = require('../constants/groupMode');

const unique = (ids) => new Set(ids).size === ids.length;

/**
 * PUT /group-mode/settings — the toggle, the user's own city groups (order kept) and the
 * pinned rows (city ids and/or 'all'; Driver Duties is always on top). `pinned` omitted =
 * keep the saved pins (older clients never send it).
 */
const groupModeUpdateSchema = z.object({
  enabled: z.boolean(),
  cityIds: z.array(z.string().uuid()).max(GROUP_MODE.MAX_GROUPS).refine(unique, 'duplicate city'),
  pinned: z.array(z.union([z.string().uuid(), z.literal(GROUP_MODE.SPECIAL.ALL)]))
    .max(GROUP_MODE.MAX_GROUPS + 1).refine(unique, 'duplicate pin').optional(),
}).strict();

const groupKey = z.union([z.string().uuid(), z.literal(GROUP_MODE.SPECIAL.ALL), z.literal(GROUP_MODE.SPECIAL.DUTIES)]);

/**
 * GET /group-mode/summary?g=<key>.<sinceMs>,… — one entry per group the client shows,
 * `since` = when the user last opened it (unread = items after it).
 */
const groupSummaryQuerySchema = z.object({
  g: z.preprocess(
    (v) => (typeof v === 'string' ? v.split(',').filter(Boolean).map((p) => {
      const [key, since] = p.split('.');
      return { key, since: Number(since) };
    }) : v),
    z.array(z.object({ key: groupKey, since: z.number().int().min(0) }))
      .min(1).max(GROUP_MODE.MAX_GROUPS + 2),
  ),
});

module.exports = { groupModeUpdateSchema, groupSummaryQuerySchema };
