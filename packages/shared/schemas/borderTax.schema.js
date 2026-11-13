'use strict';

const { z } = require('zod');
const { BORDER_TAX, BORDER_TAX_STATES, BORDER_TAX_SEATS, BORDER_TAX_STATUS, BORDER_TAX_LIVE_STATES, TAX_MODE } = require('../constants/borderTax');
const { ADMIN_BORDER_TAX } = require('../constants/admin');

const DAY_MS = 86_400_000;

/** POST /api/v1/border-tax — one form, like CabsWale's single card. */
const borderTaxCreateSchema = z
  .object({
    vehicleNo: z
      .string()
      .transform((v) => v.replace(/[\s-]/g, '').toUpperCase())
      .pipe(z.string().regex(BORDER_TAX.VEHICLE_NO_REGEX)),
    stateCd: z.enum(Object.keys(BORDER_TAX_STATES)),
    checkpost: z.string().trim().toUpperCase(), // required since 2026-11-13 (null crashed the HR flow)
    seats: z.enum(BORDER_TAX_SEATS),
    startAt: z.coerce.date(),
    taxMode: z.enum(Object.values(TAX_MODE)).default(TAX_MODE.DAYS), // non-DAYS: the portal sets the end date
    days: z.coerce.number().int().min(1).max(BORDER_TAX.MAX_DAYS).default(1), // DAYS mode only
    distanceKm: z.coerce.number().int().min(1).max(BORDER_TAX.MAX_DISTANCE_KM).optional(), // HR portal needs it
    declare: z.literal(true), // driver accepts the portal's declaration; the bot ticks it for them
  })
  .strict()
  .superRefine((v, ctx) => {
    if (!BORDER_TAX_STATES[v.stateCd].checkposts.includes(v.checkpost)) {
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

const istDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');

/** GET /api/v1/admin/border-tax — offset (admin §8). from/to = IST calendar days, inclusive. */
const adminBorderTaxQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(ADMIN_BORDER_TAX.MAX_PAGE_SIZE).default(ADMIN_BORDER_TAX.PAGE_SIZE),
  state: z.enum(Object.keys(BORDER_TAX_STATES)).optional(),
  status: z.enum(Object.values(BORDER_TAX_STATUS)).optional(),
  from: istDay.optional(),
  to: istDay.optional(),
  who: z.enum(Object.values(ADMIN_BORDER_TAX.WHO)).default(ADMIN_BORDER_TAX.WHO.REAL),
  q: z.string().trim().max(20).transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, '')).optional(), // vehicle no. part
});

/** PATCH /api/v1/admin/border-tax/states/:stateCd — switch a live state off/on for new filings. */
const adminBorderTaxStateParamSchema = z.object({ stateCd: z.enum(BORDER_TAX_LIVE_STATES) });
const adminBorderTaxStateSchema = z.object({ paused: z.boolean() });

module.exports = {
  borderTaxCreateSchema, borderTaxCaptchaSchema, borderTaxIdParamSchema, borderTaxListQuerySchema,
  adminBorderTaxQuerySchema, adminBorderTaxStateParamSchema, adminBorderTaxStateSchema,
};
