'use strict';

const { AppError, ERROR_CODES } = require('../../errors/AppError');
const { redisKey } = require('../../constants/redis');
const { CITY_RESOLVER, RESOLVE_STATUS, RESOLVE_LAYER } = require('../../constants/cityResolver');
const { normalizeCityText } = require('./normalize');

/** Build the namespaced cache key for a normalized string. */
function cacheKeyFor(normalized) {
  return redisKey(...CITY_RESOLVER.CACHE_KEY_PARTS, normalized);
}

/** Shape a resolved result. */
function resolvedResult(cityId, canonicalName, layer, confidence) {
  return { status: RESOLVE_STATUS.RESOLVED, cityId, canonicalName, layer, confidence };
}

/** Shape the unresolved result. */
function unresolvedResult() {
  return { status: RESOLVE_STATUS.UNRESOLVED, cityId: null, canonicalName: null, layer: null, confidence: 0 };
}

/**
 * Create a CityResolverService bound to injected clients.
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma - injected Prisma client
 * @param {object} deps.redis - injected ioredis-compatible client (get/set)
 * @param {object} [deps.logger=console] - logger with a `warn` method
 * @returns {{ resolve: (rawText: string) => Promise<object> }}
 */
function createCityResolver({ prisma, redis, logger = console } = {}) {
  if (!prisma) throw new Error('createCityResolver requires a prisma client');
  if (!redis) throw new Error('createCityResolver requires a redis client');

  /** Layer 1 read — returns a resolved result or null. Never throws (degrades). */
  async function readCache(key) {
    try {
      const raw = await redis.get(key);
      if (!raw) return null;
      const { cityId, canonicalName } = JSON.parse(raw);
      return resolvedResult(cityId, canonicalName, RESOLVE_LAYER.CACHE, 1);
    } catch (err) {
      logger.warn?.({ err: err.message }, 'cityResolver: redis get failed — degrading to DB');
      return null;
    }
  }

  /** Layer 1 write-through for positive resolutions only. Never throws. */
  async function writeCache(key, cityId, canonicalName) {
    try {
      await redis.set(key, JSON.stringify({ cityId, canonicalName }), 'EX', CITY_RESOLVER.CACHE_TTL_SECONDS);
    } catch (err) {
      logger.warn?.({ err: err.message }, 'cityResolver: redis set failed (non-fatal)');
    }
  }

  /**
   * Layer 2 — case-insensitive exact match against alias_text then canonical_name.
   * @param {string} normalized
   * @returns {Promise<{cityId: string, canonicalName: string} | null>}
   */
  async function exactMatch(normalized) {
    const alias = await prisma.cityAlias.findFirst({
      where: { aliasText: { equals: normalized, mode: 'insensitive' } },
      select: { cityId: true, city: { select: { canonicalName: true } } },
    });
    if (alias) return { cityId: alias.cityId, canonicalName: alias.city.canonicalName };

    const city = await prisma.city.findFirst({
      where: { canonicalName: { equals: normalized, mode: 'insensitive' }, isActive: true },
      select: { id: true, canonicalName: true },
    });
    if (city) return { cityId: city.id, canonicalName: city.canonicalName };

    return null;
  }

  /**
   * Resolve a raw city string through the layers (first hit wins).
   * @param {string} rawText
   * @returns {Promise<object>} resolve result
   */
  async function resolve(rawText) {
    const normalized = normalizeCityText(rawText);
    if (normalized.length < CITY_RESOLVER.MIN_LENGTH) return unresolvedResult();

    const key = cacheKeyFor(normalized);
    try {
      const cached = await readCache(key);
      if (cached) return cached;

      const exact = await exactMatch(normalized);
      if (exact) {
        await writeCache(key, exact.cityId, exact.canonicalName);
        return resolvedResult(exact.cityId, exact.canonicalName, RESOLVE_LAYER.EXACT, 1);
      }

      // Fuzzy + unresolved layers are added in Tasks 6–7.
      return unresolvedResult();
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(ERROR_CODES.INTERNAL_ERROR, 'City resolution failed', 500);
    }
  }

  return { resolve };
}

module.exports = { createCityResolver };
