'use strict';

const {
  AppError, ERROR_CODES, FUEL, FUEL_TYPES, FUEL_REPORT_KIND, FUEL_SOURCES, FUEL_STATION_STATUS,
} = require('@easecab/shared');
const { decodePolyline } = require('../../lib/googleRoutes');
const corridor = require('./routeCorridor');

const EARTH_RADIUS_KM = 6371;
const rad = (d) => (d * Math.PI) / 180;
const KM_PER_DEG_LAT = rad(1) * EARTH_RADIUS_KM; // same sphere as haversine, so the box never undercuts the circle

/** Great-circle distance in km. */
function haversineKm(lat1, lng1, lat2, lng2) {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2
    + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** Bounding box that contains the radius circle around a point. */
function boxAround(lat, lng, radiusKm) {
  const dLat = radiusKm / KM_PER_DEG_LAT;
  const dLng = radiusKm / (KM_PER_DEG_LAT * Math.cos(rad(lat)));
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng };
}

const snap = (p) => ({ lat: Number(p.lat.toFixed(FUEL.ROUTE_SNAP_DP)), lng: Number(p.lng.toFixed(FUEL.ROUTE_SNAP_DP)) });

/**
 * Fuel station finder business logic (Phase 30).
 * @param {{
 *   repo: ReturnType<import('./fuel.repository').createFuelRepository>,
 *   routes?: ReturnType<import('../../lib/googleRoutes').createGoogleRoutesClient> | null,
 *   logger?: import('pino').Logger,
 * }} deps
 */
function createFuelService({ repo, routes = null, logger }) {
  /** City id → snapped map point; NOT_FOUND when the city has no coordinates. */
  async function cityPoint(id) {
    const p = await repo.findCityPoint(id);
    if (!p) throw AppError.fromCode(ERROR_CODES.NOT_FOUND, 'city has no location');
    return snap(p);
  }

  /**
   * Road routes (main + Google's alternatives) from cache or Google; one straight line
   * (approx) when Google is off or fails, so the driver still gets pumps.
   * @returns {Promise<Array<{ pts: number[][], distanceKm: ?number, durationMin: ?number, label: ?string, approx: boolean }>>}
   */
  async function roadRoutes(from, to) {
    let list = await repo.getRoute(from, to);
    if (!list && routes) {
      try {
        list = await routes.computeRoutes(from, to);
        if (list.length) await repo.setRoute(from, to, list);
      } catch (err) {
        logger?.warn({ err: err.message }, 'google routes failed; straight-line fallback');
      }
    }
    if (list?.length) {
      return list.map((r) => ({ pts: decodePolyline(r.encoded), distanceKm: r.distanceKm, durationMin: r.durationMin, label: r.label ?? null, approx: false }));
    }
    return [{ pts: corridor.straightLine(from, to), distanceKm: null, durationMin: null, label: null, approx: true }];
  }

  /** Active pumps selling `fuel` within the corridor, in road order. */
  async function pumpsAlong(pts, fuel) {
    const cum = corridor.cumulativeKm(pts);
    const parts = corridor.chunks(pts, cum, FUEL.ROUTE_CHUNK_KM, FUEL.ROUTE_CORRIDOR_KM);
    const found = new Map(); // id → station with its best (smallest) offKm
    const rows = await Promise.all(parts.map((c) => repo.findInBox({ fuel, ...c.box })));
    rows.forEach((list, k) => list.forEach((s) => {
      const hit = corridor.nearestOnRoute([s.lat, s.lng], pts, cum, parts[k].from, parts[k].to);
      if (hit.offKm <= FUEL.ROUTE_CORRIDOR_KM && hit.offKm < (found.get(s.id)?.offKm ?? Infinity)) found.set(s.id, { ...s, ...hit });
    }));
    const round = (n) => Math.round(n * 10) / 10;
    return [...found.values()]
      .sort((a, b) => a.alongKm - b.alongKm)
      .slice(0, FUEL.ROUTE_LIMIT)
      .map((s) => ({ ...s, alongKm: round(s.alongKm), offKm: round(s.offKm) }));
  }

  return {
    /**
     * Pumps along each road option from pickup (city or position) to the drop city; the
     * driver picks a road in the app, so every option carries its own pumps.
     * EXPLAIN ANALYZE: one findInBox per ~25 km piece per option, same index as nearby().
     */
    async alongRoute({ fromCityId, fromLat, fromLng, toCityId, fuel }) {
      const [from, to] = await Promise.all([
        fromCityId ? cityPoint(fromCityId) : snap({ lat: fromLat, lng: fromLng }),
        cityPoint(toCityId),
      ]);
      const options = await roadRoutes(from, to);
      const list = await Promise.all(options.map(async ({ pts, ...meta }) => ({
        ...meta, points: corridor.downsample(pts, FUEL.ROUTE_DRAW_POINTS), stations: await pumpsAlong(pts, fuel),
      })));
      return { from, to, routes: list };
    },

    /** A city's pumps: nearest to its centre first (same radius as "near me"). */
    async inCity({ cityId, fuel, radiusKm }) {
      const center = await cityPoint(cityId);
      return { center, stations: await this.nearby({ ...center, fuel, radiusKm }) };
    },

    /** Nearest active stations selling `fuel`, closest first, capped at FUEL.NEARBY_LIMIT. */
    async nearby({ lat, lng, fuel, radiusKm }) {
      const rows = await repo.findInBox({ fuel, ...boxAround(lat, lng, radiusKm) });
      return rows
        .map((s) => ({ ...s, distanceKm: Math.round(haversineKm(lat, lng, s.lat, s.lng) * 10) / 10 }))
        .filter((s) => s.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, FUEL.NEARBY_LIMIT);
    },

    /** A driver adds a missing station; it waits in the admin queue until approved. */
    async addStation(userId, { name, brand, lat, lng, fuels, address }) {
      return repo.createStation({
        name, brand, lat, lng, address: address || null,
        hasCng: fuels.includes(FUEL_TYPES.CNG),
        hasPetrol: fuels.includes(FUEL_TYPES.PETROL),
        hasDiesel: fuels.includes(FUEL_TYPES.DIESEL),
        source: FUEL_SOURCES.DRIVER,
        status: FUEL_STATION_STATUS.PENDING,
        addedById: userId,
      });
    },

    /**
     * A driver's report on a station. "CNG mili" on a known CNG station just refreshes
     * its confirmed time (nothing for the admin); anything else waits for review.
     * @returns {Promise<{ stationId: string, kind: string, applied: boolean }>}
     */
    async report(userId, stationId, kind) {
      const station = await repo.findStation(stationId);
      if (!station || station.status !== FUEL_STATION_STATUS.ACTIVE) {
        throw AppError.fromCode(ERROR_CODES.NOT_FOUND, 'station not found');
      }
      const applied = kind === FUEL_REPORT_KIND.CNG_YES && station.hasCng;
      await repo.upsertReport({ stationId, userId, kind, resolvedAt: applied ? new Date() : null });
      if (applied) await repo.confirmCng(stationId);
      return { stationId, kind, applied };
    },
  };
}

module.exports = { createFuelService, haversineKm, boxAround };
