'use strict';

/** Snapshot columns that render a contacted card (never raw rawText/displayText). */
const CONTACTED_SELECT = Object.freeze({
  id: true, source: true, fromCityName: true, toCityName: true,
  vehicleType: true, revealedPhone: true, contactedAt: true,
  rideId: true, postedRideId: true,
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
  };
}

module.exports = { createMeRepository, CONTACTED_SELECT };
