'use strict';

const { z } = require('zod');
const { VEHICLE_TYPES } = require('../constants/vehicles');
const { POSTED_RIDES } = require('../constants/postedRides');
const { RIDES_FEED } = require('../constants/rides');

// Indian E.164 — mirrors auth.schema (the single phone shape across the app).
const IN_MOBILE = /^\+91[6-9]\d{9}$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Create-a-post body. Per direction the client sends EITHER a resolved cityId
 * (picked from the typeahead) OR free-text raw (no match) — at least one of each
 * pair is required (refinements). `.strict()` rejects unknown keys.
 */
const postedRideCreateSchema = z
  .object({
    fromCityId: z.string().uuid().optional(),
    fromCityRaw: z.string().trim().min(1).max(80).optional(),
    toCityId: z.string().uuid().optional(),
    toCityRaw: z.string().trim().min(1).max(80).optional(),
    phone: z.string().regex(IN_MOBILE, 'phone must be +91 followed by a 10-digit mobile'),
    vehicleType: z.enum(Object.values(VEHICLE_TYPES)).optional(),
    fare: z.coerce.number().positive().max(1_000_000).optional(),
    rideDate: z.coerce.date().optional(),
    rideTime: z.string().regex(HHMM, 'rideTime must be HH:MM (24h)').optional(),
    notes: z.string().trim().max(POSTED_RIDES.NOTES_MAX).optional(),
  })
  .strict()
  .refine((d) => Boolean(d.fromCityId || d.fromCityRaw), { path: ['fromCityId'], message: 'fromCityId or fromCityRaw is required' })
  .refine((d) => Boolean(d.toCityId || d.toCityRaw), { path: ['toCityId'], message: 'toCityId or toCityRaw is required' });

/** Free-text parse-preview body (Step 20). Read-only — server extracts a draft. */
const postedRideParseSchema = z
  .object({ text: z.string().trim().min(1).max(POSTED_RIDES.PARSE_TEXT_MAX) })
  .strict();

/** Posted-rides feed query — cursor keyset pagination (same shape as ridesListQuerySchema). */
const postedRidesListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(POSTED_RIDES.FEED.MAX_LIMIT).default(POSTED_RIDES.FEED.DEFAULT_LIMIT),
  cursor: z.string().min(1).optional(),
  // Live city-filter lock (Step 18, multi-select): comma-separated City UUIDs; keep
  // only posts whose FROM city is in the set. Empty/omitted = unfiltered feed.
  cityIds: z
    .preprocess(
      (v) => (typeof v === 'string' ? v.split(',').filter(Boolean) : v),
      z.array(z.string().uuid()).max(RIDES_FEED.MAX_CITY_FILTER),
    )
    .optional(),
});

/** Posted-ride id path param — must be a UUID (matches PostedRide.id @db.Uuid). */
const postedRideIdParamSchema = z.object({ id: z.string().uuid() });

module.exports = { postedRideCreateSchema, postedRideParseSchema, postedRidesListQuerySchema, postedRideIdParamSchema };
