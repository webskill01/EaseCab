'use strict';

const SESSION_SELECT = Object.freeze({
  id: true, slot: true, name: true, enabled: true, phone: true, ridesSaved: true, pairedAt: true, createdAt: true,
});

/** Prisma record-not-found (delete/update of a missing row). */
const PRISMA_NOT_FOUND = 'P2025';

/**
 * Admin WhatsApp-sessions data access (Phase 25 — Prisma only, no policy).
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 */
function createAdminWaSessionsRepository({ prisma }) {
  return {
    /** @returns {Promise<object[]>} every session, oldest first */
    list() {
      return prisma.waSession.findMany({ orderBy: { createdAt: 'asc' }, select: SESSION_SELECT });
    },

    /** @param {string[]} jids @returns {Promise<object[]>} known groups (name may be null) */
    groupsByJid(jids) {
      return prisma.waGroup.findMany({
        where: { jid: { in: jids } }, select: { jid: true, name: true, participants: true, enabled: true },
      });
    },

    /** @param {string[]} ids @returns {Promise<Record<string, string>>} city id -> name */
    async cityNames(ids) {
      const rows = await prisma.city.findMany({ where: { id: { in: ids } }, select: { id: true, canonicalName: true } });
      return Object.fromEntries(rows.map((c) => [c.id, c.canonicalName]));
    },

    /** @returns {Promise<number>} */
    count() {
      return prisma.waSession.count();
    },

    /** @param {string} id @returns {Promise<object|null>} */
    findById(id) {
      return prisma.waSession.findUnique({ where: { id }, select: SESSION_SELECT });
    },

    /** @param {string} slot @returns {Promise<object|null>} */
    findBySlot(slot) {
      return prisma.waSession.findUnique({ where: { slot }, select: SESSION_SELECT });
    },

    /** @param {{ slot: string, name: string }} data @returns {Promise<object>} */
    create(data) {
      return prisma.waSession.create({ data, select: SESSION_SELECT });
    },

    /** @returns {Promise<object|null>} the updated row, or null if the id doesn't exist */
    async update(id, data) {
      const { count } = await prisma.waSession.updateMany({ where: { id }, data });
      return count === 0 ? null : prisma.waSession.findUnique({ where: { id }, select: SESSION_SELECT });
    },

    /** @returns {Promise<object|null>} the deleted row, or null if the id doesn't exist */
    async remove(id) {
      try {
        return await prisma.waSession.delete({ where: { id }, select: SESSION_SELECT });
      } catch (err) {
        if (err && err.code === PRISMA_NOT_FOUND) return null;
        throw err;
      }
    },
  };
}

module.exports = { createAdminWaSessionsRepository };
