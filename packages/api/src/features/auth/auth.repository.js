'use strict';

const { redisKey } = require('@easecab/shared');

/**
 * Auth data access — Prisma (users + nested trial subscription) and Redis (the OTP
 * rate-limit counters). Repository layer per CLAUDE.md §4: DB/cache calls only, no
 * business decisions (the service decides; this just reads/writes).
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 * @param {import('ioredis').Redis} deps.redis
 */
function createAuthRepository({ prisma, redis }) {
  const cooldownKey = (phone) => redisKey('otp', 'cooldown', phone);
  const countKey = (phone) => redisKey('otp', 'count', phone);

  return {
    /** @returns {Promise<number>} TTL secs of the resend-cooldown key (-2 if none). */
    async getResendCooldownTtl(phone) {
      return redis.ttl(cooldownKey(phone));
    },

    /** Increment the rolling hourly counter; set the window on the first hit only. */
    async incrementOtpCount(phone, windowSec) {
      const key = countKey(phone);
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSec);
      }
      return count;
    },

    /** Arm the resend cooldown for this phone. */
    async setResendCooldown(phone, cooldownSec) {
      await redis.set(cooldownKey(phone), '1', 'EX', cooldownSec);
    },

    /** Look up by phone WITHOUT an isDeleted filter (phone is @unique; a soft-deleted
     *  row must be found so the service can restore it instead of hitting the unique
     *  constraint on create). */
    async findUserByPhone(phone) {
      return prisma.user.findUnique({ where: { phone }, include: { subscription: true } });
    },

    /** Active (non-deleted) user by id — used by refresh. */
    async findActiveUserById(id) {
      return prisma.user.findFirst({ where: { id, isDeleted: false }, include: { subscription: true } });
    },

    /** Create a user with a nested 7-day trial subscription, atomically. */
    async createUserWithTrial(phone, trialExpiresAt) {
      return prisma.user.create({
        data: { phone, subscription: { create: { trialExpiresAt } } },
        include: { subscription: true },
      });
    },

    /** Undo a soft delete on returning sign-in. */
    async restoreUser(id) {
      return prisma.user.update({
        where: { id },
        data: { isDeleted: false, deletedAt: null },
        include: { subscription: true },
      });
    },
  };
}

module.exports = { createAuthRepository };
