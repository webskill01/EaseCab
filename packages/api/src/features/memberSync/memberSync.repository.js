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
     * Every captured payment of these users, oldest first.
     * @returns {Promise<Array<{ userId: string, amount: number, updatedAt: Date }>>}
     */
    async capturedPaymentsFor(userIds) {
      if (userIds.length === 0) return [];
      return prisma.payment.findMany({
        where: { userId: { in: userIds }, status: PAYMENT_STATUS.CAPTURED },
        orderBy: { updatedAt: 'asc' },
        select: { userId: true, amount: true, updatedAt: true },
      });
    },

    /**
     * Captured payments whose capture (updatedAt) falls in [from, to), with the payer's phone.
     * @returns {Promise<Array<{ userId: string, amount: number, updatedAt: Date, user: { phone: string } }>>}
     */
    async capturedPaymentsBetween(from, to) {
      return prisma.payment.findMany({
        where: { status: PAYMENT_STATUS.CAPTURED, updatedAt: { gte: from, lt: to } },
        orderBy: { updatedAt: 'asc' },
        take: MEMBER_SYNC.MAX_ROWS + 1,
        select: { userId: true, amount: true, updatedAt: true, user: { select: { phone: true } } },
      });
    },

    /**
     * Each user's first-ever captured payment time — tells a join from a renewal.
     * @returns {Promise<Array<{ userId: string, _min: { updatedAt: Date } }>>}
     */
    async firstPaymentTimes(userIds) {
      if (userIds.length === 0) return [];
      return prisma.payment.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, status: PAYMENT_STATUS.CAPTURED },
        _min: { updatedAt: true },
      });
    },
  };
}

module.exports = { createMemberSyncRepository };
