'use strict';

/**
 * Cities data access (CLAUDE.md §4 — DB only). `searchCities` is the typeahead
 * query: it reuses the CityResolver's pg_trgm pattern (UNION over canonical names
 * + aliases, GROUP BY city), but instead of auto-picking one winner it returns the
 * top-N ranked list. Prefix matches (`LIKE q%`) are surfaced first so 2-3 char
 * fragments still produce suggestions where raw trigram similarity is weak, then
 * by similarity. All inputs are bound params (injection-safe).
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 */
function createCitiesRepository({ prisma }) {
  return {
    /**
     * @param {{ q: string, limit: number, floor: number }} args - q is pre-sanitized
     *   (lowercased, LIKE specials stripped) by the service.
     * @returns {Promise<{ id: string, canonicalName: string }[]>}
     */
    async searchCities({ q, limit, floor }) {
      const rows = await prisma.$queryRaw`
        SELECT city_id, canonical_name
        FROM (
          SELECT c.id AS city_id, c.canonical_name AS canonical_name,
                 similarity(lower(c.canonical_name), ${q}) AS sim,
                 (lower(c.canonical_name) LIKE ${q} || '%') AS pfx
          FROM cities c
          WHERE c.is_active = true
          UNION ALL
          SELECT ca.city_id AS city_id, c.canonical_name AS canonical_name,
                 similarity(lower(ca.alias_text), ${q}) AS sim,
                 (lower(ca.alias_text) LIKE ${q} || '%') AS pfx
          FROM city_aliases ca
          JOIN cities c ON c.id = ca.city_id
          WHERE c.is_active = true
        ) m
        WHERE m.sim >= ${floor} OR m.pfx = true
        GROUP BY city_id, canonical_name
        ORDER BY bool_or(pfx) DESC, max(sim) DESC, canonical_name ASC
        LIMIT ${limit}
      `;
      return rows.map((r) => ({ id: r.city_id, canonicalName: r.canonical_name }));
    },

    /**
     * Closest active city to (lat,lng) with non-null coords, within maxRadiusKm.
     * Haversine (great-circle, km) computed in SQL; all inputs are bound params.
     * @param {{ lat: number, lng: number, maxRadiusKm: number }} args
     * @returns {Promise<{ id: string, canonicalName: string, distanceKm: number } | null>}
     */
    async findNearest({ lat, lng, maxRadiusKm }) {
      const rows = await prisma.$queryRaw`
        SELECT id AS city_id, canonical_name, distance_km FROM (
          SELECT c.id, c.canonical_name,
            6371 * acos(LEAST(1, GREATEST(-1,
              cos(radians(${lat})) * cos(radians(c.lat::float8)) *
              cos(radians(c.lng::float8) - radians(${lng})) +
              sin(radians(${lat})) * sin(radians(c.lat::float8))
            ))) AS distance_km
          FROM cities c
          WHERE c.is_active = true AND c.lat IS NOT NULL AND c.lng IS NOT NULL
        ) d
        WHERE d.distance_km <= ${maxRadiusKm}
        ORDER BY d.distance_km ASC
        LIMIT 1
      `;
      if (rows.length === 0) return null;
      const r = rows[0];
      return { id: r.city_id, canonicalName: r.canonical_name, distanceKm: Number(r.distance_km) };
    },
  };
}

module.exports = { createCitiesRepository };
