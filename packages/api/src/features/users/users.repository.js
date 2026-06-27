'use strict';

const { redisKey } = require('@easecab/shared');
const { fixedWindowIncr } = require('../../lib/rateLimit');

/**
 * Public poster-profile columns (T3-2). A deliberately narrow projection — NEVER
 * phone or any PII (§3.10). What a verified driver chose to put on their own profile
 * plus the verification flags that drive the badge/stat rows.
 */
const PUBLIC_POSTER_SELECT = Object.freeze({
  id: true, name: true, profilePicUrl: true, baseCity: true, vehicleType: true,
  carMake: true, carModel: true, experience: true, bio: true, languagesSpoken: true,
  createdAt: true, aadhaarVerified: true, dlSubmitted: true, rcSubmitted: true,
  verificationStatus: true,
});

/**
 * Public-user data access (CLAUDE.md §4 — DB only).
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 * @param {import('ioredis').Redis} deps.redis - report rate-limit counter
 */
function createUsersRepository({ prisma, redis }) {
  const reportCountKey = (reporterId) => redisKey('userreport', reporterId);
  const profileViewKey = (viewerId) => redisKey('profileview', viewerId);

  return {
    /** A non-deleted user's public columns, or null. Soft-deleted users are invisible. */
    async getPublicProfile(id) {
      return prisma.user.findFirst({ where: { id, isDeleted: false }, select: PUBLIC_POSTER_SELECT });
    },

    /** Per-viewer fixed-window profile-view counter (anti directory-scrape). New count. */
    async incrProfileViewCount(viewerId, windowSec) {
      return fixedWindowIncr(redis, profileViewKey(viewerId), windowSec);
    },

    /** True iff the target exists and is not soft-deleted. */
    async userExists(id) {
      return Boolean(await prisma.user.findFirst({ where: { id, isDeleted: false }, select: { id: true } }));
    },

    /** Per-reporter fixed-window report counter (anti mass-reporting). Returns new count. */
    async incrReportCount(reporterId, windowSec) {
      return fixedWindowIncr(redis, reportCountKey(reporterId), windowSec);
    },

    /**
     * Create a user report. The unique (reporter, reported) makes a re-report a no-op:
     * a P2002 conflict returns { created: false } instead of throwing.
     */
    async createUserReport({ reporterId, reportedUserId, reason, remarks, screenshotUrl }) {
      try {
        await prisma.userReport.create({
          data: { reporterId, reportedUserId, reason, remarks: remarks ?? null, screenshotUrl: screenshotUrl ?? null },
        });
        return { created: true };
      } catch (err) {
        if (err?.code === 'P2002') return { created: false };
        throw err;
      }
    },

    /**
     * Distinct reporters with an OPEN (unreviewed) report = row count (dedup is enforced
     * by the unique key). Excludes reports an admin has already resolved, so once a user
     * is reinstated the auto-hide threshold resets — a single fresh report can't silently
     * re-flag a vindicated driver (security-review M1).
     */
    async countReporters(reportedUserId) {
      return prisma.userReport.count({ where: { reportedUserId, reviewedAt: null } });
    },

    /** Auto-flag the target, idempotently (only sets flaggedAt when not already set). */
    async flagUserIfUnflagged(reportedUserId) {
      await prisma.user.updateMany({
        where: { id: reportedUserId, flaggedAt: null },
        data: { flaggedAt: new Date() },
      });
    },
  };
}

module.exports = { createUsersRepository, PUBLIC_POSTER_SELECT };
