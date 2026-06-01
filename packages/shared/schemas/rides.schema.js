'use strict';

const { z } = require('zod');
const { RIDES_FEED } = require('../constants/rides');

/**
 * Rides feed query schema (CLAUDE.md §5 — Zod validates every external input; §8 —
 * cursor-based pagination). `limit` is coerced from the query string, clamped to
 * [1, MAX_LIMIT], and defaults to DEFAULT_LIMIT. `cursor` is the opaque keyset
 * token from a previous page's `meta.nextCursor` (decoded server-side). Default
 * strip drops unknown keys rather than rejecting.
 */
const ridesListQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(RIDES_FEED.MAX_LIMIT)
    .default(RIDES_FEED.DEFAULT_LIMIT),
  cursor: z.string().min(1).optional(),
});

/** Ride id path param — must be a UUID (matches Ride.id @db.Uuid). */
const rideIdParamSchema = z.object({
  id: z.string().uuid(),
});

module.exports = { ridesListQuerySchema, rideIdParamSchema };
