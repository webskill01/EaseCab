'use strict';

const {
  RIDES_NEW_CHANNEL, RIDE_STATUS, RIDE_TIMING, BOT_MSG_CLAIM_TTL_SEC, botMsgClaimKey,
  POSTED_RIDES, POSTED_RIDES_NEW_CHANNEL,
} = require('@easecab/shared');

const PRISMA_UNIQUE_VIOLATION = 'P2002';

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
 * @param {string} [deps.directDutyPosterPhone] - +91 phone of the house profile that
 *   owns trusted-group duties (saveDirectDuty)
 * @param {{ info?: Function, warn?: Function, error?: Function }} [deps.logger]
 * @returns {{ claimMessage: Function, releaseMessage: Function, isDuplicate(fp: string): Promise<boolean>, saveRide(data: object): Promise<?object>, saveDirectDuty(data: object): Promise<?object> }}
 */
function createRideRepository({ prisma, redis, directDutyPosterPhone, logger }) {
  const log = logger || { info() {}, warn() {}, error() {} };
  let posterId = null; // house-profile user id, looked up once

  /**
   * Claim a WhatsApp message for processing (multi-session dedup). Every number in a
   * group sees the same message id; only the first SET NX wins. Fails OPEN on a Redis
   * error — the fingerprint check + unique constraint still stop a duplicate ride.
   * @param {string} [groupId]
   * @param {string} [msgId]
   * @returns {Promise<boolean>} true = this session should process it
   */
  async function claimMessage(groupId, msgId) {
    if (!groupId || !msgId) return true;
    try {
      const ok = await redis.set(botMsgClaimKey(groupId, msgId), '1', 'EX', BOT_MSG_CLAIM_TTL_SEC, 'NX');
      return ok === 'OK';
    } catch (err) {
      log.warn({ err: err.message }, 'message claim failed; processing anyway (fingerprint still dedups)');
      return true;
    }
  }

  /**
   * Give a claim back after a processing ERROR, so a later copy from another
   * number (e.g. offline delivery after a reconnect) can still save the ride.
   * @param {string} [groupId]
   * @param {string} [msgId]
   */
  async function releaseMessage(groupId, msgId) {
    if (!groupId || !msgId) return;
    try {
      await redis.del(botMsgClaimKey(groupId, msgId));
    } catch (err) {
      log.warn({ err: err.message }, 'message claim release failed');
    }
  }

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
   * Ride row + its fingerprint in one transaction (a fingerprint unique violation
   * rolls the ride back too).
   * @param {object} data
   * @param {{ expiresAt: Date, dbDeleteAt: Date, fingerprintExpiresAt: Date }} at
   * @returns {Promise<object>}
   */
  async function insertRide(data, { expiresAt, dbDeleteAt, fingerprintExpiresAt }) {
    return prisma.$transaction(async (tx) => {
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
          sourceGroupName: data.sourceGroupName ? data.sourceGroupName.replaceAll('\u0000', '') : data.sourceGroupName, // NUL breaks Postgres text
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

      // Lifetime per-session counter for the admin Sessions tab (rides are hard-deleted at 12h).
      if (data.botId) {
        await tx.waSession.updateMany({ where: { slot: data.botId }, data: { ridesSaved: { increment: 1 } } });
      }

      return created;
    });
  }

  /**
   * Persist a ride and its fingerprint in one transaction, then announce it.
   * Timestamps are derived from RIDE_TIMING — never hardcoded. The redis publish
   * runs AFTER the tx commits and is non-fatal: a publish failure is logged but
   * the saved ride is still returned (the cron/feed will still pick it up).
   * Returns null when another session saved the same fingerprint first (unique
   * violation) — the whole tx rolls back, so no orphan ride row is left.
   * @param {object} data - fields gathered by processMessage (see Ride model)
   * @returns {Promise<?object>} the created ride row, or null on a duplicate race
   */
  async function saveRide(data) {
    const now = Date.now();
    const expiresAt = new Date(now + RIDE_TIMING.FEED_TTL_MIN * MS_PER_MIN);
    const dbDeleteAt = new Date(now + RIDE_TIMING.HARD_DELETE_HRS * MS_PER_HOUR);
    const fingerprintExpiresAt = new Date(now + RIDE_TIMING.FINGERPRINT_TTL_HRS * MS_PER_HOUR);

    let ride;
    try {
      ride = await insertRide(data, { expiresAt, dbDeleteAt, fingerprintExpiresAt });
    } catch (err) {
      if (err && err.code === PRISMA_UNIQUE_VIOLATION) return null;
      throw err;
    }

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

  /**
   * Save a trusted-group duty as a Driver Duties post owned by the house profile,
   * with the duty's own number as the contact phone. Its fingerprint is recorded
   * too, so the same text forwarded into other groups never lands in the bot feed.
   * @param {{ fromCityId: ?string, toCityId: ?string, fromCityRaw: ?string, toCityRaw: ?string,
   *   vehicleType: ?string, phone: string, notes: string, fingerprint: string }} data
   * @returns {Promise<?object>} the post, or null on a duplicate race
   * @throws {Error} when the house profile does not exist
   */
  async function saveDirectDuty(data) {
    if (!posterId) {
      const user = await prisma.user.findUnique({ where: { phone: directDutyPosterPhone }, select: { id: true } });
      if (!user) throw new Error('direct-duty poster profile not found');
      posterId = user.id;
    }
    const now = Date.now();
    let post;
    try {
      post = await prisma.$transaction(async (tx) => {
        const created = await tx.postedRide.create({
          data: {
            postedBy: posterId,
            fromCityId: data.fromCityId, toCityId: data.toCityId,
            fromCityRaw: data.fromCityRaw, toCityRaw: data.toCityRaw,
            vehicleType: data.vehicleType,
            phone: `+91${data.phone}`,
            notes: data.notes.replaceAll('\u0000', '').slice(0, POSTED_RIDES.NOTES_MAX),
            expiresAt: new Date(now + POSTED_RIDES.TTL_HOURS * MS_PER_HOUR),
          },
        });
        await tx.rideFingerprint.create({
          data: { fingerprint: data.fingerprint, expiresAt: new Date(now + RIDE_TIMING.FINGERPRINT_TTL_HRS * MS_PER_HOUR) },
        });
        return created;
      });
    } catch (err) {
      if (err && err.code === PRISMA_UNIQUE_VIOLATION) return null;
      throw err;
    }
    try {
      await redis.publish(POSTED_RIDES_NEW_CHANNEL, JSON.stringify({ id: post.id, fromCityId: post.fromCityId, toCityId: post.toCityId }));
    } catch (err) {
      log.warn({ err: err.message, postedRideId: post.id }, 'direct duty saved but push publish failed');
    }
    return post;
  }

  return { claimMessage, releaseMessage, isDuplicate, saveRide, saveDirectDuty };
}

module.exports = { createRideRepository };
