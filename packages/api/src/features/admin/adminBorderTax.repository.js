'use strict';

const { BORDER_TAX_KEYS: K, ADMIN_BORDER_TAX, ADMIN_STATISTICS } = require('@easecab/shared');

const DAY_MS = 86_400_000;
const istMidnight = (day) => new Date(`${day}T00:00:00+05:30`);

/** Filing row for the admin list. receiptKey only to tell if a PDF exists (never sent as is). */
const ROW_SELECT = Object.freeze({
  id: true, vehicleNo: true, stateCd: true, checkpost: true, seats: true, taxMode: true, status: true,
  taxPaise: true, failureCode: true, receiptNo: true, receiptKey: true, createdAt: true, paidAt: true,
  user: { select: { name: true, phone: true } },
});

/** Prisma where for the list filters. from/to are IST calendar days, inclusive. */
function filingsWhere({ state, status, from, to, who, q }) {
  const where = {};
  if (q) where.vehicleNo = { contains: q };
  if (state) where.stateCd = state;
  if (status) where.status = status;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = istMidnight(from);
    if (to) where.createdAt.lt = new Date(istMidnight(to).getTime() + DAY_MS);
  }
  const test = ADMIN_STATISTICS.EXCLUDED_PHONES;
  if (who === ADMIN_BORDER_TAX.WHO.REAL) where.user = { phone: { notIn: test } };
  if (who === ADMIN_BORDER_TAX.WHO.TEST) where.user = { phone: { in: test } };
  return where;
}

/**
 * Admin border-tax data access (Phase 26.8): filings list (offset, §8) + per-state pause flags (Redis).
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 * @param {import('ioredis').Redis} deps.redis
 */
function createAdminBorderTaxRepository({ prisma, redis }) {
  return {
    /**
     * Page of filings (newest first), total, and per-status count + amount over the whole filter.
     * @returns {Promise<{ rows: object[], total: number, byStatus: { status: string, count: number, paise: number }[] }>}
     */
    async list({ page, limit, ...filters }) {
      const where = filingsWhere(filters);
      const [rows, total, groups] = await prisma.$transaction([
        prisma.borderTaxRequest.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, select: ROW_SELECT }),
        prisma.borderTaxRequest.count({ where }),
        prisma.borderTaxRequest.groupBy({ by: ['status'], where, _count: { _all: true }, _sum: { taxPaise: true }, orderBy: { status: 'asc' } }),
      ]);
      const byStatus = groups.map((g) => ({ status: g.status, count: g._count._all, paise: g._sum.taxPaise || 0 }));
      return { rows, total, byStatus };
    },

    /** Pending-lock clear hashes for these filings ({} when none). @returns {Promise<object[]>} */
    async unlocks(ids) {
      if (!ids.length) return [];
      const pipe = redis.pipeline();
      ids.forEach((id) => pipe.hgetall(K.unlock(id)));
      return (await pipe.exec()).map(([, v]) => v || {});
    },

    /** @returns {Promise<?{ receiptKey: ?string, receiptNo: ?string }>} */
    async findReceipt(id) {
      return prisma.borderTaxRequest.findUnique({ where: { id }, select: { receiptKey: true, receiptNo: true } });
    },

    /** @returns {Promise<string[]>} states switched off for new filings */
    async pausedStates() {
      return redis.smembers(K.PAUSED);
    },

    /** Switch a state off (paused) or back on. */
    async setPaused(stateCd, paused) {
      await (paused ? redis.sadd(K.PAUSED, stateCd) : redis.srem(K.PAUSED, stateCd));
    },
  };
}

module.exports = { createAdminBorderTaxRepository, filingsWhere };
