'use strict';

const { z } = require('zod');
const { REFERRAL } = require('../constants/referrals');
const { ADMIN_SORT } = require('../constants/admin');

/** Auto-claim from an invite link (easecab.com/r/<code>); the code is the referrer's user id. */
const referralClaimSchema = z.object({ code: z.string().uuid() }).strict();

/** Admin referrals list (offset pagination is fine for admin, §8). */
const adminReferralsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(REFERRAL.ADMIN_MAX_PAGE_SIZE).default(REFERRAL.ADMIN_PAGE_SIZE),
  q: z.string().trim().min(1).max(100).optional(),
  status: z.enum(Object.values(REFERRAL.ADMIN_FILTER)).default(REFERRAL.ADMIN_FILTER.ALL),
  sort: z.enum(Object.values(ADMIN_SORT)).default(ADMIN_SORT.NEWEST),
});

module.exports = { referralClaimSchema, adminReferralsQuerySchema };
