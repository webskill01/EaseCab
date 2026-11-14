'use strict';

const {
  VERIFICATION_STATUS, ADMIN_VERIFICATIONS, ADMIN_STATISTICS, PAYMENT_STATUS, SUBSCRIPTION_STATUS,
  SUBSCRIPTION_PLAN,
  SUBSCRIPTION_PLANS,
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
     * Signups = new users; paidAccounts = members whose first captured payment fell that day;
     * payments/revenuePaise = captured payment rows, credited to on_behalf_of_user_id when a
     * founder paid for a member. Excluded phones and free members never count.
     * @returns {Promise<{ day: Date, signups: number, paidAccounts: number, payments: number, revenuePaise: number }[]>}
     */
    async growthDaily() {
      const { LAUNCH_DATE, TIMEZONE, EXCLUDED_PHONES } = ADMIN_STATISTICS;
      const phones = [...EXCLUDED_PHONES];
      // ponytail: three GROUP BYs over full tables, fine at thousands of rows; add
      // created_at range predicates if users/payments grow past ~1M.
      return prisma.$queryRaw`
        WITH u AS (SELECT id, created_at FROM users WHERE phone <> ALL(${phones}) AND NOT EXISTS (SELECT 1 FROM complimentary_members cm WHERE cm.user_id = users.id)),
        s AS (SELECT (created_at AT TIME ZONE ${TIMEZONE})::date AS d, count(*) AS n FROM u GROUP BY 1),
        -- First captured payment per member, not paid_started_at: referral rewards and
        -- grants set that too without any money changing hands.
        p AS (
          SELECT f.d, count(*) AS n FROM (
            SELECT min((pm.updated_at AT TIME ZONE ${TIMEZONE})::date) AS d
            FROM payments pm JOIN u ON u.id = COALESCE(pm.on_behalf_of_user_id, pm.user_id)
            WHERE pm.status::text = ${PAYMENT_STATUS.CAPTURED}
            GROUP BY COALESCE(pm.on_behalf_of_user_id, pm.user_id)
          ) f GROUP BY 1
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
     * with a captured payment whose window (plan days) covers the week end (or now, for the
     * running week). Renewal cohort = payments whose period ended in the week and whose
     * grace window has passed. Bot rides = archived ride_daily_stats + live rows.
     * Only users who joined on/after launch count (earlier rows are test data); free
     * members never count.
     * @returns {Promise<object[]>}
     */
    async trackRecordWeekly() {
      const { LAUNCH_DATE, TIMEZONE: tz, EXCLUDED_PHONES, LIQUIDITY_WINDOW_MIN, RENEWAL_GRACE_DAYS } = ADMIN_STATISTICS;
      const phones = [...EXCLUDED_PHONES];
      const period = SUBSCRIPTION_PLAN.PERIOD_DAYS;
      const monthPaise = SUBSCRIPTION_PLAN.PRICE_PAISE;
      const plans = JSON.stringify(SUBSCRIPTION_PLANS.map((pl) => ({ amount: pl.pricePaise, days: pl.days })));
      // ponytail: per-week correlated subqueries, fine for a few hundred weeks of small
      // tables; pre-aggregate per day if payments/contacts reach ~1M rows.
      return prisma.$queryRaw`
        WITH u AS (
          SELECT id, created_at FROM users
          WHERE phone <> ALL(${phones}) AND (created_at AT TIME ZONE ${tz})::date >= ${LAUNCH_DATE}::date
            AND NOT EXISTS (SELECT 1 FROM complimentary_members cm WHERE cm.user_id = users.id)
        ),
        pay AS (
          -- capture time (see growthDaily), aliased so the week maths below reads it
          -- days = the window this payment bought (plan price → plan days, else whole months)
          SELECT u.id AS user_id, pm.updated_at AS created_at, pm.amount,
            COALESCE(pl.days, GREATEST(1, round(pm.amount / ${monthPaise}::numeric)) * ${period}::int)::int AS days
          FROM payments pm JOIN u ON u.id = COALESCE(pm.on_behalf_of_user_id, pm.user_id)
          LEFT JOIN jsonb_to_recordset(${plans}::jsonb) AS pl(amount int, days int) ON pl.amount = pm.amount
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
              AND p.created_at AT TIME ZONE ${tz} >= w.asof - make_interval(days => p.days))::int AS "activePaid",
          (SELECT COALESCE(round(sum(p.amount * ${period}::numeric / p.days)), 0) FROM pay p
            WHERE p.created_at AT TIME ZONE ${tz} < w.asof
              AND p.created_at AT TIME ZONE ${tz} >= w.asof - make_interval(days => p.days))::int AS "mrrPaise",
          (SELECT count(*) FROM pay p
            WHERE (p.created_at + make_interval(days => p.days)) AT TIME ZONE ${tz} >= w.wk
              AND (p.created_at + make_interval(days => p.days)) AT TIME ZONE ${tz} < w.wk + interval '7 days'
              AND p.created_at + make_interval(days => p.days + ${RENEWAL_GRACE_DAYS}::int) <= now())::int AS "renewalsDue",
          (SELECT count(*) FROM pay p
            WHERE (p.created_at + make_interval(days => p.days)) AT TIME ZONE ${tz} >= w.wk
              AND (p.created_at + make_interval(days => p.days)) AT TIME ZONE ${tz} < w.wk + interval '7 days'
              AND p.created_at + make_interval(days => p.days + ${RENEWAL_GRACE_DAYS}::int) <= now()
              AND EXISTS (SELECT 1 FROM pay n WHERE n.user_id = p.user_id AND n.created_at > p.created_at
                AND n.created_at <= p.created_at + make_interval(days => p.days + ${RENEWAL_GRACE_DAYS}::int)))::int AS "renewed",
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

    /**
     * Renewals since launch, newest first: captured payments that were not the member's first
     * (nth > 1, counted over all their captured payments). Same member rules as growthDaily:
     * credited to on_behalf_of_user_id, excluded phones + free members left out.
     * @param {{ offset: number, limit: number }} page
     * @returns {Promise<{ id: string, paidAt: Date, amount: number, nth: number, userId: string, name: ?string, phone: string, total: number }[]>}
     */
    async renewals({ offset, limit }) {
      const { LAUNCH_DATE, TIMEZONE, EXCLUDED_PHONES } = ADMIN_STATISTICS;
      const phones = [...EXCLUDED_PHONES];
      // ponytail: window over every captured payment, fine at thousands; index (status, updated_at) past ~1M
      return prisma.$queryRaw`
        WITH p AS (
          SELECT pm.id, pm.updated_at, pm.amount, COALESCE(pm.on_behalf_of_user_id, pm.user_id) AS uid,
                 row_number() OVER (PARTITION BY COALESCE(pm.on_behalf_of_user_id, pm.user_id) ORDER BY pm.updated_at, pm.id) AS nth
          FROM payments pm WHERE pm.status::text = ${PAYMENT_STATUS.CAPTURED}
        )
        SELECT p.id, p.updated_at AS "paidAt", p.amount, p.nth::int AS nth, u.id AS "userId", u.name, u.phone,
               count(*) OVER ()::int AS total
        FROM p JOIN users u ON u.id = p.uid
        WHERE p.nth > 1 AND (p.updated_at AT TIME ZONE ${TIMEZONE})::date >= ${LAUNCH_DATE}::date
          AND u.phone <> ALL(${phones})
          AND NOT EXISTS (SELECT 1 FROM complimentary_members cm WHERE cm.user_id = u.id)
        ORDER BY p.updated_at DESC
        LIMIT ${limit} OFFSET ${offset}`;
    },

    /**
     * Members with time left right now who joined since launch OR paid since launch
     * (pre-launch signups who pay are real customers, same as growthDaily's paidAccounts),
     * excluding reviewer phones + free members.
     */
    async activeMembers() {
      const launch = new Date(`${ADMIN_STATISTICS.LAUNCH_DATE}T00:00:00+05:30`);
      const captured = { status: PAYMENT_STATUS.CAPTURED, updatedAt: { gte: launch } }; // updatedAt = capture time
      return prisma.subscription.count({
        where: {
          status: SUBSCRIPTION_STATUS.ACTIVE,
          expiresAt: { gt: new Date() },
          user: {
            phone: { notIn: [...ADMIN_STATISTICS.EXCLUDED_PHONES] },
            complimentary: { is: null }, // free (barter) members are not customers
            OR: [
              { createdAt: { gte: launch } }, // pre-launch signups that never paid = test data
              { paymentsOnBehalf: { some: captured } },
              { payments: { some: { ...captured, onBehalfOfUserId: null } } }, // founder paying for others isn't the founder's own
            ],
          },
        },
      });
    },
  };
}

module.exports = { createAdminStatsRepository };
