'use strict';

const { PAYMENT_STATUS, SUBSCRIPTION_STATUS, ADMIN_FOUNDER_PAYMENTS, ADMIN_STATISTICS, ADMIN_SORT } = require('@easecab/shared');
const { delCachedSub } = require('../../lib/subscriptionCache');

const SINCE = new Date(`${ADMIN_STATISTICS.LAUNCH_DATE}T00:00:00+05:30`);
const FOUNDER_WHERE = Object.freeze({
  status: PAYMENT_STATUS.CAPTURED,
  updatedAt: { gte: SINCE },
  user: { phone: { in: ADMIN_FOUNDER_PAYMENTS.COLLECTION_PHONES } },
});
const LINK_WHERE = Object.freeze({
  [ADMIN_FOUNDER_PAYMENTS.FILTER.LINKED]: { onBehalfOfUserId: { not: null } },
  [ADMIN_FOUNDER_PAYMENTS.FILTER.UNLINKED]: { onBehalfOfUserId: null },
});

/** Founder payments matching the filters; `q` hits the linked member's name or phone. */
function buildWhere({ q, status }) {
  const and = [FOUNDER_WHERE];
  if (LINK_WHERE[status]) and.push(LINK_WHERE[status]);
  if (q) and.push({ onBehalfOf: { is: { OR: [{ phone: { contains: q } }, { name: { contains: q, mode: 'insensitive' } }] } } });
  return { AND: and };
}

/**
 * Founder-payments data access (Prisma only). Payments made in the app by a founder
 * collection account since launch; linking sets payments.on_behalf_of_user_id.
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 * @param {import('ioredis').Redis} deps.redis
 */
function createAdminFounderPaymentsRepository({ prisma, redis }) {
  return {
    /** Filtered page by capture time (`updatedAt`); `unlinked` ignores the filters. */
    async list({ page, limit, q, status, sort }) {
      const dir = sort === ADMIN_SORT.OLDEST ? 'asc' : 'desc';
      const where = buildWhere({ q, status });
      const [rows, total, unlinked] = await prisma.$transaction([
        prisma.payment.findMany({
          where,
          orderBy: [{ updatedAt: dir }, { id: dir }],
          skip: (page - 1) * limit,
          take: limit,
          select: { id: true, amount: true, updatedAt: true, onBehalfOf: { select: { id: true, name: true, phone: true } } },
        }),
        prisma.payment.count({ where }),
        prisma.payment.count({ where: { ...FOUNDER_WHERE, onBehalfOfUserId: null } }),
      ]);
      return { rows, total, unlinked };
    },

    /** The payment only if it is a founder payment (any link state), else null. */
    async findFounderPayment(id) {
      return prisma.payment.findFirst({ where: { ...FOUNDER_WHERE, id }, select: { id: true, onBehalfOfUserId: true } });
    },

    /** Live (not deleted) member by full phone, with the fields computeRenewal needs. */
    async findMemberByPhone(phone) {
      return prisma.user.findFirst({
        where: { phone, isDeleted: false },
        select: { id: true, name: true, subscription: { select: { status: true, expiresAt: true, paidStartedAt: true } } },
      });
    },

    /**
     * Link (only if still unlinked) and optionally extend the member's plan, atomically.
     * Raw UPDATE so payments.updated_at (the capture time stats rely on) is not bumped.
     * @returns {Promise<boolean>} false if someone linked it first.
     */
    async link({ paymentId, userId, renewal }) {
      return prisma.$transaction(async (tx) => {
        const n = await tx.$executeRaw`
          UPDATE payments SET on_behalf_of_user_id = ${userId}::uuid
          WHERE id = ${paymentId}::uuid AND on_behalf_of_user_id IS NULL`;
        if (n === 0) return false;
        if (renewal) {
          const data = { status: SUBSCRIPTION_STATUS.ACTIVE, expiresAt: renewal.newExpiresAt, paidStartedAt: renewal.paidStartedAt };
          await tx.subscription.upsert({ where: { userId }, update: data, create: { userId, ...data } });
        }
        return true;
      });
    },

    /** Drop the cached subscription so the paywall lifts immediately. */
    async invalidateSubCache(userId) {
      await delCachedSub(redis, userId);
    },
  };
}

module.exports = { createAdminFounderPaymentsRepository };
