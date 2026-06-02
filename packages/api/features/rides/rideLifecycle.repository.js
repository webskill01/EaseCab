'use strict';

const { RIDE_STATUS, POSTED_RIDE_STATUS } = require('@easecab/shared');

/**
 * Repository for the ride lifecycle cron — the ONLY DB path for aging rides.
 * Every method is a single set-based statement (updateMany/deleteMany) so a tick
 * is idempotent and re-running after a crash is harmless. It owns no time math:
 * the service computes cutoffs from RIDE_TIMING and passes them in (CLAUDE.md §4
 * — repository does DB only, no business logic).
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 * @returns {{
 *   markBooked(bookedCutoff: Date): Promise<number>,
 *   markHidden(now: Date): Promise<number>,
 *   hardDelete(now: Date): Promise<number>,
 *   purgeFingerprints(now: Date): Promise<number>,
 * }}
 */
function createRideLifecycleRepository({ prisma }) {
  /**
   * Flip fresh rides first seen on/before the cutoff to booked.
   * @param {Date} bookedCutoff - now minus RIDE_TIMING.BOOKED_AFTER_MIN
   * @returns {Promise<number>} rows transitioned
   */
  async function markBooked(bookedCutoff) {
    const { count } = await prisma.ride.updateMany({
      where: { status: RIDE_STATUS.FRESH, receivedAt: { lte: bookedCutoff } },
      data: { status: RIDE_STATUS.BOOKED },
    });
    return count;
  }

  /**
   * Hide fresh/booked rides whose feed window (expiresAt) has passed.
   * @param {Date} now
   * @returns {Promise<number>} rows transitioned
   */
  async function markHidden(now) {
    const { count } = await prisma.ride.updateMany({
      where: {
        status: { in: [RIDE_STATUS.FRESH, RIDE_STATUS.BOOKED] },
        expiresAt: { lte: now },
      },
      data: { status: RIDE_STATUS.HIDDEN },
    });
    return count;
  }

  /**
   * Hard-delete ride rows past their dbDeleteAt, whatever their status. The
   * dedup fingerprint lives in a separate table and is NOT touched here, so it
   * survives ride deletion (purged separately on its own 12h TTL).
   * @param {Date} now
   * @returns {Promise<number>} rows deleted
   */
  async function hardDelete(now) {
    const { count } = await prisma.ride.deleteMany({
      where: { dbDeleteAt: { lte: now } },
    });
    return count;
  }

  /**
   * Delete fingerprints past their own expiry. Independent of ride rows — a
   * fingerprint outlives its ride so a same-route lead re-posted within the TTL
   * is still rejected as a duplicate.
   * @param {Date} now
   * @returns {Promise<number>} fingerprints purged
   */
  async function purgeFingerprints(now) {
    const { count } = await prisma.rideFingerprint.deleteMany({
      where: { expiresAt: { lte: now } },
    });
    return count;
  }

  /**
   * Flip active posted rides whose 24h window has passed to expired (and closed),
   * so the status column stays truthful for the Phase-7 admin queue. The feed query
   * already hides them by expiresAt; this just reconciles state. Set-based + idempotent.
   * @param {Date} now
   * @returns {Promise<number>} posts expired
   */
  async function expirePostedRides(now) {
    const { count } = await prisma.postedRide.updateMany({
      where: { status: POSTED_RIDE_STATUS.ACTIVE, expiresAt: { lte: now } },
      data: { status: POSTED_RIDE_STATUS.EXPIRED, isClosed: true },
    });
    return count;
  }

  return { markBooked, markHidden, hardDelete, purgeFingerprints, expirePostedRides };
}

module.exports = { createRideLifecycleRepository };
