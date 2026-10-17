'use strict';

const { z } = require('zod');
const { MEMBER_SYNC } = require('../constants/memberSync');

const tenDigitPhone = z.string().regex(/^[6-9]\d{9}$/, 'phone must be a 10-digit Indian mobile');

/** `GET /member-sync/memberships` — `since` (changed-since cursor) and/or `phones` (comma list). */
const membershipsQuerySchema = z.object({
  since: z.coerce.date().optional(),
  phones: z
    .string()
    .max(MEMBER_SYNC.MAX_PHONES * (MEMBER_SYNC.PHONE_DIGITS + 1))
    .optional()
    .transform((s) => (s ? s.split(',').map((p) => p.trim()).filter(Boolean) : undefined))
    .pipe(z.array(tenDigitPhone).max(MEMBER_SYNC.MAX_PHONES).optional()),
});

/** `GET /member-sync/payments` — captured payments in [from, to). */
const memberPaymentsQuerySchema = z
  .object({ from: z.coerce.date(), to: z.coerce.date() })
  .refine((v) => v.from < v.to, { message: 'from must be before to' });

module.exports = { membershipsQuerySchema, memberPaymentsQuerySchema };
