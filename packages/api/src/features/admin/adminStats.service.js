'use strict';

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
  };
}

module.exports = { createAdminStatsService };
