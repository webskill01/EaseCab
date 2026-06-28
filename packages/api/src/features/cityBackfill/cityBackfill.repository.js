'use strict';

const { RIDE_STATUS } = require('@easecab/shared');

/** Visible-feed statuses — a null-FK ride is only worth backfilling while live. */
const VISIBLE_STATUSES = Object.freeze([RIDE_STATUS.FRESH, RIDE_STATUS.BOOKED]);

/**
 * City-backfill data access (CLAUDE.md §4 — Prisma only, no policy). Reads the
 * pending unresolved-string queue + the city catalog, writes the AI alias, marks
 * the string reviewed, and patches live rides' null city FKs.
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 */
function createCityBackfillRepository({ prisma }) {
  return {
    /** Pending (not-yet-reviewed) strings seen >= minOccurrence, busiest first. */
    async listPending({ minOccurrence, limit }) {
      return prisma.unresolvedCityString.findMany({
        where: { reviewedAt: null, occurrenceCount: { gte: minOccurrence } },
        orderBy: { occurrenceCount: 'desc' },
        take: limit,
        select: { rawText: true, suggestedCityId: true },
      });
    },

    /** The resolvable city catalog (public names only) for LLM grounding. */
    async listActiveCities() {
      return prisma.city.findMany({
        where: { isActive: true },
        select: { id: true, canonicalName: true },
      });
    },

    /**
     * Write the AI-resolved alias so layer-2 exact-match resolves this string
     * instantly forever after. Idempotent on the @@unique([aliasText, cityId]).
     */
    async upsertAlias(cityId, aliasText) {
      return prisma.cityAlias.upsert({
        where: { aliasText_cityId: { aliasText, cityId } },
        create: { cityId, aliasText, source: 'ai' },
        update: {},
      });
    },

    /** Take the string out of the admin queue (mirrors a resolve/dismiss). */
    async markStringReviewed(rawText) {
      return prisma.unresolvedCityString.update({
        where: { rawText },
        data: { reviewedAt: new Date() },
      });
    },

    /** Live rides still missing a city endpoint (raw fragments for re-resolution). */
    async listUnresolvedRides({ limit }) {
      return prisma.ride.findMany({
        where: {
          status: { in: VISIBLE_STATUSES },
          expiresAt: { gt: new Date() },
          OR: [{ pickupCityId: null }, { dropCityId: null }],
        },
        take: limit,
        select: { id: true, pickupCityId: true, dropCityId: true, pickupRaw: true, dropRaw: true },
      });
    },

    /** Fill one endpoint's FK (`field` = 'pickupCityId' | 'dropCityId'). */
    async patchRideCity(id, field, cityId) {
      return prisma.ride.update({ where: { id }, data: { [field]: cityId } });
    },
  };
}

module.exports = { createCityBackfillRepository };
