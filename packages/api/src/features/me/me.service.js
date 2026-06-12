'use strict';

const { isProfileComplete } = require('@easecab/shared');
const { encodeCursor, decodeCursor } = require('../../lib/cursor');

/** Upload purpose → the User column its verified value lands in (Step 21b). */
const PURPOSE_FIELD = Object.freeze({
  dp: 'profilePicUrl', car_front: 'carFrontUrl', car_back: 'carBackUrl',
  rc_image: 'rcUrl', licence_image: 'licenseUrl',
});

/** Client-safe profile shape: editable fields + derived completeness + verification block. */
function toPublicProfile(u) {
  return {
    id: u.id, phone: u.phone, name: u.name ?? null, bio: u.bio ?? null,
    baseCity: u.baseCity ?? null, vehicleType: u.vehicleType ?? null,
    profilePicUrl: u.profilePicUrl ?? null, languagesSpoken: u.languagesSpoken ?? [],
    profileComplete: isProfileComplete(u),
    verification: {
      aadhaarVerified: u.aadhaarVerified, dlSubmitted: u.dlSubmitted, rcSubmitted: u.rcSubmitted,
      verificationStatus: u.verificationStatus, aadhaarLast4: u.aadhaarLast4 ?? null,
      carMake: u.carMake ?? null, carModel: u.carModel ?? null, carRegNo: u.carRegNo ?? null,
    },
  };
}

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
 * @param {ReturnType<import('../uploads/uploads.service').createUploadsService>} [deps.uploads]
 *   - the R2 verify gate; required only by the profile-DP + image-attach paths.
 */
function createMeService({ repo, uploads }) {
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

    /** Full profile + verification snapshot for the profile screen. */
    async getProfile(userId) {
      return toPublicProfile(await repo.getProfile(userId));
    },

    /** Apply a validated profile patch; if a dpKey is supplied, verify + set the DP URL. */
    async updateProfile(userId, input) {
      const { dpKey, ...fields } = input;
      const data = { ...fields };
      if (dpKey) {
        const { publicUrl, key } = await uploads.verifyUpload({ userId, purpose: 'dp', key: dpKey });
        data.profilePicUrl = publicUrl ?? key;
      }
      return toPublicProfile(await repo.updateProfile(userId, data));
    },

    /** Verify a client-reported upload key and attach it to its purpose's User column. */
    async attachImage(userId, { purpose, key }) {
      const field = PURPOSE_FIELD[purpose];
      const { publicUrl, key: verifiedKey } = await uploads.verifyUpload({ userId, purpose, key });
      // Public tier → stable URL; private tier (rc/licence) → store the key, served later via presigned GET.
      const updated = await repo.attachImage(userId, { [field]: publicUrl ?? verifiedKey });
      return { purpose, field, value: publicUrl ?? verifiedKey, id: updated.id };
    },
  };
}

module.exports = { createMeService, toPublicContacted, toPublicProfile, PURPOSE_FIELD };
