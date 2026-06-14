'use strict';

/** User row for the admin directory (phone masked in the service — §10). */
const USER_SELECT = Object.freeze({
  id: true, name: true, phone: true, aadhaarVerified: true, verificationStatus: true,
  baseCity: true, vehicleType: true, createdAt: true, isDeleted: true, deletedAt: true,
  subscription: { select: { status: true, expiresAt: true, trialExpiresAt: true } },
});

/** Map the status filter to a `where.isDeleted` fragment (`all` → no filter). */
function statusWhere(status) {
  if (status === 'active') return { isDeleted: false };
  if (status === 'deleted') return { isDeleted: true };
  return {};
}

/**
 * Admin user-directory data access (CLAUDE.md §4 — Prisma only, no policy). Offset
 * pagination is acceptable for admin (§8). Soft-delete is flag-only.
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 */
function createAdminUsersRepository({ prisma }) {
  return {
    /**
     * Page of users (newest first) + total, filtered by status and optional `q`.
     * @returns {Promise<{ rows: object[], total: number }>}
     */
    async listUsers({ page, limit, status, q }) {
      const where = { ...statusWhere(status) };
      if (q) {
        where.OR = [
          { phone: { contains: q } },
          { name: { contains: q, mode: 'insensitive' } },
        ];
      }
      const [rows, total] = await prisma.$transaction([
        prisma.user.findMany({
          where, orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit, take: limit, select: USER_SELECT,
        }),
        prisma.user.count({ where }),
      ]);
      return { rows, total };
    },

    /** @returns {Promise<object|null>} user by id (existence check before action). */
    async findById(id) {
      return prisma.user.findUnique({ where: { id }, select: USER_SELECT });
    },

    /** Flip the soft-delete flag. delete → deletedAt=now; restore → deletedAt=null. */
    async setDeleted(id, isDeleted) {
      return prisma.user.update({
        where: { id },
        data: { isDeleted, deletedAt: isDeleted ? new Date() : null },
        select: USER_SELECT,
      });
    },
  };
}

module.exports = { createAdminUsersRepository, USER_SELECT };
