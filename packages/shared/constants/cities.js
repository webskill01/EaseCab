'use strict';

/**
 * City typeahead bounds (Step 13). Server requires q length >= MIN_QUERY_LEN
 * before hitting the DB; results are top-N (DEFAULT=MAX=10) ranked by prefix +
 * pg_trgm similarity above SIMILARITY_FLOOR (low, for as-you-type tolerance).
 */
const CITY_SEARCH = Object.freeze({
  MIN_QUERY_LEN: 2,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 10,
  SIMILARITY_FLOOR: 0.2,
});

/**
 * Nearest-city suggestion (Step 23). The geo→city lookup ignores cities beyond
 * MAX_RADIUS_KM so a user outside the PB/HR/NCR footprint gets `null` (manual pick)
 * rather than a meaningless far suggestion.
 */
const CITY_NEAREST = Object.freeze({
  MAX_RADIUS_KM: 150,
  CANDIDATES: 5,
  // How far a place "reaches" from its centre point: a city spreads km past its centre,
  // so a fix inside Patiala must not snap to Sanaur just because Sanaur's dot is nearer.
  REACH_KM: Object.freeze({ metro: 15, city: 8, town: 2, village: 1, landmark: 0.5 }),
});

/**
 * Full active-city list (Batch C — the "All Locations" overlay). Cached in Redis
 * with the §15 5-minute TTL; cities are seeded/near-static so the TTL is the only
 * staleness bound (no explicit invalidation hook).
 */
const CITY_LIST = Object.freeze({ CACHE_TTL_SEC: 300 });

module.exports = { CITY_SEARCH, CITY_NEAREST, CITY_LIST };
