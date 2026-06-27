'use strict';

const { VERIFICATION_DOC_TYPE } = require('@easecab/shared');

/** Snapshot columns that render a contacted card (never raw rawText/displayText). */
const CONTACTED_SELECT = Object.freeze({
  id: true, source: true, fromCityName: true, toCityName: true,
  vehicleType: true, revealedPhone: true, contactedAt: true,
  rideId: true, postedRideId: true, posterId: true, posterName: true,
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

    /**
     * Full profile + verification snapshot for the profile screen (Step 21b). Also pulls
     * the latest DL/RC submission per doc so the client can show submitted/approved/
     * rejected (the User dl/rcSubmitted booleans can't represent a rejection — admin
     * review only stamps the submission row).
     */
    async getProfile(userId) {
      const [user, submissions] = await prisma.$transaction([
        prisma.user.findUnique({ where: { id: userId }, select: PROFILE_SELECT }),
        prisma.verificationSubmission.findMany({
          where: { userId, docType: { in: [VERIFICATION_DOC_TYPE.DL, VERIFICATION_DOC_TYPE.RC] } },
          orderBy: { createdAt: 'desc' },
          select: { docType: true, status: true, rejectionReason: true },
        }),
      ]);
      return user ? { ...user, submissions } : null;
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
