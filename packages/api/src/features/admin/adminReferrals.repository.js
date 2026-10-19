'use strict';

const { PAYMENT_STATUS } = require('@easecab/shared');

const CAPTURED = Object.freeze({ where: { status: PAYMENT_STATUS.CAPTURED } });
const REFERRED = Object.freeze({ referredById: { not: null } });
const HAS_PAID = Object.freeze({
  OR: [{ payments: { some: CAPTURED.where } }, { paymentsOnBehalf: { some: CAPTURED.where } }],
});

/**
 * Admin referrals data access (Prisma only). Every referee row carries its referrer;
 * served by users.referred_by_id.
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 */
function createAdminReferralsRepository({ prisma }) {
  return {
    /** Newest referees first, with their referrer + paid counts, and the program totals. */
    async list({ page, limit }) {
      const [rows, total, paid, rewarded, referrers] = await prisma.$transaction([
        prisma.user.findMany({
          where: REFERRED,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true, name: true, phone: true, createdAt: true, referralRewardedAt: true,
            referredBy: { select: { id: true, name: true, phone: true } },
            _count: { select: { payments: CAPTURED, paymentsOnBehalf: CAPTURED } },
          },
        }),
        prisma.user.count({ where: REFERRED }),
        prisma.user.count({ where: { ...REFERRED, ...HAS_PAID } }),
        prisma.user.count({ where: { referralRewardedAt: { not: null } } }),
        prisma.user.groupBy({ by: ['referredById'], where: REFERRED, orderBy: { referredById: 'asc' } }),
      ]);
      return { rows, total, paid, rewarded, referrers: referrers.length };
    },
  };
}

module.exports = { createAdminReferralsRepository };
