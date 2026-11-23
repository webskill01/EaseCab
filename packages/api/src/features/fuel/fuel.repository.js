'use strict';

const { FUEL, FUEL_STATION_STATUS, FUEL_TYPES, redisKey } = require('@easecab/shared');

const FUEL_COLUMN = Object.freeze({
  [FUEL_TYPES.CNG]: 'hasCng',
  [FUEL_TYPES.PETROL]: 'hasPetrol',
  [FUEL_TYPES.DIESEL]: 'hasDiesel',
});

const NEARBY_SELECT = Object.freeze({
  id: true, name: true, brand: true, lat: true, lng: true, address: true, city: true,
  hasCng: true, hasPetrol: true, hasDiesel: true, cngConfirmedAt: true,
});

// ponytail: a lat/lng box over the (status, lat, lng) index, distance in JS. ~14k rows
// per state is tiny; move to PostGIS/earthdistance if the table passes ~500k rows.
const BOX_CAP = 3000;

/**
 * Fuel station data access (CLAUDE.md §4 — DB + cache only).
 * @param {{ prisma: import('@prisma/client').PrismaClient, redis?: import('ioredis').Redis }} deps
 */
function createFuelRepository({ prisma, redis }) {
  // 'routes' (was 'route'): the value is now the list of alternatives, so old single-route entries are never read.
  const routeKey = (from, to) => redisKey('fuel', 'routes', `${from.lat},${from.lng}`, `${to.lat},${to.lng}`);
  return {
    /**
     * Active stations selling `fuel` inside a lat/lng box.
     * EXPLAIN ANALYZE: pending — measure after the first real import (CLAUDE.md §15).
     * @param {{ fuel: string, minLat: number, maxLat: number, minLng: number, maxLng: number }} box
     */
    async findInBox({ fuel, minLat, maxLat, minLng, maxLng }) {
      return prisma.fuelStation.findMany({
        where: {
          status: FUEL_STATION_STATUS.ACTIVE,
          [FUEL_COLUMN[fuel]]: true,
          lat: { gte: minLat, lte: maxLat },
          lng: { gte: minLng, lte: maxLng },
        },
        select: NEARBY_SELECT,
        take: BOX_CAP,
      });
    },

    /** A city's map point, or null when the city is unknown / has no coordinates. @param {string} id */
    async findCityPoint(id) {
      const c = await prisma.city.findUnique({ where: { id }, select: { lat: true, lng: true } });
      return c && c.lat !== null && c.lng !== null ? { lat: Number(c.lat), lng: Number(c.lng) } : null;
    },

    /** Cached Google routes (main + alternatives) between two snapped points, or null. */
    async getRoute(from, to) {
      const raw = await redis.get(routeKey(from, to));
      return raw ? JSON.parse(raw) : null;
    },

    /** Cache Google's routes; expires inside Google's 30-day coordinate-caching limit. */
    async setRoute(from, to, routes) {
      await redis.set(routeKey(from, to), JSON.stringify(routes), 'EX', FUEL.ROUTE_CACHE_TTL_SEC);
    },

    /** Insert a station row. @param {object} data */
    async createStation(data) {
      return prisma.fuelStation.create({ data, select: { id: true, status: true, createdAt: true } });
    },

    /** @param {string} id */
    async findStation(id) {
      return prisma.fuelStation.findUnique({ where: { id }, select: { id: true, status: true, hasCng: true } });
    },

    /** One vote per (station, driver, kind); a repeat refreshes its time and resolution. */
    async upsertReport({ stationId, userId, kind, resolvedAt }) {
      return prisma.fuelStationReport.upsert({
        where: { stationId_userId_kind: { stationId, userId, kind } },
        create: { stationId, userId, kind, resolvedAt },
        update: { createdAt: new Date(), resolvedAt },
        select: { id: true },
      });
    },

    /** Stamp a driver's "CNG mili" on a station already known to sell CNG. @param {string} id */
    async confirmCng(id) {
      await prisma.fuelStation.update({ where: { id }, data: { cngConfirmedAt: new Date() } });
    },

    /**
     * Seed import upsert keyed on (source, sourceRef). A re-import refreshes the details
     * but never touches status (an admin-closed pump stays closed) and only ever turns
     * CNG on — a driver/admin "CNG on" survives an older file that says no.
     * @param {object} row fuelImportRowSchema output
     */
    async upsertImported(row) {
      const { source, sourceRef, hasCng, ...details } = row;
      return prisma.fuelStation.upsert({
        where: { source_sourceRef: { source, sourceRef } },
        create: { ...row },
        update: hasCng ? { ...details, hasCng } : details,
        select: { id: true },
      });
    },
  };
}

module.exports = { createFuelRepository };
