'use strict';

const { AppError, ERROR_CODES } = require('@easecab/shared');

/**
 * Client-safe public poster profile (T3-2). No phone, no PII. `verifiedDriver` is
 * the derived L2 badge (Aadhaar + DL + RC all done); the raw flags stay for the
 * per-doc stat rows.
 */
function toPublicPoster(u) {
  return {
    id: u.id,
    name: u.name ?? null,
    profilePicUrl: u.profilePicUrl ?? null,
    baseCity: u.baseCity ?? null,
    vehicleType: u.vehicleType ?? null,
    carMake: u.carMake ?? null,
    carModel: u.carModel ?? null,
    experience: u.experience ?? null,
    bio: u.bio ?? null,
    languagesSpoken: u.languagesSpoken ?? [],
    memberSince: u.createdAt,
    verifiedDriver: Boolean(u.aadhaarVerified && u.dlSubmitted && u.rcSubmitted),
    verification: {
      aadhaarVerified: u.aadhaarVerified,
      dlSubmitted: u.dlSubmitted,
      rcSubmitted: u.rcSubmitted,
      verificationStatus: u.verificationStatus,
    },
  };
}

/**
 * Public-user business logic (CLAUDE.md §4).
 * @param {object} deps
 * @param {ReturnType<import('./users.repository').createUsersRepository>} deps.repo
 */
function createUsersService({ repo }) {
  return {
    /** Public profile of any non-deleted user. NOT_FOUND if absent or soft-deleted. */
    async getPublicProfile(id) {
      const row = await repo.getPublicProfile(id);
      if (!row) {
        throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      }
      return toPublicPoster(row);
    },
  };
}

module.exports = { createUsersService, toPublicPoster };
