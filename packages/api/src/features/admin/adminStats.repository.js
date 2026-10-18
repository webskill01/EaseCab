'use strict';

const {
  VERIFICATION_STATUS, ADMIN_VERIFICATIONS, ADMIN_STATISTICS, PAYMENT_STATUS, SUBSCRIPTION_STATUS,
  SUBSCRIPTION_PLAN,
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
     * payments/revenuePaise = captured payment rows, credited to on_behalf_of_user_id when a
     * founder paid for a member. Excluded phones never count.
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
        -- updated_at = capture time; created_at is when the order opened (open orders are
        -- reused, so it can be weeks earlier).
        pay AS (
          SELECT (pm.updated_at AT TIME ZONE ${TIMEZONE})::date AS d, count(*) AS n, sum(pm.amount) AS amt
          FROM payments pm JOIN u ON u.id = COALESCE(pm.on_behalf_of_user_id, pm.user_id)
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

    /**
     * Track Record: one row per IST week (Monday start) since launch, newest first.
     * Raw counts only; ratios are the service's job. `activePaid` = distinct users
     * with a captured payment in the PERIOD_DAYS before the week end (or now, for the
     * running week). Renewal cohort = payments whose period ended in the week and whose
     * grace window has passed. Bot rides = archived ride_daily_stats + live rows.
     * Only users who joined on/after launch count (earlier rows are test data).
     * @returns {Promise<object[]>}
     */
    async trackRecordWeekly() {
      const { LAUNCH_DATE, TIMEZONE: tz, EXCLUDED_PHONES, LIQUIDITY_WINDOW_MIN, RENEWAL_GRACE_DAYS } = ADMIN_STATISTICS;
      const phones = [...EXCLUDED_PHONES];
      const period = SUBSCRIPTION_PLAN.PERIOD_DAYS;
      // ponytail: per-week correlated subqueries, fine for a few hundred weeks of small
      // tables; pre-aggregate per day if payments/contacts reach ~1M rows.
      return prisma.$queryRaw`
        WITH u AS (
          SELECT id, created_at FROM users
          WHERE phone <> ALL(${phones}) AND (created_at AT TIME ZONE ${tz})::date >= ${LAUNCH_DATE}::date
        ),
        pay AS (
          -- capture time (see growthDaily), aliased so the week maths below reads it
          SELECT u.id AS user_id, pm.updated_at AS created_at, pm.amount
          FROM payments pm JOIN u ON u.id = COALESCE(pm.on_behalf_of_user_id, pm.user_id)
          WHERE pm.status::text = ${PAYMENT_STATUS.CAPTURED}
        ),
        firstpay AS (SELECT user_id, min(created_at) AS at FROM pay GROUP BY 1),
        w AS (
          SELECT g AS wk, LEAST(g + interval '7 days', now() AT TIME ZONE ${tz}) AS asof
          FROM generate_series(date_trunc('week', ${LAUNCH_DATE}::timestamp),
                               date_trunc('week', now() AT TIME ZONE ${tz}), interval '7 days') g
        )
        SELECT w.wk::date AS "week",
          (SELECT count(*) FROM u WHERE u.created_at AT TIME ZONE ${tz} >= w.wk AND u.created_at AT TIME ZONE ${tz} < w.asof)::int AS "signups",
          (SELECT count(*) FROM u WHERE u.created_at AT TIME ZONE ${tz} < w.asof)::int AS "totalSignups",
          (SELECT count(*) FROM firstpay f WHERE f.at AT TIME ZONE ${tz} >= w.wk AND f.at AT TIME ZONE ${tz} < w.asof)::int AS "newPayers",
          (SELECT count(*) FROM firstpay f WHERE f.at AT TIME ZONE ${tz} < w.asof)::int AS "totalPayers",
          (SELECT count(*) FROM pay p WHERE p.created_at AT TIME ZONE ${tz} >= w.wk AND p.created_at AT TIME ZONE ${tz} < w.asof)::int AS "payments",
          (SELECT COALESCE(sum(p.amount), 0) FROM pay p WHERE p.created_at AT TIME ZONE ${tz} >= w.wk AND p.created_at AT TIME ZONE ${tz} < w.asof)::int AS "revenuePaise",
          (SELECT count(DISTINCT p.user_id) FROM pay p
            WHERE p.created_at AT TIME ZONE ${tz} < w.asof
              AND p.created_at AT TIME ZONE ${tz} >= w.asof - make_interval(days => ${period}::int))::int AS "activePaid",
          (SELECT count(*) FROM pay p
            WHERE (p.created_at + make_interval(days => ${period}::int)) AT TIME ZONE ${tz} >= w.wk
              AND (p.created_at + make_interval(days => ${period}::int)) AT TIME ZONE ${tz} < w.wk + interval '7 days'
              AND p.created_at + make_interval(days => ${period + RENEWAL_GRACE_DAYS}::int) <= now())::int AS "renewalsDue",
          (SELECT count(*) FROM pay p
            WHERE (p.created_at + make_interval(days => ${period}::int)) AT TIME ZONE ${tz} >= w.wk
              AND (p.created_at + make_interval(days => ${period}::int)) AT TIME ZONE ${tz} < w.wk + interval '7 days'
              AND p.created_at + make_interval(days => ${period + RENEWAL_GRACE_DAYS}::int) <= now()
              AND EXISTS (SELECT 1 FROM pay n WHERE n.user_id = p.user_id AND n.created_at > p.created_at
                AND n.created_at <= p.created_at + make_interval(days => ${period + RENEWAL_GRACE_DAYS}::int)))::int AS "renewed",
          (SELECT count(*) FROM ride_contacts c JOIN u ON u.id = c.user_id
            WHERE c.contacted_at AT TIME ZONE ${tz} >= w.wk AND c.contacted_at AT TIME ZONE ${tz} < w.asof)::int AS "contacts",
          (SELECT count(DISTINCT a.uid) FROM (
              SELECT c.user_id AS uid, c.contacted_at AS at FROM ride_contacts c
              UNION ALL SELECT pr.posted_by, pr.created_at FROM posted_rides pr
            ) a JOIN u ON u.id = a.uid
            WHERE a.at AT TIME ZONE ${tz} >= w.wk AND a.at AT TIME ZONE ${tz} < w.asof)::int AS "activeDrivers",
          ((SELECT COALESCE(sum(s.rides), 0) FROM ride_daily_stats s WHERE s.day >= w.wk::date AND s.day < (w.wk + interval '7 days')::date)
            + (SELECT count(*) FROM rides r WHERE r.received_at AT TIME ZONE ${tz} >= w.wk AND r.received_at AT TIME ZONE ${tz} < w.wk + interval '7 days'))::int AS "botRides",
          ((SELECT COALESCE(sum(s.contacted_fast), 0) FROM ride_daily_stats s WHERE s.day >= w.wk::date AND s.day < (w.wk + interval '7 days')::date)
            + (SELECT count(*) FROM rides r WHERE r.received_at AT TIME ZONE ${tz} >= w.wk AND r.received_at AT TIME ZONE ${tz} < w.wk + interval '7 days'
                AND EXISTS (SELECT 1 FROM ride_contacts c WHERE c.ride_id = r.id
                  AND c.contacted_at <= r.received_at + make_interval(mins => ${LIQUIDITY_WINDOW_MIN}::int))))::int AS "botContactedFast",
          (SELECT count(*) FROM posted_rides pr WHERE pr.created_at AT TIME ZONE ${tz} >= w.wk AND pr.created_at AT TIME ZONE ${tz} < w.wk + interval '7 days')::int AS "postedRides",
          (SELECT count(*) FROM posted_rides pr WHERE pr.created_at AT TIME ZONE ${tz} >= w.wk AND pr.created_at AT TIME ZONE ${tz} < w.wk + interval '7 days'
            AND EXISTS (SELECT 1 FROM ride_contacts c WHERE c.posted_ride_id = pr.id
              AND c.contacted_at <= pr.created_at + make_interval(mins => ${LIQUIDITY_WINDOW_MIN}::int)))::int AS "postedContactedFast"
        FROM w ORDER BY w.wk DESC`;
    },

    /** Members with time left right now who joined since launch, excluding reviewer phones. */
    async activeMembers() {
      return prisma.subscription.count({
        where: {
          status: SUBSCRIPTION_STATUS.ACTIVE,
          expiresAt: { gt: new Date() },
          user: {
            phone: { notIn: [...ADMIN_STATISTICS.EXCLUDED_PHONES] },
            createdAt: { gte: new Date(`${ADMIN_STATISTICS.LAUNCH_DATE}T00:00:00+05:30`) }, // pre-launch = test data
          },
        },
      });
    },
  };
}

module.exports = { createAdminStatsRepository };
