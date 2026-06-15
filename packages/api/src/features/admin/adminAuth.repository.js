'use strict';

const { redisKey } = require('@easecab/shared');
const { fixedWindowIncr } = require('../../lib/rateLimit');

/**
 * Admin auth data access (CLAUDE.md §4/§6) — Prisma reads the `admin_users` table
 * ONLY (never `users`), plus a Redis login-attempt counter. Repository layer: DB/cache
 * calls only, no business decisions (the service decides; this just reads/writes).
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 * @param {import('ioredis').Redis} deps.redis
 */
function createAdminAuthRepository({ prisma, redis }) {
  const loginKey = (email) => redisKey('admin', 'login', email);
  const loginIpKey = (ip) => redisKey('admin', 'login', 'ip', ip);

  return {
    /** @returns {Promise<object|null>} admin row by email (login lookup). */
    async findAdminByEmail(email) {
      return prisma.adminUser.findUnique({ where: { email } });
    },

    /** @returns {Promise<object|null>} admin row by id (refresh re-validation). */
    async findAdminById(id) {
      return prisma.adminUser.findFirst({ where: { id } });
    },

    /** Atomic fixed-window login-attempt counter per email (brute-force defence). */
    async incrementLoginCount(email, windowSec) {
      return fixedWindowIncr(redis, loginKey(email), windowSec);
    },

    /** Atomic fixed-window login-attempt counter per client IP (security-review H3 —
     *  stops one host spraying many emails to dodge the per-email cap). */
    async incrementLoginCountByIp(ip, windowSec) {
      return fixedWindowIncr(redis, loginIpKey(ip), windowSec);
    },
  };
}

module.exports = { createAdminAuthRepository };
