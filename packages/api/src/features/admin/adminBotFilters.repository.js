'use strict';

const ENTRY_SELECT = Object.freeze({ id: true, list: true, value: true, createdAt: true });

/**
 * Admin bot-filter data access (CLAUDE.md §4 — Prisma only, no policy). Offset
 * pagination is acceptable for admin (§8).
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 */
function createAdminBotFiltersRepository({ prisma }) {
  return {
    /** @returns {Promise<{ rows: object[], total: number }>} one list's page + total. */
    async list({ list, page, limit, q }) {
      const where = { list, ...(q ? { value: { contains: q, mode: 'insensitive' } } : {}) };
      const [rows, total] = await prisma.$transaction([
        prisma.botFilterEntry.findMany({
          where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, select: ENTRY_SELECT,
        }),
        prisma.botFilterEntry.count({ where }),
      ]);
      return { rows, total };
    },

    /** @returns {Promise<number>} rows actually inserted (existing values are skipped). */
    async createMany(list, values) {
      const { count } = await prisma.botFilterEntry.createMany({
        data: values.map((value) => ({ list, value })),
        skipDuplicates: true,
      });
      return count;
    },

    /** @returns {Promise<object|null>} */
    async findById(id) {
      return prisma.botFilterEntry.findUnique({ where: { id }, select: ENTRY_SELECT });
    },

    /** @returns {Promise<object|null>} the entry whose value matches case-insensitively. */
    async findByValue(list, value) {
      return prisma.botFilterEntry.findFirst({
        where: { list, value: { equals: value, mode: 'insensitive' } }, select: ENTRY_SELECT,
      });
    },

    /** @returns {Promise<{ list: string, value: string }[]>} every entry of the given lists. */
    async listValues(lists) {
      return prisma.botFilterEntry.findMany({ where: { list: { in: lists } }, select: { list: true, value: true } });
    },

    /** @returns {Promise<number>} */
    async countByList(list) {
      return prisma.botFilterEntry.count({ where: { list } });
    },

    async remove(id) {
      await prisma.botFilterEntry.delete({ where: { id } });
    },
  };
}

module.exports = { createAdminBotFiltersRepository };
