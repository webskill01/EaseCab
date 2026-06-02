'use strict';

const { CITY_SEARCH } = require('@easecab/shared');

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
 */
function createCitiesService({ repo }) {
  return {
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
  };
}

module.exports = { createCitiesService, sanitizeQ };
