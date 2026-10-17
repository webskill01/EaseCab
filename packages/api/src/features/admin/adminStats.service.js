'use strict';

const { ADMIN_STATISTICS } = require('@easecab/shared');

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
  };
}

module.exports = { createAdminStatsService };
