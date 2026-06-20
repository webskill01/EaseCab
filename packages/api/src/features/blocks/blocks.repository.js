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
  };
}

module.exports = { createBlocksRepository };
