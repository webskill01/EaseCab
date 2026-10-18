'use strict';

const { PAYMENT_STATUS, MEMBER_SYNC } = require('@easecab/shared');

/**
 * Member-sync data access (CLAUDE.md §4 — DB only, no decisions). Read-only: the
 * manager bots never write to the app through this feature.
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 */
function createMemberSyncRepository({ prisma }) {
  return {
    /**
     * Subscriptions changed since `since` (all when omitted), optionally only for these
     * full phones (+91…). Takes MAX_ROWS + 1 so the caller can tell a truncated page.
     * @returns {Promise<Array<{ userId: string, status: string, expiresAt: Date|null, user: { phone: string } }>>}
     */
    async listSubscriptions({ since, phones }) {
      const where = {};
      if (since) where.updatedAt = { gte: since };
      if (phones) where.user = { phone: { in: phones } };
      return prisma.subscription.findMany({
        where,
        orderBy: { updatedAt: 'asc' },
        take: MEMBER_SYNC.MAX_ROWS + 1,
        select: { userId: true, status: true, expiresAt: true, user: { select: { phone: true } } },
      });
    },

    /**
     * Every captured payment credited to these users, oldest first. A payment a founder
     * made on a member's behalf counts for that member (userId = onBehalfOfUserId).
     * @returns {Promise<Array<{ userId: string, amount: number, updatedAt: Date }>>}
     */
    async capturedPaymentsFor(userIds) {
      if (userIds.length === 0) return [];
      const rows = await prisma.payment.findMany({
        where: {
          status: PAYMENT_STATUS.CAPTURED,
          OR: [{ onBehalfOfUserId: { in: userIds } }, { userId: { in: userIds }, onBehalfOfUserId: null }],
        },
        orderBy: { updatedAt: 'asc' },
        select: { userId: true, onBehalfOfUserId: true, amount: true, updatedAt: true },
      });
      return rows.map(({ onBehalfOfUserId, ...p }) => ({ ...p, userId: onBehalfOfUserId || p.userId }));
    },

    /**
     * Captured payments whose capture (updatedAt) falls in [from, to), with the credited
     * member's phone (the member, not the founder, for on-behalf payments).
     * @returns {Promise<Array<{ userId: string, amount: number, updatedAt: Date, user: { phone: string } }>>}
     */
    async capturedPaymentsBetween(from, to) {
      const rows = await prisma.payment.findMany({
        where: { status: PAYMENT_STATUS.CAPTURED, updatedAt: { gte: from, lt: to } },
        orderBy: { updatedAt: 'asc' },
        take: MEMBER_SYNC.MAX_ROWS + 1,
        select: {
          userId: true, onBehalfOfUserId: true, amount: true, updatedAt: true,
          user: { select: { phone: true } }, onBehalfOf: { select: { phone: true } },
        },
      });
      return rows.map(({ onBehalfOfUserId, onBehalfOf, ...p }) => (
        onBehalfOfUserId ? { ...p, userId: onBehalfOfUserId, user: onBehalfOf } : p
      ));
    },

    /**
     * Each credited user's first-ever captured payment time — tells a join from a renewal.
     * @returns {Promise<Array<{ userId: string, _min: { updatedAt: Date } }>>}
     */
    async firstPaymentTimes(userIds) {
      const pays = await this.capturedPaymentsFor(userIds);
      const first = new Map();
      for (const p of pays) if (!first.has(p.userId)) first.set(p.userId, p.updatedAt); // oldest first
      return [...first].map(([userId, updatedAt]) => ({ userId, _min: { updatedAt } }));
    },
  };
}

module.exports = { createMemberSyncRepository };
