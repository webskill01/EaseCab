'use strict';

/**
 * CityResolverService tuning constants (Build Order Step 5).
 * Fuzzy thresholds implement the locked "two-band + winner-gap" rule
 * (DECISIONS.md 2026-05-31). No magic numbers in the service (CLAUDE.md §5).
 */
const CITY_RESOLVER = Object.freeze({
  CACHE_TTL_SECONDS: 86400, // 24h — positive resolutions only
  CACHE_KEY_PARTS: Object.freeze(['city', 'resolve']), // redisKey('city','resolve',<normalized>)
  MIN_LENGTH: 2, // normalized strings shorter than this resolve to unresolved with no DB hit
  FUZZY_QUEUE_FLOOR: 0.3, // pg_trgm similarity below this → queue with no suggestion
  FUZZY_AUTO_ACCEPT: 0.55, // best similarity must reach this to be eligible for auto-accept
  FUZZY_WINNER_GAP: 0.1, // best must beat the 2nd-best city by this margin to auto-accept
});

/** resolve() result.status values. */
const RESOLVE_STATUS = Object.freeze({ RESOLVED: 'resolved', UNRESOLVED: 'unresolved' });

/** resolve() result.layer values (which layer produced a resolved hit). */
const RESOLVE_LAYER = Object.freeze({ CACHE: 'cache', EXACT: 'exact', FUZZY: 'fuzzy' });

module.exports = { CITY_RESOLVER, RESOLVE_STATUS, RESOLVE_LAYER };
