'use strict';

const { RIDES_NEW_CHANNEL, RIDE_STATUS, RIDE_TIMING } = require('@easecab/shared');

const MS_PER_MIN = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MIN;

/**
 * Repository for ride persistence. Owns the only DB write path for ingested
 * rides: a ride row + its dedup fingerprint committed atomically, followed by a
 * post-commit pub/sub announcement that the Phase-3 SSE endpoint fans out.
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 * @param {{ publish: (channel: string, message: string) => Promise<unknown> }} deps.redis
 * @param {{ info?: Function, warn?: Function, error?: Function }} [deps.logger]
 * @returns {{ isDuplicate(fp: string): Promise<boolean>, saveRide(data: object): Promise<object> }}
 */
function createRideRepository({ prisma, redis, logger }) {
  const log = logger || { info() {}, warn() {}, error() {} };

  /**
   * True if a fingerprint already exists (the ride was seen within its TTL).
   * @param {string} fingerprint
   * @returns {Promise<boolean>}
   */
  async function isDuplicate(fingerprint) {
    const existing = await prisma.rideFingerprint.findUnique({ where: { fingerprint } });
    return Boolean(existing);
  }

  /**
   * Persist a ride and its fingerprint in one transaction, then announce it.
   * Timestamps are derived from RIDE_TIMING — never hardcoded. The redis publish
   * runs AFTER the tx commits and is non-fatal: a publish failure is logged but
   * the saved ride is still returned (the cron/feed will still pick it up).
   * @param {object} data - fields gathered by processMessage (see Ride model)
   * @returns {Promise<object>} the created ride row
   */
  async function saveRide(data) {
    const now = Date.now();
    const expiresAt = new Date(now + RIDE_TIMING.FEED_TTL_MIN * MS_PER_MIN);
    const dbDeleteAt = new Date(now + RIDE_TIMING.HARD_DELETE_HRS * MS_PER_HOUR);
    const fingerprintExpiresAt = new Date(now + RIDE_TIMING.FINGERPRINT_TTL_HRS * MS_PER_HOUR);

    const ride = await prisma.$transaction(async (tx) => {
      const created = await tx.ride.create({
        data: {
          rawText: data.rawText,
          displayText: data.displayText,
          phoneNumber: data.phoneNumber,
          pickupCityId: data.pickupCityId,
          dropCityId: data.dropCityId,
          pickupRaw: data.pickupRaw,
          dropRaw: data.dropRaw,
          vehicleType: data.vehicleType,
          sourceGroupId: data.sourceGroupId,
          sourceGroupName: data.sourceGroupName,
          botId: data.botId,
          fingerprint: data.fingerprint,
          status: RIDE_STATUS.FRESH,
          expiresAt,
          dbDeleteAt,
        },
      });

      await tx.rideFingerprint.create({
        data: {
          fingerprint: data.fingerprint,
          rideId: created.id,
          expiresAt: fingerprintExpiresAt,
        },
      });

      return created;
    });

    try {
      await redis.publish(
        RIDES_NEW_CHANNEL,
        JSON.stringify({
          id: ride.id,
          pickupCityId: ride.pickupCityId,
          dropCityId: ride.dropCityId,
          status: RIDE_STATUS.FRESH,
        }),
      );
    } catch (err) {
      log.warn({ err: err.message, rideId: ride.id }, 'ride saved but RIDES_NEW publish failed');
    }

    return ride;
  }

  return { isDuplicate, saveRide };
}

module.exports = { createRideRepository };
