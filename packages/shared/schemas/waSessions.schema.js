'use strict';

const { z } = require('zod');
const { WA_SESSIONS, RIDE_STATS_PERIOD_HOURS } = require('../constants/waSessions');

/** Phase 25 — admin Sessions tab + public pairing share page. */

const sessionName = z.string().trim().min(1).max(WA_SESSIONS.NAME_MAX);

const adminWaSessionCreateSchema = z.object({ name: sessionName });

const adminWaSessionUpdateSchema = z
  .object({ name: sessionName.optional(), enabled: z.boolean().optional() })
  .refine((b) => b.name !== undefined || b.enabled !== undefined, { message: 'nothing to update' });

const adminWaSessionIdParamSchema = z.object({ id: z.string().uuid() });

/**
 * Start pairing. `phone` (optional) = the WhatsApp number to link, for a pairing code
 * instead of a QR. A bare 10-digit Indian number gets the 91 country code.
 */
const waPairStartSchema = z.object({
  phone: z
    .string()
    .trim()
    .transform((s) => s.replace(/\D/g, ''))
    .transform((d) => (d.length === 10 ? `91${d}` : d))
    .refine((d) => d.length >= 11 && d.length <= 15, { message: 'enter the number with country code' })
    .optional(),
});

/** Ride analytics window for one session. */
const adminWaSessionAnalyticsQuerySchema = z.object({
  period: z.enum(Object.keys(RIDE_STATS_PERIOD_HOURS)).default('day'),
});

/** Share token from the public link (base64url of SHARE_TOKEN_BYTES). */
const waPairTokenParamSchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{20,64}$/) });

module.exports = {
  adminWaSessionCreateSchema,
  adminWaSessionUpdateSchema,
  adminWaSessionIdParamSchema,
  waPairStartSchema,
  waPairTokenParamSchema,
  adminWaSessionAnalyticsQuerySchema,
};
