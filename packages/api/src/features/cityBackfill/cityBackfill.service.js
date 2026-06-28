'use strict';

const { CITY_LLM, CITY_RESOLVER, RESOLVE_STATUS } = require('@easecab/shared');

/** Defense-in-depth PII scrub (the queue is already phone-clean by construction). */
const PHONE_RUN = new RegExp(`\\d{${CITY_RESOLVER.PHONE_DIGIT_RUN},}`);

/**
 * City-backfill service (Phase-14 #14-6). One `sweep()` is a full LLM cycle:
 * pending strings → one batched Gemini call → write `ai` aliases + mark the
 * strings reviewed → re-resolve the live null-FK rides (now the alias exists,
 * layer-2 hits) so the feed reflects the resolution on its next fetch.
 *
 * NEVER throws: runs on the cron interval inside the long-lived worker, so a
 * transient failure is logged and swallowed (the next sweep retries; every op is
 * idempotent). Off the ingest hot path — zero feed/post latency (DECISIONS log).
 *
 * @param {object} deps
 * @param {ReturnType<import('./cityBackfill.repository').createCityBackfillRepository>} deps.repo
 * @param {{ resolveBatch: (s: string[], c: {id:string,name:string}[]) => Promise<Map<string,?string>> }} deps.llm
 * @param {{ resolve: (raw: string) => Promise<{status:string, cityId:?string}> }} deps.resolver
 * @param {{ info?: Function, warn?: Function, error?: Function }} [deps.logger]
 * @returns {{ sweep(): Promise<?{swept:number, aliased:number, ridesBackfilled:number}> }}
 */
function createCityBackfillService({ repo, llm, resolver, logger }) {
  const log = logger || { info() {}, warn() {}, error() {} };

  /**
   * Re-resolve every live null-FK ride. After this sweep wrote fresh aliases, the
   * resolver's layer-2 exact match now hits them — so a ride whose fragment we
   * just aliased gets its FK filled. Each resolve is guarded (resolver may throw
   * AppError on a junk fragment); a throw on one ride must not abort the sweep.
   */
  async function backfillRides() {
    const rides = await repo.listUnresolvedRides({ limit: CITY_LLM.RIDE_BACKFILL_MAX });
    let filled = 0;
    for (const ride of rides) {
      filled += await tryFill(ride, 'pickupCityId', ride.pickupRaw);
      filled += await tryFill(ride, 'dropCityId', ride.dropRaw);
    }
    return filled;
  }

  /** Resolve one endpoint's raw fragment and patch the FK if it now resolves. */
  async function tryFill(ride, field, raw) {
    if (ride[field] !== null || !raw) return 0;
    try {
      const res = await resolver.resolve(raw);
      if (res && res.status === RESOLVE_STATUS.RESOLVED && res.cityId) {
        await repo.patchRideCity(ride.id, field, res.cityId);
        return 1;
      }
    } catch (err) {
      log.warn?.({ err: err.message, rideId: ride.id, field }, 'backfill re-resolve failed; left unresolved');
    }
    return 0;
  }

  return {
    async sweep() {
      try {
        const pending = await repo.listPending({
          minOccurrence: CITY_LLM.MIN_OCCURRENCE,
          limit: CITY_LLM.BATCH_MAX,
        });
        // Re-scrub (defense in depth — §10) before anything leaves the process.
        const safe = pending.filter((p) => p.rawText && !PHONE_RUN.test(p.rawText));

        let aliased = 0;
        if (safe.length > 0) {
          const catalog = (await repo.listActiveCities()).map((c) => ({ id: c.id, name: c.canonicalName }));
          const mapping = await llm.resolveBatch(safe.map((p) => p.rawText), catalog);
          for (const [rawText, cityId] of mapping) {
            // llm already guarded cityId ∈ catalog; alias write + dequeue is idempotent.
            await repo.upsertAlias(cityId, rawText);
            await repo.markStringReviewed(rawText);
            aliased += 1;
          }
        }

        // Reflect into the live feed: re-resolve null-FK rides against the new aliases.
        const ridesBackfilled = await backfillRides();

        const summary = { swept: safe.length, aliased, ridesBackfilled };
        log.info?.(summary, 'city LLM backfill sweep complete');
        return summary;
      } catch (err) {
        log.error?.({ err: err.message }, 'city backfill sweep failed; will retry next sweep');
        return null;
      }
    },
  };
}

module.exports = { createCityBackfillService };
