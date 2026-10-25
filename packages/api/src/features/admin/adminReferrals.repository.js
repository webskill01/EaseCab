'use strict';

const { PAYMENT_STATUS, REFERRAL, ADMIN_SORT } = require('@easecab/shared');

const CAPTURED = Object.freeze({ where: { status: PAYMENT_STATUS.CAPTURED } });
const REFERRED = Object.freeze({ referredById: { not: null } });
const HAS_PAID = Object.freeze({
  OR: [{ payments: { some: CAPTURED.where } }, { paymentsOnBehalf: { some: CAPTURED.where } }],
});
const NOT_PAID = Object.freeze({ payments: { none: CAPTURED.where }, paymentsOnBehalf: { none: CAPTURED.where } });
const STATUS_WHERE = Object.freeze({
  [REFERRAL.ADMIN_FILTER.PAID]: HAS_PAID,
  [REFERRAL.ADMIN_FILTER.UNPAID]: NOT_PAID,
  [REFERRAL.ADMIN_FILTER.REWARDED]: { referralRewardedAt: { not: null } },
});

const matches = (q) => ({ OR: [{ phone: { contains: q } }, { name: { contains: q, mode: 'insensitive' } }] });

/** Referees matching the filters: `q` hits the referee or the referrer (name or phone). */
function buildWhere({ q, status }) {
  const and = [REFERRED];
  if (STATUS_WHERE[status]) and.push(STATUS_WHERE[status]);
  if (q) and.push({ OR: [matches(q), { referredBy: { is: matches(q) } }] });
  return { AND: and };
}

/**
 * Admin referrals data access (Prisma only). Every referee row carries its referrer;
 * served by users.referred_by_id.
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 */
function createAdminReferralsRepository({ prisma }) {
  return {
    /**
     * Filtered page of referees (by join date) with their referrer + paid counts.
     * `matched` is the filtered count for paging; the rest are program-wide totals.
     */
    async list({ page, limit, q, status, sort }) {
      const dir = sort === ADMIN_SORT.OLDEST ? 'asc' : 'desc';
      const where = buildWhere({ q, status });
      const [rows, matched, total, paid, rewarded, referrers] = await prisma.$transaction([
        prisma.user.findMany({
          where,
          orderBy: [{ createdAt: dir }, { id: dir }],
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true, name: true, phone: true, createdAt: true, referralRewardedAt: true,
            referredBy: { select: { id: true, name: true, phone: true } },
            _count: { select: { payments: CAPTURED, paymentsOnBehalf: CAPTURED } },
          },
        }),
        prisma.user.count({ where }),
        prisma.user.count({ where: REFERRED }),
        prisma.user.count({ where: { ...REFERRED, ...HAS_PAID } }),
        prisma.user.count({ where: { referralRewardedAt: { not: null } } }),
        prisma.user.groupBy({ by: ['referredById'], where: REFERRED, orderBy: { referredById: 'asc' } }),
      ]);
      return { rows, matched, total, paid, rewarded, referrers: referrers.length };
    },
  };
}

module.exports = { createAdminReferralsRepository };
