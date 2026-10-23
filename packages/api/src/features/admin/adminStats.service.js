'use strict';

const { ADMIN_STATISTICS, SUBSCRIPTION_PLAN } = require('@easecab/shared');

const PRICE = SUBSCRIPTION_PLAN.PRICE_PAISE / 100;
/** Percent rounded to 1 decimal; null when there is nothing to divide by. */
const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);

/**
 * One raw weekly row → Track Record week with derived ratios. LTV = price ÷ monthly
 * churn (null until a renewal cohort exists, or when churn is 0).
 * @param {object} r - row from repo.trackRecordWeekly()
 */
function toWeek(r) {
  const rides = r.botRides + r.postedRides;
  const renewalRate = pct(r.renewed, r.renewalsDue);
  const churn = renewalRate === null ? null : 1 - renewalRate / 100;
  return {
    week: r.week.toISOString().slice(0, 10),
    signups: r.signups, newPayers: r.newPayers, payments: r.payments,
    revenue: r.revenuePaise / 100,
    activePaid: r.activePaid, mrr: r.activePaid * PRICE,
    conversion: pct(r.totalPayers, r.totalSignups),
    renewalsDue: r.renewalsDue, renewalRate,
    ltv: churn ? Math.round(PRICE / churn) : null,
    activeDrivers: r.activeDrivers, contacts: r.contacts,
    rides, liquidity: pct(r.botContactedFast + r.postedContactedFast, rides),
  };
}

/**
 * Admin dashboard stats service (business layer). Thin today — just surfaces the
 * queue/ride counts — but keeps the route handler free of data access (§4 layering).
 *
 * @param {object} deps
 * @param {ReturnType<import('./adminStats.repository').createAdminStatsRepository>} deps.repo
 */
function createAdminStatsService({ repo }) {
  return {
    /** @returns {Promise<{ pendingVerifications, openReports, unresolvedCities, ridesToday }>} */
    async get() {
      return repo.counts();
    },

    /**
     * Statistics tab: per-day growth since launch (newest first) + summed totals.
     * @returns {Promise<{ since: string, totals: object, days: object[] }>}
     */
    async growth() {
      const [rows, activeMembers] = await Promise.all([repo.growthDaily(), repo.activeMembers()]);
      const days = rows.map((r) => ({
        day: r.day.toISOString().slice(0, 10),
        signups: r.signups,
        paidAccounts: r.paidAccounts,
        payments: r.payments,
        revenue: r.revenuePaise / 100,
      }));
      const sum = (k) => days.reduce((t, d) => t + d[k], 0);
      const totals = {
        signups: sum('signups'), paidAccounts: sum('paidAccounts'),
        payments: sum('payments'), revenue: sum('revenue'), activeMembers,
      };
      return { since: ADMIN_STATISTICS.LAUNCH_DATE, totals, days };
    },

    /**
     * Track Record tab: weekly health metrics since launch (newest first) + targets.
     * @returns {Promise<{ since: string, targets: object, weeks: object[] }>}
     */
    async trackRecord() {
      // activePaid/MRR come from captured payments only, so plans given without a
      // payment (free members, hand grants) never inflate them.
      const rows = await repo.trackRecordWeekly();
      const { TARGETS, LAUNCH_DATE } = ADMIN_STATISTICS;
      const targets = { renewalRate: TARGETS.RENEWAL_PCT, conversion: TARGETS.CONVERSION_PCT, liquidity: TARGETS.LIQUIDITY_PCT };
      return { since: LAUNCH_DATE, targets, weeks: rows.map(toWeek) };
    },
  };
}

module.exports = { createAdminStatsService };
