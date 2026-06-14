'use strict';

const { ALIAS_SOURCE, normalizeCityText } = require('@easecab/shared');

/** Queue row for the admin city-string review list (Step 24e). */
const QUEUE_SELECT = Object.freeze({
  id: true, rawText: true, occurrenceCount: true, createdAt: true,
  suggestedCity: { select: { id: true, canonicalName: true } },
});

/**
 * Admin city-string data access (CLAUDE.md §4 — Prisma only, no policy). The queue
 * is the set of unreviewed rows (`reviewedAt IS NULL`); resolving writes a manual
 * city_aliases row (CityResolverService layer-2 exact match) and stamps the row
 * reviewed. Offset pagination is acceptable for admin (§8).
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 */
function createAdminCityStringsRepository({ prisma }) {
  return {
    /**
     * Page of unreviewed strings (most frequent, then newest) + total.
     * @returns {Promise<{ rows: object[], total: number }>}
     */
    async listQueue({ page, limit }) {
      const where = { reviewedAt: null };
      const [rows, total] = await prisma.$transaction([
        prisma.unresolvedCityString.findMany({
          where,
          orderBy: [{ occurrenceCount: 'desc' }, { createdAt: 'desc' }],
          skip: (page - 1) * limit, take: limit, select: QUEUE_SELECT,
        }),
        prisma.unresolvedCityString.count({ where }),
      ]);
      return { rows, total };
    },

    /** @returns {Promise<object|null>} the row only if it exists and is unreviewed. */
    async findUnreviewed(id) {
      return prisma.unresolvedCityString.findFirst({ where: { id, reviewedAt: null }, select: QUEUE_SELECT });
    },

    /** @returns {Promise<boolean>} whether `cityId` refers to a real, active city
     * (db-review L2 — never alias a string to an inactive city; exactMatch on the
     * city table filters isActive but the alias table does not). */
    async cityExists(cityId) {
      const city = await prisma.city.findFirst({ where: { id: cityId, isActive: true }, select: { id: true } });
      return city !== null;
    },

    /**
     * Resolve: create a manual alias for `rawText` and mark the row reviewed in one
     * transaction (both succeed or neither). A duplicate alias surfaces as Prisma
     * P2002 — the caller treats that as already-resolved and marks reviewed instead.
     * rawText is re-normalized defensively (db-review M2) so the stored alias is
     * exactly the form CityResolverService.exactMatch will look up, regardless of how
     * the unresolved row was inserted upstream.
     */
    async resolveTx(id, cityId, rawText) {
      const aliasText = normalizeCityText(rawText) || rawText;
      return prisma.$transaction([
        prisma.cityAlias.create({ data: { cityId, aliasText, source: ALIAS_SOURCE.MANUAL } }),
        prisma.unresolvedCityString.update({ where: { id }, data: { reviewedAt: new Date() } }),
      ]);
    },

    /** Stamp the row reviewed (dismiss, or the duplicate-alias fallback). */
    async markReviewed(id) {
      return prisma.unresolvedCityString.update({ where: { id }, data: { reviewedAt: new Date() } });
    },
  };
}

module.exports = { createAdminCityStringsRepository, QUEUE_SELECT };
