'use strict';

const { RIDE_TIMING } = require('@easecab/shared');

const MS_PER_MIN = 60 * 1000;

/**
 * Ride lifecycle service — the cron's business logic. One `runTransitions()` is
 * a single aging cycle: derive cutoffs from RIDE_TIMING, then book -> hide ->
 * delete rides and purge expired fingerprints. It NEVER throws: this runs on an
 * interval inside a long-lived worker, so a transient DB error must be logged
 * and swallowed, not crash the process (the next tick retries — every op is
 * idempotent and set-based).
 *
 * @param {object} deps
 * @param {import('./rideLifecycle.repository').createRideLifecycleRepository} deps.repository
 * @param {() => Date} [deps.clock] - injectable wall clock (tests pin it)
 * @param {{ info?: Function, warn?: Function, error?: Function }} [deps.logger]
 * @returns {{ runTransitions(): Promise<?{booked:number, hidden:number, deleted:number, fingerprintsPurged:number, postedExpired:number}> }}
 */
function createRideLifecycleService({ repository, clock, logger }) {
  const now = clock || (() => new Date());
  const log = logger || { info() {}, warn() {}, error() {} };

  /**
   * Run one full aging cycle. Returns the per-job counts, or null if the cycle
   * failed (already logged).
   * @returns {Promise<?{booked:number, hidden:number, deleted:number, fingerprintsPurged:number, postedExpired:number}>}
   */
  async function runTransitions() {
    try {
      const at = now();
      const bookedCutoff = new Date(at.getTime() - RIDE_TIMING.BOOKED_AFTER_MIN * MS_PER_MIN);

      const booked = await repository.markBooked(bookedCutoff);
      const hidden = await repository.markHidden(at);
      const deleted = await repository.hardDelete(at);
      const fingerprintsPurged = await repository.purgeFingerprints(at);
      const postedExpired = await repository.expirePostedRides(at);

      const summary = { booked, hidden, deleted, fingerprintsPurged, postedExpired };
      log.info(summary, 'ride lifecycle cycle complete');
      return summary;
    } catch (err) {
      log.error({ err: err.message }, 'ride lifecycle cycle failed; will retry next tick');
      return null;
    }
  }

  return { runTransitions };
}

module.exports = { createRideLifecycleService };
