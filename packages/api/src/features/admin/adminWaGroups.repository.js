'use strict';

const { WA_GROUP_STATUS } = require('@easecab/shared');

const GROUP_SELECT = Object.freeze({
  id: true, jid: true, name: true, participants: true, enabled: true, lastSeenAt: true,
});

/** Prisma `where` for a name/JID search plus the on/off filter. */
function buildWhere({ q, status }) {
  return {
    ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { jid: { contains: q, mode: 'insensitive' } }] } : {}),
    ...(status === WA_GROUP_STATUS.ON ? { enabled: true } : {}),
    ...(status === WA_GROUP_STATUS.OFF ? { enabled: false } : {}),
  };
}

/**
 * Admin WhatsApp-groups data access (Phase 18 — Prisma only, no policy). Rows are
 * created by easecab-bot; admins only flip `enabled`. Offset pagination (admin, §8).
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 */
function createAdminWaGroupsRepository({ prisma }) {
  return {
    /** @returns {Promise<{ rows: object[], total: number, on: number, off: number }>} */
    async list({ page, limit, q, status }) {
      const where = buildWhere({ q, status });
      const [rows, total, on, off] = await prisma.$transaction([
        prisma.waGroup.findMany({
          where, orderBy: [{ name: 'asc' }, { jid: 'asc' }], skip: (page - 1) * limit, take: limit, select: GROUP_SELECT,
        }),
        prisma.waGroup.count({ where }),
        prisma.waGroup.count({ where: { enabled: true } }),
        prisma.waGroup.count({ where: { enabled: false } }),
      ]);
      return { rows, total, on, off };
    },

    /** @returns {Promise<object|null>} the updated group, or null if the id doesn't exist. */
    async setEnabled(id, enabled) {
      const { count } = await prisma.waGroup.updateMany({ where: { id }, data: { enabled } });
      return count === 0 ? null : prisma.waGroup.findUnique({ where: { id }, select: GROUP_SELECT });
    },

    /** @returns {Promise<number>} groups switched (all, or those matching `q`). */
    async setEnabledMany({ enabled, q }) {
      const { count } = await prisma.waGroup.updateMany({ where: buildWhere({ q }), data: { enabled } });
      return count;
    },
  };
}

module.exports = { createAdminWaGroupsRepository };
