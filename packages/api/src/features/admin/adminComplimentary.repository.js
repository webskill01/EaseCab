'use strict';

const { SUBSCRIPTION_STATUS } = require('@easecab/shared');
const { delCachedSub } = require('../../lib/subscriptionCache');

/**
 * Free-members data access (Prisma only). A complimentary_members row marks a user whose
 * plan was given for barter/help; analytics queries skip these users.
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 * @param {import('ioredis').Redis} deps.redis
 */
function createAdminComplimentaryRepository({ prisma, redis }) {
  return {
    /** Every free member, newest first, with their current plan window. */
    async list() {
      return prisma.complimentaryMember.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          userId: true, label: true, note: true, monthsGranted: true, createdAt: true,
          user: { select: { name: true, phone: true, profilePicUrl: true, subscription: { select: { status: true, expiresAt: true } } } },
        },
      });
    },

    /** Live (not deleted) user by full phone, with the plan fields the grant needs. */
    async findUserByPhone(phone) {
      return prisma.user.findFirst({
        where: { phone, isDeleted: false },
        select: { id: true, name: true, subscription: { select: { status: true, expiresAt: true } } },
      });
    },

    /**
     * Mark the user free and (when expiresAt is set) extend their plan, atomically.
     * Adding someone again adds to their months. paidStartedAt is never touched: a free
     * plan is not a first payment.
     */
    async grant({ userId, months, label, note, adminId, expiresAt }) {
      await prisma.$transaction(async (tx) => {
        await tx.complimentaryMember.upsert({
          where: { userId },
          create: { userId, monthsGranted: months, label, note, grantedById: adminId },
          update: { monthsGranted: { increment: months }, ...(label ? { label } : {}), ...(note ? { note } : {}), grantedById: adminId },
        });
        if (expiresAt) {
          const data = { status: SUBSCRIPTION_STATUS.ACTIVE, expiresAt };
          await tx.subscription.upsert({ where: { userId }, update: data, create: { userId, ...data } });
        }
      });
    },

    /** Take the user off the free list (their plan time stays). @returns {Promise<boolean>} */
    async remove(userId) {
      const { count } = await prisma.complimentaryMember.deleteMany({ where: { userId } });
      return count > 0;
    },

    /** Drop the cached subscription so the paywall lifts immediately. */
    async invalidateSubCache(userId) {
      await delCachedSub(redis, userId);
    },
  };
}

module.exports = { createAdminComplimentaryRepository };
