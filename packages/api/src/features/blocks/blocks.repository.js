'use strict';

/**
 * Blocks data access (CLAUDE.md §4 — DB only). A block is one-directional in storage
 * (blocker → blocked) but enforced both ways at read time via `isBlockedBetween`.
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 */
function createBlocksRepository({ prisma }) {
  return {
    /** Idempotent block: a repeat block of the same target is a no-op (returns the row). */
    async createBlock({ blockerId, blockedId }) {
      return prisma.userBlock.upsert({
        where: { blockerId_blockedId: { blockerId, blockedId } },
        create: { blockerId, blockedId },
        update: {},
        select: { id: true, createdAt: true },
      });
    },

    /** The caller's blocks, newest first, joined to each blocked user's display fields. */
    async listBlocks(blockerId) {
      return prisma.userBlock.findMany({
        where: { blockerId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          blockedId: true,
          createdAt: true,
          blocked: { select: { name: true, profilePicUrl: true, baseCity: true } },
        },
      });
    },

    /** Idempotent unblock: returns the number of rows removed (0 if it wasn't blocked). */
    async deleteBlock({ blockerId, blockedId }) {
      const { count } = await prisma.userBlock.deleteMany({ where: { blockerId, blockedId } });
      return count;
    },
  };
}

module.exports = { createBlocksRepository };
