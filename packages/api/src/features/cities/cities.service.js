'use strict';

const { CITY_SEARCH, CITY_NEAREST, CITY_LIST, redisKey } = require('@easecab/shared');

const CITY_LIST_CACHE_KEY = redisKey('cities', 'all');

/**
 * Sanitize a typeahead query: lowercase, drop LIKE wildcards/escape chars so a
 * client can't inject `%`/`_` semantics into the prefix predicate, then trim.
 * @param {string} q
 * @returns {string}
 */
function sanitizeQ(q) {
  return q.toLowerCase().replace(/[%_\\]/g, '').trim();
}

/**
 * Cities business logic (CLAUDE.md §4). Thin: sanitize the query and short-circuit
 * if it falls below the minimum after sanitizing (e.g. a query of only `%%`),
 * otherwise delegate to the pg_trgm repo with the configured similarity floor.
 *
 * @param {object} deps
 * @param {ReturnType<import('./cities.repository').createCitiesRepository>} deps.repo
 * @param {import('ioredis').Redis} [deps.redis] - optional; caches the full city
 *   list (§15, 5-min TTL). Absent (or failing) → graceful fall-through to the DB.
 */
function createCitiesService({ repo, redis }) {
  return {
    /**
     * All active cities for the "All Locations" overlay (Batch C). Redis-cached
     * with the §15 TTL when a client is wired; any cache error degrades to the DB.
     * @returns {Promise<{ cities: { id: string, canonicalName: string, namePa: ?string, nameHi: ?string }[] }>}
     */
    async listAllCities() {
      if (redis) {
        try {
          const raw = await redis.get(CITY_LIST_CACHE_KEY);
          if (raw) return { cities: JSON.parse(raw) };
        } catch { /* cache miss/poison/down — fall through to the DB */ }
      }
      const cities = await repo.listAll();
      if (redis) {
        try {
          await redis.set(CITY_LIST_CACHE_KEY, JSON.stringify(cities), 'EX', CITY_LIST.CACHE_TTL_SEC);
        } catch { /* best-effort cache write */ }
      }
      return { cities };
    },

    /**
     * @param {{ q: string, limit: number }} query
     * @returns {Promise<{ cities: { id: string, canonicalName: string }[] }>}
     */
    async searchCities({ q, limit }) {
      const clean = sanitizeQ(q);
      if (clean.length < CITY_SEARCH.MIN_QUERY_LEN) return { cities: [] };
      const cities = await repo.searchCities({ q: clean, limit, floor: CITY_SEARCH.SIMILARITY_FLOOR });
      return { cities };
    },

    /**
     * Nearest active city to a device location (Step 23). Thin: delegate to the
     * repo with the configured radius cap; returns `{ city: null }` past the cap.
     * @param {{ lat: number, lng: number }} coords
     * @returns {Promise<{ city: { id: string, canonicalName: string, distanceKm: number } | null }>}
     */
    async nearestCity({ lat, lng }) {
      const city = await repo.findNearest({ lat, lng, maxRadiusKm: CITY_NEAREST.MAX_RADIUS_KM });
      return { city };
    },
  };
}

module.exports = { createCitiesService, sanitizeQ };
