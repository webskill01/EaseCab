'use strict';

const { z } = require('zod');
const { CITY_SEARCH } = require('../constants/cities');

/** City typeahead query — q (>= MIN_QUERY_LEN) + clamped limit (default = max = 10). */
const citySearchQuerySchema = z.object({
  q: z.string().trim().min(CITY_SEARCH.MIN_QUERY_LEN).max(80),
  limit: z.coerce.number().int().min(1).max(CITY_SEARCH.MAX_LIMIT).default(CITY_SEARCH.DEFAULT_LIMIT),
});

/** Geo → nearest city (Step 23). Bounded WGS84 lat/lng; coerced from query strings. */
const citiesNearestQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

module.exports = { citySearchQuerySchema, citiesNearestQuerySchema };
