'use strict';

const { RIDE_STATUS, POSTED_RIDE_STATUS, REPORT_ACTION } = require('@easecab/shared');

/** Reporter context for the queue (phone masked downstream — §10). */
const REPORTER_SELECT = Object.freeze({ id: true, name: true, phone: true });

/** Reported bot-ride summary. */
const RIDE_SELECT = Object.freeze({
  id: true, displayText: true, status: true, pickupRaw: true, dropRaw: true,
  pickupCity: { select: { canonicalName: true } },
  dropCity: { select: { canonicalName: true } },
});

/** Reported app-posted-ride summary. */
const POSTED_RIDE_SELECT = Object.freeze({
  id: true, status: true, fromCityRaw: true, toCityRaw: true,
  fromCity: { select: { canonicalName: true } },
  toCity: { select: { canonicalName: true } },
  poster: { select: { name: true } },
});

/**
 * Admin ride-reports data access (CLAUDE.md §4 — Prisma only, no policy). Offset
 * pagination is acceptable for admin (§8). `reviewedAt IS NULL` is the open/resolved
 * discriminator. `reviewTarget` cascade-resolves every open report on the same target
 * in one transaction, optionally taking the reported ride down first.
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 */
function createAdminReportsRepository({ prisma }) {
  return {
    /** Open (reviewedAt null) or resolved reports, newest first, + total. */
    async listReports({ page, limit, status }) {
      const where = status === 'resolved' ? { reviewedAt: { not: null } } : { reviewedAt: null };
      const [rows, total] = await prisma.$transaction([
        prisma.rideReport.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            reporter: { select: REPORTER_SELECT },
            ride: { select: RIDE_SELECT },
            postedRide: { select: POSTED_RIDE_SELECT },
          },
        }),
        prisma.rideReport.count({ where }),
      ]);
      return { rows, total };
    },

    /** @returns {Promise<object|null>} report by id (existence + target ids). */
    async findById(id) {
      return prisma.rideReport.findUnique({ where: { id } });
    },

    /**
     * Apply a moderation verdict to a report's TARGET. On `remove`, hide the bot ride
     * or mark the posted ride deleted. Always cascade-resolves all open reports that
     * share the same target. Single transaction.
     * @returns {Promise<{ count: number }>} number of reports resolved.
     */
    async reviewTarget({ report, action, reviewedBy }) {
      return prisma.$transaction(async (tx) => {
        if (action === REPORT_ACTION.REMOVE) {
          if (report.rideId) {
            await tx.ride.update({ where: { id: report.rideId }, data: { status: RIDE_STATUS.HIDDEN } });
          } else if (report.postedRideId) {
            await tx.postedRide.update({ where: { id: report.postedRideId }, data: { status: POSTED_RIDE_STATUS.DELETED } });
          }
        }
        const targetWhere = report.rideId
          ? { rideId: report.rideId, reviewedAt: null }
          : { postedRideId: report.postedRideId, reviewedAt: null };
        return tx.rideReport.updateMany({
          where: targetWhere,
          data: { reviewedBy, reviewedAt: new Date(), reviewAction: action },
        });
      });
    },
  };
}

module.exports = { createAdminReportsRepository };
