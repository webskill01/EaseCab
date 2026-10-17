'use strict';

const {
  VERIFICATION_STATUS, ADMIN_VERIFICATIONS, ADMIN_STATISTICS, PAYMENT_STATUS, SUBSCRIPTION_STATUS,
} = require('@easecab/shared');

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

    /**
     * One row per IST day from launch to today (gap days filled with zeros).
     * Signups = new users; paidAccounts = subscriptions.paid_started_at on that day;
     * payments/revenuePaise = captured payment rows. Excluded phones never count.
     * @returns {Promise<{ day: Date, signups: number, paidAccounts: number, payments: number, revenuePaise: number }[]>}
     */
    async growthDaily() {
      const { LAUNCH_DATE, TIMEZONE, EXCLUDED_PHONES } = ADMIN_STATISTICS;
      const phones = [...EXCLUDED_PHONES];
      // ponytail: three GROUP BYs over full tables, fine at thousands of rows; add
      // created_at range predicates if users/payments grow past ~1M.
      return prisma.$queryRaw`
        WITH u AS (SELECT id, created_at FROM users WHERE phone <> ALL(${phones})),
        s AS (SELECT (created_at AT TIME ZONE ${TIMEZONE})::date AS d, count(*) AS n FROM u GROUP BY 1),
        p AS (
          SELECT (sb.paid_started_at AT TIME ZONE ${TIMEZONE})::date AS d, count(*) AS n
          FROM subscriptions sb JOIN u ON u.id = sb.user_id
          WHERE sb.paid_started_at IS NOT NULL GROUP BY 1
        ),
        pay AS (
          SELECT (pm.created_at AT TIME ZONE ${TIMEZONE})::date AS d, count(*) AS n, sum(pm.amount) AS amt
          FROM payments pm JOIN u ON u.id = pm.user_id
          WHERE pm.status::text = ${PAYMENT_STATUS.CAPTURED} GROUP BY 1
        )
        SELECT g.day::date AS day,
               COALESCE(s.n, 0)::int AS "signups",
               COALESCE(p.n, 0)::int AS "paidAccounts",
               COALESCE(pay.n, 0)::int AS "payments",
               COALESCE(pay.amt, 0)::int AS "revenuePaise"
        FROM generate_series(${LAUNCH_DATE}::date, (now() AT TIME ZONE ${TIMEZONE})::date, interval '1 day') AS g(day)
        LEFT JOIN s ON s.d = g.day::date
        LEFT JOIN p ON p.d = g.day::date
        LEFT JOIN pay ON pay.d = g.day::date
        ORDER BY g.day DESC`;
    },

    /** Members with time left right now (any join date), excluding reviewer phones. */
    async activeMembers() {
      return prisma.subscription.count({
        where: {
          status: SUBSCRIPTION_STATUS.ACTIVE,
          expiresAt: { gt: new Date() },
          user: { phone: { notIn: [...ADMIN_STATISTICS.EXCLUDED_PHONES] } },
        },
      });
    },
  };
}

module.exports = { createAdminStatsRepository };
