'use strict';

const { AppError, ERROR_CODES, USER_REPORT, PROFILE_VIEW_RATE_LIMIT } = require('@easecab/shared');

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
 * @param {{ verifyUpload: Function }} deps.uploads - R2 verify gate (report screenshots)
 */
function createUsersService({ repo, uploads }) {
  return {
    /**
     * Public profile of any non-deleted user. NOT_FOUND if absent or soft-deleted.
     * Per-viewer rate-limited to stop one account scraping the whole driver directory
     * (security-review M3) — counted before the lookup so a 404 still burns the budget.
     * @param {string} id - target user id
     * @param {string} viewerId - the authenticated caller (rate-limit subject)
     */
    async getPublicProfile(id, viewerId) {
      const views = await repo.incrProfileViewCount(viewerId, PROFILE_VIEW_RATE_LIMIT.WINDOW_SEC);
      if (views > PROFILE_VIEW_RATE_LIMIT.MAX_PER_WINDOW) {
        throw AppError.fromCode(ERROR_CODES.RATE_LIMITED);
      }
      const row = await repo.getPublicProfile(id);
      if (!row) {
        throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      }
      return toPublicPoster(row);
    },

    /**
     * File a report against a user (P13-12 #5). Self-report → VALIDATION_ERROR; unknown
     * or soft-deleted target → NOT_FOUND; over the per-reporter daily cap → RATE_LIMITED.
     * Dedup is idempotent: a repeat report by the same reporter is a no-op (no extra
     * count, no double-flag). Once AUTOHIDE_THRESHOLD distinct reporters have flagged the
     * target, auto-set their flag so their posted rides are hidden pending admin review.
     *
     * @param {{ reporterId: string, reportedUserId: string, reason: string, remarks?: string, screenshotKey?: string }} args
     * @returns {Promise<{ reported: true, alreadyReported: boolean }>}
     */
    async reportUser({ reporterId, reportedUserId, reason, remarks, screenshotKey }) {
      if (reporterId === reportedUserId) {
        throw AppError.fromCode(ERROR_CODES.VALIDATION_ERROR);
      }
      if (!(await repo.userExists(reportedUserId))) {
        throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      }
      const count = await repo.incrReportCount(reporterId, USER_REPORT.WINDOW_SEC);
      if (count > USER_REPORT.MAX_PER_DAY) {
        throw AppError.fromCode(ERROR_CODES.RATE_LIMITED);
      }
      const storedKey = screenshotKey
        ? (await uploads.verifyUpload({ userId: reporterId, purpose: 'report_screenshot', key: screenshotKey })).key
        : null;
      const { created } = await repo.createUserReport({ reporterId, reportedUserId, reason, remarks, screenshotKey: storedKey });
      if (!created) {
        return { reported: true, alreadyReported: true };
      }
      const reporters = await repo.countReporters(reportedUserId);
      if (reporters >= USER_REPORT.AUTOHIDE_THRESHOLD) {
        await repo.flagUserIfUnflagged(reportedUserId);
      }
      return { reported: true, alreadyReported: false };
    },
  };
}

module.exports = { createUsersService, toPublicPoster };
