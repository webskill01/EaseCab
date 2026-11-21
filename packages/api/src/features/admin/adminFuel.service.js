'use strict';

const { AppError, ERROR_CODES, ADMIN_FUEL_TAB } = require('@easecab/shared');

/**
 * Admin fuel review (Phase 30): approve / reject driver-added stations and act on
 * driver reports (CNG yes / CNG no / closed).
 * @param {{ repo: ReturnType<import('./adminFuel.repository').createAdminFuelRepository> }} deps
 */
function createAdminFuelService({ repo }) {
  return {
    async list({ tab, page, limit }) {
      const read = tab === ADMIN_FUEL_TAB.REPORTS ? repo.listReported : repo.listPending;
      const [{ rows, total }, counts] = await Promise.all([read({ page, limit }), repo.counts()]);
      return { stations: rows, counts, page, limit, total };
    },

    /**
     * Set status / fuel flags; every decision (even an empty "dismiss") closes the
     * station's open reports. Turning CNG on counts as a fresh confirmation.
     */
    async decide(id, patch) {
      const data = { ...patch };
      if (patch.hasCng === true) data.cngConfirmedAt = new Date();
      const station = await repo.decide(id, data);
      if (!station) throw AppError.fromCode(ERROR_CODES.NOT_FOUND);
      return station;
    },
  };
}

module.exports = { createAdminFuelService };
