'use strict';

/** Snapshot columns that render a contacted card (never raw rawText/displayText). */
const CONTACTED_SELECT = Object.freeze({
  id: true, source: true, fromCityName: true, toCityName: true,
  vehicleType: true, revealedPhone: true, contactedAt: true,
  rideId: true, postedRideId: true,
});

/** Profile + verification-display columns for GET/PATCH /me/profile (Step 21b). */
const PROFILE_SELECT = Object.freeze({
  id: true, phone: true, name: true, bio: true, baseCity: true, vehicleType: true,
  profilePicUrl: true, languagesSpoken: true, experience: true, workingCity: true,
  aadhaarVerified: true, dlSubmitted: true, rcSubmitted: true, verificationStatus: true,
  aadhaarLast4: true, carMake: true, carModel: true, carRegNo: true,
  carFrontUrl: true, carBackUrl: true,
});

/**
 * "My contacted rides" data access (CLAUDE.md §4 — DB only). Reads the durable
 * RideContact snapshot, so rows survive the source ride's hard-delete.
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 */
function createMeRepository({ prisma }) {
  return {
    /**
     * One keyset page of the caller's snapshotted contacts, newest-first. `source IS
     * NOT NULL` excludes any pre-Step-19 rows (they have no snapshot and age out).
     */
    async listContactedByUser({ userId, contactedAt, id, limit }) {
      const where = { userId, source: { not: null } };
      if (contactedAt && id) {
        where.OR = [{ contactedAt: { lt: contactedAt } }, { contactedAt, id: { lt: id } }];
      }
      return prisma.rideContact.findMany({
        where,
        orderBy: [{ contactedAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: CONTACTED_SELECT,
      });
    },

    /** Full profile + verification snapshot for the profile screen (Step 21b). */
    async getProfile(userId) {
      return prisma.user.findUnique({ where: { id: userId }, select: PROFILE_SELECT });
    },

    /** Apply a validated profile patch; returns the refreshed profile snapshot. */
    async updateProfile(userId, data) {
      return prisma.user.update({ where: { id: userId }, data, select: PROFILE_SELECT });
    },

    /** Attach a single verified image URL/key to its User column (Step 21b). */
    async attachImage(userId, data) {
      return prisma.user.update({ where: { id: userId }, data, select: { id: true } });
    },

    /**
     * Soft-delete the caller (CLAUDE.md §7): flag the row; a cron hard-deletes after
     * 30 days. Logging back in within that window restores it (auth.service restoreUser).
     */
    async softDeleteUser(userId) {
      return prisma.user.update({
        where: { id: userId },
        data: { isDeleted: true, deletedAt: new Date() },
        select: { id: true },
      });
    },
  };
}

module.exports = { createMeRepository, CONTACTED_SELECT, PROFILE_SELECT };
