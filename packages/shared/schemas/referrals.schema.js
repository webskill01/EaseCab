'use strict';

const { z } = require('zod');
const { REFERRAL } = require('../constants/referrals');

/** "Who referred you?" — accepts "98765 43210", "919876543210", "+91 98765-43210". */
const referralClaimSchema = z.object({
  phone: z.string().trim().max(20)
    .transform((v) => v.replace(/\D/g, '').replace(/^(?:91|0)?(\d{10})$/, '+91$1'))
    .pipe(z.string().regex(/^\+91[6-9]\d{9}$/, 'enter a 10-digit mobile number')),
}).strict();

/** Admin referrals list (offset pagination is fine for admin, §8). */
const adminReferralsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(REFERRAL.ADMIN_MAX_PAGE_SIZE).default(REFERRAL.ADMIN_PAGE_SIZE),
});

module.exports = { referralClaimSchema, adminReferralsQuerySchema };
