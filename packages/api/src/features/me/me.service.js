'use strict';

const { encodeCursor, decodeCursor } = require('../../lib/cursor');

/** Client-safe contacted item. `revealedPhone` IS exposed — it is the already-revealed
 * contact, scoped to its owner (never cross-user). §3.10 otherwise holds. */
function toPublicContacted(c) {
  return {
    id: c.id,
    source: c.source,
    fromCityName: c.fromCityName ?? null,
    toCityName: c.toCityName ?? null,
    vehicleType: c.vehicleType ?? null,
    phoneNumber: c.revealedPhone ?? null,
    contactedAt: c.contactedAt,
    rideId: c.rideId ?? null,
    postedRideId: c.postedRideId ?? null,
  };
}

/**
 * My-Rides "Contacted" business logic. Cursor reuses the shared codec — its
 * `receivedAt` field carries our `contactedAt` keyset (posted-rides does the same).
 * @param {object} deps
 * @param {ReturnType<import('./me.repository').createMeRepository>} deps.repo
 */
function createMeService({ repo }) {
  return {
    async listContacted({ userId, limit, cursor }) {
      const key = cursor ? decodeCursor(cursor) : {};
      const rows = await repo.listContactedByUser({ userId, contactedAt: key.receivedAt, id: key.id, limit });
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const last = page[page.length - 1];
      const nextCursor = hasMore ? encodeCursor({ receivedAt: last.contactedAt, id: last.id }) : null;
      return { contacts: page.map(toPublicContacted), nextCursor };
    },
  };
}

module.exports = { createMeService, toPublicContacted };
