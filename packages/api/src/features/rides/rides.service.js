'use strict';

const { AppError, ERROR_CODES, SUBSCRIPTION_STATUS, CONTACT_RATE_LIMIT } = require('@easecab/shared');
const { encodeCursor, decodeCursor } = require('../../lib/cursor');

/**
 * Reduce a ride to the client-safe shape. Defence-in-depth: the repository select
 * already excludes phoneNumber/rawText, but this whitelist guarantees the masked
 * shape even if a caller passes a fuller row (e.g. the SSE re-fetch). §3.10.
 * @param {object} r - a ride row
 * @returns {object}
 */
function toPublicRide(r) {
  return {
    id: r.id,
    displayText: r.displayText,
    pickupCityId: r.pickupCityId ?? null,
    dropCityId: r.dropCityId ?? null,
    pickupRaw: r.pickupRaw ?? null,
    dropRaw: r.dropRaw ?? null,
    vehicleType: r.vehicleType ?? null,
    status: r.status,
    receivedAt: r.receivedAt,
    expiresAt: r.expiresAt,
  };
}

/**
 * The soft gate's eligibility rule (CLAUDE.md soft-gate philosophy; DECISIONS
 * 2026-05-30 "Gate model CONFIRMED" — contact reveal needs an active trial or paid
 * subscription, NO KYC). A subscription is "active" iff it is in trial with an
 * unexpired trial window, OR paid-active with an unexpired paid window.
 *
 * @param {{ status: string, trialExpiresAt: Date, expiresAt: ?Date }|null} sub
 * @param {Date} [now]
 * @returns {boolean}
 */
function isSubscriptionActive(sub, now = new Date()) {
  if (!sub) return false;
  if (sub.status === SUBSCRIPTION_STATUS.ACTIVE) return Boolean(sub.expiresAt) && sub.expiresAt > now;
  if (sub.status === SUBSCRIPTION_STATUS.TRIAL) return Boolean(sub.trialExpiresAt) && sub.trialExpiresAt > now;
  return false; // expired / halted / cancelled
}

/**
 * Rides business logic (CLAUDE.md §4 service layer).
 * @param {object} deps
 * @param {ReturnType<import('./rides.repository').createRidesRepository>} deps.repo
 */
function createRidesService({ repo }) {
  return {
    /**
     * One page of the live feed, newest first. Decodes the opaque cursor (a bad one
     * throws VALIDATION_ERROR), fetches limit+1 to learn whether more remain, and
     * emits the next cursor only when there is a further page.
     *
     * @param {{ limit: number, cursor?: string }} query
     * @returns {Promise<{ rides: object[], nextCursor: ?string }>}
     */
    async listFeed({ limit, cursor }) {
      const key = cursor ? decodeCursor(cursor) : {};
      const rows = await repo.listVisibleRides({ ...key, limit });
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const last = page[page.length - 1];
      const nextCursor = hasMore ? encodeCursor({ receivedAt: last.receivedAt, id: last.id }) : null;
      return { rides: page.map(toPublicRide), nextCursor };
    },

    /**
     * Reveal a ride's phone at the contact action point, behind the soft gate.
     * Order matters: 404 if the ride is gone (before consulting the subscription),
     * then the gate, then record + reveal. Idempotent via the repo upsert.
     *
     * @param {{ userId: string, rideId: string }} args
     * @returns {Promise<{ phoneNumber: string, contactedAt: Date }>}
     */
    async contactRide({ userId, rideId }) {
      const ride = await repo.findRideContactTarget(rideId);
      if (!ride) {
        throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      }
      const sub = await repo.findSubscriptionByUserId(userId);
      if (!isSubscriptionActive(sub)) {
        throw AppError.fromCode(ERROR_CODES.SUBSCRIPTION_EXPIRED);
      }
      // Throttle reveals so a subscribed account can't enumerate every ride's phone
      // (security-review H1). Counted on the reveal path only — gated/404 calls leak
      // no phone, so they don't burn the budget.
      const count = await repo.incrementContactCount(userId, CONTACT_RATE_LIMIT.WINDOW_SEC);
      if (count > CONTACT_RATE_LIMIT.MAX_PER_WINDOW) {
        throw AppError.fromCode(ERROR_CODES.RATE_LIMITED);
      }
      const { contactedAt } = await repo.recordContact(userId, rideId);
      return { phoneNumber: ride.phoneNumber, contactedAt };
    },
  };
}

module.exports = { createRidesService, toPublicRide, isSubscriptionActive };
