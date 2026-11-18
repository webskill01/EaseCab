'use strict';

const { WA_INVITE_STATUS } = require('@easecab/shared');

const LINK_SELECT = Object.freeze({
  id: true, code: true, status: true, groupJid: true, name: true, size: true,
  seenCount: true, sourceGroupJid: true, firstSeenAt: true, lastSeenAt: true,
});

/**
 * Caught group links data access (Phase 29 — Prisma only). Rows are written by
 * easecab-bot; the admin only avoids / restores. Offset pagination (admin, §8).
 * @param {{ prisma: import('@prisma/client').PrismaClient }} deps
 */
function createAdminWaInvitesRepository({ prisma }) {
  return {
    /** One status tab, newest sighting first, plus every tab's count. */
    async list({ page, limit, q, status }) {
      const where = { status, ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}) };
      const [rows, total, grouped] = await prisma.$transaction([
        prisma.waInviteLink.findMany({ where, orderBy: [{ lastSeenAt: 'desc' }], skip: (page - 1) * limit, take: limit, select: LINK_SELECT }),
        prisma.waInviteLink.count({ where }),
        prisma.waInviteLink.groupBy({ by: ['status'], _count: { _all: true }, orderBy: { status: 'asc' } }),
      ]);
      const counts = Object.fromEntries(Object.values(WA_INVITE_STATUS).map((s) => [s, 0]));
      for (const g of grouped) counts[g.status] = g._count._all;
      return { rows, total, counts };
    },

    /** @returns {Promise<object|null>} the updated link, or null if the id doesn't exist. */
    async setStatus(id, status) {
      const { count } = await prisma.waInviteLink.updateMany({ where: { id }, data: { status } });
      return count === 0 ? null : prisma.waInviteLink.findUnique({ where: { id }, select: LINK_SELECT });
    },
  };
}

module.exports = { createAdminWaInvitesRepository };
