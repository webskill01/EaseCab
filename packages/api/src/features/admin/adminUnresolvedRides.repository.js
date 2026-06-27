'use strict';

const { RIDE_STATUS } = require('@easecab/shared');

/** Visible-feed statuses a ride can sit in while still missing a city. */
const VISIBLE_STATUSES = Object.freeze([RIDE_STATUS.FRESH, RIDE_STATUS.BOOKED]);

/** Masked queue row — never the phone or raw WA text (§10 exposure boundary). The
 * raw pickup/drop strings are shown so the admin can pick the right city. */
const QUEUE_SELECT = Object.freeze({
  id: true, displayText: true, pickupRaw: true, dropRaw: true,
  vehicleType: true, receivedAt: true,
  pickupCity: { select: { id: true, canonicalName: true } },
  dropCity: { select: { id: true, canonicalName: true } },
});

/** Live ride still missing at least one city endpoint. */
function unresolvedWhere() {
  return {
    status: { in: VISIBLE_STATUSES },
    expiresAt: { gt: new Date() },
    OR: [{ pickupCityId: null }, { dropCityId: null }],
  };
}

/**
 * Admin unresolved-rides data access (CLAUDE.md §4 — Prisma only, no policy). The
 * queue is the set of live bot rides whose pickup or drop city the CityResolver
 * couldn't pin down (FK null, raw string kept). Resolving sets the FK; hiding drops
 * the ride from the feed. Offset pagination is acceptable for admin (§8).
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 */
function createAdminUnresolvedRidesRepository({ prisma }) {
  return {
    /**
     * Page of live rides missing a city (newest first) + total.
     * @returns {Promise<{ rows: object[], total: number }>}
     */
    async listQueue({ page, limit }) {
      const where = unresolvedWhere();
      const [rows, total] = await prisma.$transaction([
        prisma.ride.findMany({
          where, orderBy: { receivedAt: 'desc' },
          skip: (page - 1) * limit, take: limit, select: QUEUE_SELECT,
        }),
        prisma.ride.count({ where }),
      ]);
      return { rows, total };
    },

    /**
     * The ride only if it is live AND still missing a city — returns just the two
     * FKs so the service can confirm the targeted side is actually unset.
     * @returns {Promise<{ id: string, pickupCityId: ?string, dropCityId: ?string }|null>}
     */
    async findActionable(id) {
      return prisma.ride.findFirst({
        where: { id, ...unresolvedWhere() },
        select: { id: true, pickupCityId: true, dropCityId: true },
      });
    },

    /** @returns {Promise<boolean>} whether `cityId` is a real, active city. */
    async cityExists(cityId) {
      const city = await prisma.city.findFirst({ where: { id: cityId, isActive: true }, select: { id: true } });
      return city !== null;
    },

    /** Set one endpoint's city FK (`field` = 'pickupCityId' | 'dropCityId'). */
    async setCity(id, field, cityId) {
      return prisma.ride.update({ where: { id }, data: { [field]: cityId } });
    },

    /** Take the ride down (drops from the feed; same status the reports queue uses). */
    async hide(id) {
      return prisma.ride.update({ where: { id }, data: { status: RIDE_STATUS.HIDDEN } });
    },
  };
}

module.exports = { createAdminUnresolvedRidesRepository, QUEUE_SELECT };
