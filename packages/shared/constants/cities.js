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

module.exports = { CITY_SEARCH };
