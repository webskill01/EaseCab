'use strict';

/**
 * Public poster-profile columns (T3-2). A deliberately narrow projection — NEVER
 * phone or any PII (§3.10). What a verified driver chose to put on their own profile
 * plus the verification flags that drive the badge/stat rows.
 */
const PUBLIC_POSTER_SELECT = Object.freeze({
  id: true, name: true, profilePicUrl: true, baseCity: true, vehicleType: true,
  carMake: true, carModel: true, experience: true, bio: true, languagesSpoken: true,
  createdAt: true, aadhaarVerified: true, dlSubmitted: true, rcSubmitted: true,
  verificationStatus: true,
});

/**
 * Public-user data access (CLAUDE.md §4 — DB only).
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 */
function createUsersRepository({ prisma }) {
  return {
    /** A non-deleted user's public columns, or null. Soft-deleted users are invisible. */
    async getPublicProfile(id) {
      return prisma.user.findFirst({ where: { id, isDeleted: false }, select: PUBLIC_POSTER_SELECT });
    },
  };
}

module.exports = { createUsersRepository, PUBLIC_POSTER_SELECT };
