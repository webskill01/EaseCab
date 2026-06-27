'use strict';

const { USER_REPORT_ACTION, REPORT_ACTION } = require('@easecab/shared');

/** Reporter context for the queue (phone masked downstream — §10). */
const REPORTER_SELECT = Object.freeze({ id: true, name: true, phone: true });

/**
 * Admin user-reports data access (CLAUDE.md §4 — Prisma only, no policy). The queue
 * is every user who still has an unreviewed report against them (flagged → hidden,
 * or merely reported). `reviewUser` resolves all of a user's open reports in one
 * transaction, clearing `flaggedAt` only on `reinstate`.
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 */
function createAdminUserReportsRepository({ prisma }) {
  return {
    /**
     * Reported users (≥1 unreviewed report), flagged first then most-reported, + total.
     * Each row carries the user's open reports (with reporter) for the card.
     */
    async listReportedUsers({ page, limit }) {
      const where = { reportsReceived: { some: { reviewedAt: null } } };
      const [rows, total] = await prisma.$transaction([
        prisma.user.findMany({
          where,
          orderBy: [{ flaggedAt: 'desc' }, { createdAt: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true, name: true, baseCity: true, vehicleType: true, flaggedAt: true,
            reportsReceived: {
              where: { reviewedAt: null },
              orderBy: { createdAt: 'desc' },
              select: {
                id: true, reason: true, remarks: true, screenshotKey: true, createdAt: true,
                reporter: { select: REPORTER_SELECT },
              },
            },
          },
        }),
        prisma.user.count({ where }),
      ]);
      return { rows, total };
    },

    /** True iff this user currently has ≥1 unreviewed report (the actionable guard). */
    async hasOpenReports(userId) {
      return Boolean(await prisma.userReport.findFirst({ where: { reportedUserId: userId, reviewedAt: null }, select: { id: true } }));
    },

    /**
     * Resolve every open report on a user. `reinstate` clears flaggedAt (un-hides the
     * driver) and stamps reviewAction=dismiss; `uphold` keeps flaggedAt and stamps
     * reviewAction=remove. Single transaction.
     * @returns {Promise<{ count: number }>} number of reports resolved.
     */
    async reviewUser({ userId, action, reviewedBy }) {
      const reviewAction = action === USER_REPORT_ACTION.REINSTATE ? REPORT_ACTION.DISMISS : REPORT_ACTION.REMOVE;
      return prisma.$transaction(async (tx) => {
        if (action === USER_REPORT_ACTION.REINSTATE) {
          await tx.user.update({ where: { id: userId }, data: { flaggedAt: null } });
        }
        return tx.userReport.updateMany({
          where: { reportedUserId: userId, reviewedAt: null },
          data: { reviewedBy, reviewedAt: new Date(), reviewAction },
        });
      });
    },
  };
}

module.exports = { createAdminUserReportsRepository };
