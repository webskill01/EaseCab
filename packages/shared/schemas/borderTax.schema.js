'use strict';

const { z } = require('zod');
const { BORDER_TAX, BORDER_TAX_STATES, BORDER_TAX_SEATS, TAX_MODE } = require('../constants/borderTax');

const DAY_MS = 86_400_000;

/** POST /api/v1/border-tax — one form, like CabsWale's single card. */
const borderTaxCreateSchema = z
  .object({
    vehicleNo: z
      .string()
      .transform((v) => v.replace(/[\s-]/g, '').toUpperCase())
      .pipe(z.string().regex(BORDER_TAX.VEHICLE_NO_REGEX)),
    stateCd: z.enum(Object.keys(BORDER_TAX_STATES)),
    checkpost: z.string().trim().toUpperCase().optional(), // optional, like CabsWale's "Border"
    seats: z.enum(BORDER_TAX_SEATS),
    startAt: z.coerce.date(),
    taxMode: z.enum(Object.values(TAX_MODE)).default(TAX_MODE.DAYS), // non-DAYS: the portal sets the end date
    days: z.coerce.number().int().min(1).max(BORDER_TAX.MAX_DAYS).default(1), // DAYS mode only
    distanceKm: z.coerce.number().int().min(1).max(BORDER_TAX.MAX_DISTANCE_KM).optional(), // HR portal needs it
    declare: z.literal(true), // driver accepts the portal's declaration; the bot ticks it for them
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.checkpost && !BORDER_TAX_STATES[v.stateCd].checkposts.includes(v.checkpost)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['checkpost'], message: 'Unknown checkpost' });
    }
    if (!BORDER_TAX_STATES[v.stateCd].taxModes.includes(v.taxMode)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['taxMode'], message: 'Tax period not offered in this state' });
    }
    if (BORDER_TAX_STATES[v.stateCd].needsDistance && !v.distanceKm) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['distanceKm'], message: 'Distance required' });
    }
    const ahead = v.startAt.getTime() - Date.now();
    if (ahead < -60_000 || ahead > BORDER_TAX.MAX_START_AHEAD_DAYS * DAY_MS) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['startAt'], message: 'Start time out of range' });
    }
  });

/** POST /api/v1/border-tax/:id/captcha — the driver's reading of the captcha image. */
const borderTaxCaptchaSchema = z
  // Vahan captchas carry symbols too (OCR read "ssju7#M", 2026-11-06): any printable ASCII, no spaces
  .object({ answer: z.string().trim().regex(/^[!-~]{3,10}$/) })
  .strict();

const borderTaxIdParamSchema = z.object({ id: z.string().uuid() });

/** GET /api/v1/border-tax query — cursor keyset pagination (same shape as the feeds). */
const borderTaxListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(BORDER_TAX.LIST.MAX_LIMIT).default(BORDER_TAX.LIST.DEFAULT_LIMIT),
  cursor: z.string().min(1).optional(),
});

module.exports = { borderTaxCreateSchema, borderTaxCaptchaSchema, borderTaxIdParamSchema, borderTaxListQuerySchema };
