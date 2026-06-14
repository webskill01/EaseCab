'use strict';

const { AppError, ERROR_CODES, CITY_STRING_ACTION } = require('@easecab/shared');

/**
 * Admin city-string business logic (CLAUDE.md §4). Resolving aliases an unreviewed
 * string to a city (feeding CityResolverService) and marks it reviewed; dismissing
 * just marks it reviewed. Forward-looking only — original rides are not re-processed
 * (12h TTL; see spec 2026-06-15). No resolver cache bust is needed: unresolved
 * strings are never cached, so the next resolve() exact-matches the new alias.
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminCityStrings.repository').createAdminCityStringsRepository>} deps.repo
 */
function createAdminCityStringsService({ repo }) {
  /** Alias the row to a city; a pre-existing alias (P2002) is treated as done. */
  async function resolve(id, cityId, rawText) {
    if (!(await repo.cityExists(cityId))) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
    try {
      await repo.resolveTx(id, cityId, rawText);
    } catch (err) {
      if (err && err.code === 'P2002') return repo.markReviewed(id);
      throw err;
    }
  }

  return {
    /** Offset-paginated queue of unreviewed strings (most frequent first). */
    async list({ page, limit }) {
      const { rows, total } = await repo.listQueue({ page, limit });
      return { items: rows, total, page, limit };
    },

    /**
     * Resolve (alias → city) or dismiss the row. NOT_FOUND if it is gone or already
     * reviewed, or (on resolve) if the target city does not exist.
     *
     * The findUnreviewed() pre-check is deliberate (db-review H2): it short-circuits
     * already-reviewed rows to a clean 404. A small TOCTOU window remains between this
     * read and resolveTx — if the row is reviewed concurrently, resolveTx's update
     * rolls the whole transaction back (no orphan alias) and the caller gets a 500.
     * Acceptable for an admin-only, low-concurrency flow — do not remove the pre-check.
     */
    async act(id, { action, cityId }) {
      const row = await repo.findUnreviewed(id);
      if (!row) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      if (action === CITY_STRING_ACTION.RESOLVE) {
        await resolve(id, cityId, row.rawText);
      } else {
        await repo.markReviewed(id);
      }
      return { id, action };
    },
  };
}

module.exports = { createAdminCityStringsService };
