'use strict';

const { VERIFICATION_STATUS, ADMIN_VERIFICATIONS } = require('@easecab/shared');

/** Start of the current server-day (00:00:00.000) — boundary for "today's rides". */
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Admin dashboard stats data access (CLAUDE.md §4 — Prisma only, no policy). Pure
 * counts for the three open queues + today's ingested rides, run in one transaction so
 * the numbers are a consistent snapshot.
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 */
function createAdminStatsRepository({ prisma }) {
  return {
    /** @returns {Promise<{ pendingVerifications, openReports, unresolvedCities, ridesToday }>} */
    async counts() {
      const [pendingVerifications, openReports, unresolvedCities, ridesToday] = await prisma.$transaction([
        prisma.verificationSubmission.count({
          where: { status: VERIFICATION_STATUS.SUBMITTED, docType: { in: ADMIN_VERIFICATIONS.DOC_TYPES } },
        }),
        prisma.rideReport.count({ where: { reviewedAt: null } }),
        prisma.unresolvedCityString.count({ where: { reviewedAt: null } }),
        prisma.ride.count({ where: { createdAt: { gte: startOfToday() } } }),
      ]);
      return { pendingVerifications, openReports, unresolvedCities, ridesToday };
    },
  };
}

module.exports = { createAdminStatsRepository };
