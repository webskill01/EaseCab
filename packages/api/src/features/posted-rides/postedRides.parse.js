'use strict';

const { extractCities, extractPhone, matchVehicle } = require('@easecab/shared');

const VOCAB_TTL_MS = 5 * 60 * 1000; // city list 5-min cache (CLAUDE.md §15)

/**
 * Read-only free-text parser for the Post-a-Ride paste flow (Step 20). Mirrors the
 * bot's ingest pipeline (extract → resolve), but returns a draft for the user to
 * confirm instead of persisting. Date/fare/time are NOT extracted (the user fills
 * them in the editable preview). Never throws on a resolver error — an unresolved
 * fragment is returned as raw so the create endpoint can fall back to its
 * `cityRaw` path.
 *
 * @param {object} deps
 * @param {{ listCityVocabulary(): Promise<string[]> }} deps.repo
 * @param {{ resolve(raw: string): Promise<{status: string, cityId: ?string, canonicalName: ?string}> }} deps.resolver
 * @param {import('pino').Logger} [deps.logger]
 */
function createPostParser({ repo, resolver, logger }) {
  let vocab = null;
  let loadedAt = 0;

  /** City vocabulary with a 5-min in-instance cache (small list, cheap to hold). */
  async function getVocab() {
    if (vocab && Date.now() - loadedAt < VOCAB_TTL_MS) return vocab;
    vocab = await repo.listCityVocabulary();
    loadedAt = Date.now();
    return vocab;
  }

  /**
   * Resolve one raw fragment to {cityId, cityName, cityRaw}. A null fragment → all
   * null; an unresolved/throwing resolve → raw preserved with a null id.
   * @param {?string} raw
   */
  async function resolveSide(raw) {
    if (!raw) return { cityId: null, cityName: null, cityRaw: null };
    try {
      const res = await resolver.resolve(raw);
      if (res && res.status === 'resolved') {
        return { cityId: res.cityId, cityName: res.canonicalName, cityRaw: raw };
      }
    } catch (err) {
      // The resolver may throw (e.g. a junk fragment) — non-fatal, keep the raw
      // fragment so create can use cityRaw (CLAUDE.md §4 — never swallow silently).
      logger?.warn?.({ err: err.message }, 'post parse: city resolve failed; keeping raw');
    }
    return { cityId: null, cityName: null, cityRaw: raw };
  }

  return {
    /**
     * @param {string} text - validated by postedRideParseSchema
     * @returns {Promise<{fromCityId: ?string, fromCityName: ?string, fromCityRaw: ?string,
     *   toCityId: ?string, toCityName: ?string, toCityRaw: ?string,
     *   vehicleType: ?string, phone: ?string}>}
     */
    async parse(text) {
      const cityNames = await getVocab();
      const { pickup, drop } = extractCities(text, cityNames);
      const [from, to] = await Promise.all([resolveSide(pickup), resolveSide(drop)]);
      const phone = extractPhone(text);
      return {
        fromCityId: from.cityId,
        fromCityName: from.cityName,
        fromCityRaw: from.cityRaw,
        toCityId: to.cityId,
        toCityName: to.cityName,
        toCityRaw: to.cityRaw,
        vehicleType: matchVehicle(text),
        phone: phone ? `+91${phone}` : null,
      };
    },
  };
}

module.exports = { createPostParser };
