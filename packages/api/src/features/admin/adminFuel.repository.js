'use strict';

const { FUEL_STATION_STATUS } = require('@easecab/shared');

const STATION_SELECT = Object.freeze({
  id: true, name: true, brand: true, lat: true, lng: true, address: true, city: true, stateCode: true,
  hasCng: true, hasPetrol: true, hasDiesel: true, status: true, source: true, cngConfirmedAt: true, createdAt: true,
  addedBy: { select: { id: true, name: true } },
});

const OPEN = Object.freeze({ resolvedAt: null });

/**
 * Admin fuel review data access (Phase 30 — Prisma only). Offset pagination (admin, §8).
 * @param {{ prisma: import('@prisma/client').PrismaClient }} deps
 */
function createAdminFuelRepository({ prisma }) {
  return {
    /** Driver-added stations waiting for review, oldest first. */
    async listPending({ page, limit }) {
      const where = { status: FUEL_STATION_STATUS.PENDING };
      const [rows, total] = await prisma.$transaction([
        prisma.fuelStation.findMany({ where, orderBy: { createdAt: 'asc' }, skip: (page - 1) * limit, take: limit, select: STATION_SELECT }),
        prisma.fuelStation.count({ where }),
      ]);
      return { rows, total };
    },

    /** Stations with at least one open driver report, each with its open reports. */
    async listReported({ page, limit }) {
      const where = { reports: { some: OPEN } };
      const [rows, total] = await prisma.$transaction([
        prisma.fuelStation.findMany({
          where, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * limit, take: limit,
          select: {
            ...STATION_SELECT,
            reports: { where: OPEN, orderBy: { createdAt: 'desc' }, select: { kind: true, createdAt: true, user: { select: { id: true, name: true } } } },
          },
        }),
        prisma.fuelStation.count({ where }),
      ]);
      return { rows, total };
    },

    /** Badge counts for both tabs. */
    async counts() {
      const [pending, reports] = await prisma.$transaction([
        prisma.fuelStation.count({ where: { status: FUEL_STATION_STATUS.PENDING } }),
        prisma.fuelStation.count({ where: { reports: { some: OPEN } } }),
      ]);
      return { pending, reports };
    },

    /**
     * Apply the admin's change and close the station's open reports, atomically.
     * @returns {Promise<object|null>} the updated station, or null if the id doesn't exist.
     */
    async decide(id, data) {
      const { count } = await prisma.fuelStation.updateMany({ where: { id }, data });
      if (count === 0) return null;
      await prisma.fuelStationReport.updateMany({ where: { stationId: id, ...OPEN }, data: { resolvedAt: new Date() } });
      return prisma.fuelStation.findUnique({ where: { id }, select: STATION_SELECT });
    },
  };
}

module.exports = { createAdminFuelRepository };
